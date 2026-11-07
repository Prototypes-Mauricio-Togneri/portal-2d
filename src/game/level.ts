import {Chamber} from '@/game/classic/chamber'
import type {ChamberData} from '@/game/chamber_data'
import {createFrameInputReader, EMPTY_FRAME_INPUT, type FrameInput} from '@/game/frame_input'
import {GameEvent} from '@/game/game_event'
import {GameKey, type HistoryKey} from '@/game/game_key'
import {Input} from '@/game/input'
import type {KeyBindings} from '@/game/key_bindings'
import type {ReplayData} from '@/game/replay_data'
import {Renderer} from '@/game/renderer'
import {Sound} from '@/game/sound'
import {State} from '@/game/classic/state'
import {getSnapshotText, takeSnapshot} from '@/game/classic/state_snapshot'
import {Subject} from '@/game/classic/subject'
import {UndoHistory} from '@/game/classic/undo_history'

/**
 * Plays chambers on a canvas: owns the keyboard input, the renderer and the
 * frame loop. Each frame advances the state, with the oldest waiting key
 * press once the state has settled (so live play takes exactly the steps of
 * the step function, one key at a time, in the order pressed), plays a sound
 * for each thing that happened in it, and redraws only when the state reports
 * a change. An undo or redo press steps through the run's history instead,
 * silently. Solutions are recorded on the v2 rules only, so it records none.
 */
export class Level {
  /** Keys that start the clock: moving, turning, both portals and interacting */
  private static readonly CLOCK_START_KEYS: readonly GameKey[] = [
    GameKey.LEFT,
    GameKey.UP,
    GameKey.RIGHT,
    GameKey.DOWN,
    GameKey.BLUE,
    GameKey.ORANGE,
    GameKey.INTERACT,
    GameKey.TURN,
  ]

  /** The sound each event of the rules plays */
  private static readonly SOUNDS: Readonly<Record<GameEvent, Sound>> = {
    [GameEvent.BLUE_PORTAL_OPENED]: Sound.PORTAL_BLUE,
    [GameEvent.ORANGE_PORTAL_OPENED]: Sound.PORTAL_ORANGE,
    [GameEvent.REFUSED]: Sound.ERROR,
    [GameEvent.BOX_PICKED_UP]: Sound.BOX,
    [GameEvent.FIZZLED]: Sound.FIZZLER,
    [GameEvent.CROSSED]: Sound.CROSS,
    [GameEvent.DOOR_OPENED]: Sound.DOOR_OPEN,
    [GameEvent.DOOR_CLOSED]: Sound.DOOR_CLOSE,
    [GameEvent.EXIT_OPENED]: Sound.DOOR_OPEN,
    [GameEvent.EXIT_CLOSED]: Sound.DOOR_CLOSE,
    [GameEvent.BUTTON_PRESSED]: Sound.BUTTON_ON,
    [GameEvent.BUTTON_RELEASED]: Sound.BUTTON_OFF,
    [GameEvent.SWITCH_USED]: Sound.SWITCH,
  }

  onCompleted: (() => void) | null = null // Called once per load when the subject reaches the exit

  private state: State | null = null // The chamber being played, null before the first load
  private history: UndoHistory | null = null // Undo and redo for the run since the last load, null before the first load
  private settled = false // Whether the latest frame left the state as it was, so the next press may be taken
  private clockStarted = false // Whether a game key has been pressed since the last load
  private elapsedSeconds = 0 // Play time since the clock started; only grows while unpaused
  private stepCount = 0 // Tiles the subject has stepped onto since the last load
  private portalCount = 0 // Portals opened on a wall since the last load, misses not counted
  private undoCount = 0 // Steps taken back with undo since the last load
  private readonly renderer: Renderer // Draws the state
  private readonly input: Input // The keyboard, listening from construction until dispose()
  private initialized = false // Whether the frame loop has started
  private isPaused = false // Whether the loop skips updates and the input ignores keydown
  private disposed = false // Whether dispose() has run
  private frameId: number | null = null // The pending animation frame request
  private startTime = 0 // When the previous frame ran, in milliseconds since the epoch

  /**
   * Takes over a canvas. Nothing is drawn until load().
   * @param canvas - The canvas to draw on
   * @param bindings - The key bound to each game key, which is only read
   * @param screenWidth - Width available to the chamber, in canvas pixels
   * @param screenHeight - Height available to the chamber, in canvas pixels
   * @param pixelRatio - Canvas pixels per page pixel, such as the screen's device pixel ratio; 1 by default
   */
  constructor(canvas: HTMLCanvasElement, bindings: KeyBindings, screenWidth: number, screenHeight: number, pixelRatio = 1) {
    this.renderer = new Renderer(canvas, screenWidth, screenHeight, pixelRatio)
    this.input = new Input(bindings)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  /**
   * Builds the chamber from scratch and draws it; loading again resets it,
   * its clock, its counters and its undo history. The first load starts the
   * frame loop, running its first frame at once.
   * @param chamberData - The chamber JSON, which is only read
   */
  load(chamberData: ChamberData): void {
    this.renderer.setSize(chamberData.size.width, chamberData.size.height)
    this.clockStarted = false
    this.elapsedSeconds = 0
    this.stepCount = 0
    this.portalCount = 0
    this.undoCount = 0
    this.history = new UndoHistory(chamberData)
    this.settled = false

    const chamber = new Chamber(chamberData)
    const subject = new Subject(chamberData.subject)

    this.state = new State(chamber, subject, () => {
      this.onCompleted?.()
    })

    if (!this.initialized) {
      this.initialized = true
      this.run()
    }

    this.render()
  }

  /**
   * Whether the game is paused.
   */
  get paused(): boolean {
    return this.isPaused
  }

  /**
   * Pauses or resumes. While paused the state does not update and keydown is
   * ignored. Resuming forgets every key, pressed and held, first.
   */
  set paused(value: boolean) {
    this.isPaused = value

    if (value) {
      this.input.enabled = false
    } else {
      this.input.reset()
      this.input.enabled = true
    }
  }

  /**
   * Whether the clock is running, that is, a game key has been pressed since
   * the last load. It keeps this value once the game pauses.
   */
  get started(): boolean {
    return this.clockStarted
  }

  /**
   * Play time since the clock started, in whole hundredths of a second.
   * Frames that ran while the game was paused or the tab was hidden are not
   * counted.
   */
  get elapsedHundredths(): number {
    return Math.floor(this.elapsedSeconds * 100)
  }

  /**
   * Tiles the subject has stepped onto since the last load. Turning in place
   * and walking into something solid don't count; walking through a portal
   * counts as one step. Undo takes none of them back.
   */
  get moves(): number {
    return this.stepCount
  }

  /**
   * Portals opened on a wall since the last load; a shot that misses doesn't
   * count, and moving a portal counts again. Undo takes none of them back.
   */
  get portalsPlaced(): number {
    return this.portalCount
  }

  /**
   * Steps taken back with undo since the last load. An undo with nothing to
   * take back doesn't count, and redo counts nothing.
   */
  get undos(): number {
    return this.undoCount
  }

  /**
   * Refuses: solutions are recorded on the v2 rules, in development with
   * ?rules=v2.
   * @returns Never
   * @throws Error always
   */
  createReplay(): ReplayData {
    throw new Error('Solutions are recorded on the v2 rules; open the chamber with ?rules=v2 to record one')
  }

  /**
   * Fits the current chamber to a new screen area or pixel ratio and redraws it.
   * @param screenWidth - Width available to the chamber, in canvas pixels
   * @param screenHeight - Height available to the chamber, in canvas pixels
   * @param pixelRatio - Canvas pixels per page pixel; 1 by default
   */
  resize(screenWidth: number, screenHeight: number, pixelRatio = 1): void {
    this.renderer.resize(screenWidth, screenHeight, pixelRatio)

    if (this.state !== null) {
      this.renderer.setSize(this.state.chamber.width, this.state.chamber.height)
      this.render()
    }
  }

  /**
   * Stops the frame loop and the keyboard listeners for good.
   */
  dispose(): void {
    this.disposed = true
    document.removeEventListener('visibilitychange', this.onVisibilityChange)

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId)
      this.frameId = null
    }

    this.input.dispose()
  }

  /**
   * Draws the current state.
   */
  private render(): void {
    if (this.state !== null) {
      this.renderer.render(this.state)
    }
  }

  /**
   * Runs one frame: steps through the history when the press it takes is
   * undo or redo, otherwise advances the rules, with the press or with none.
   * A press is taken only once the state has settled. Then forgets which keys
   * went down during the frame, for the clock.
   * @param delta - Seconds since the previous frame
   * @param input - The keyboard
   * @returns Whether the state changed
   */
  private update(delta: number, input: Input): boolean {
    let updated = false

    // The clock counts from the frame after the first key, so the wait before it is not included
    if (this.clockStarted) {
      this.elapsedSeconds += delta
    } else if (Level.CLOCK_START_KEYS.some((key) => input.isPressed(key))) {
      this.clockStarted = true
    }

    if ((this.state !== null) && (this.history !== null)) {
      // A press waits until the previous one's late effects have landed
      const press = this.settled ? input.takePress() : null

      if (typeof press === 'string') {
        updated = this.updateHistory(this.state, this.history, press)
      } else {
        updated = this.updateRules(delta, this.state, this.history, press ?? EMPTY_FRAME_INPUT)
      }
    }

    input.clear()

    return updated
  }

  /**
   * Advances the rules by one frame, records the step it took in the history,
   * notes whether the state has settled and plays the sounds of what happened
   * in it.
   * @param delta - Seconds since the previous frame
   * @param state - The chamber being played
   * @param history - The run's undo and redo
   * @param frameInput - What the rules read in this frame
   * @returns Whether the state changed
   */
  private updateRules(delta: number, state: State, history: UndoHistory, frameInput: FrameInput): boolean {
    const subject = state.subject
    const startX = subject.x
    const startY = subject.y
    const isKeyFrame = frameInput.keys.length > 0
    // A settled state stays as it is without a key, so only frames with keys
    // and those after a change need comparing
    const before = (isKeyFrame || !this.settled) ? takeSnapshot(state) : null

    const updated = state.update(delta, createFrameInputReader(frameInput))

    if (before !== null) {
      if (isKeyFrame) {
        history.record(before, state)
      }

      this.settled = getSnapshotText(before) === getSnapshotText(takeSnapshot(state))
    }

    // Only the arrow keys move the subject, so a new tile is one step
    if ((subject.x !== startX) || (subject.y !== startY)) {
      this.stepCount++
    }

    for (const event of state.events) {
      Level.SOUNDS[event].play()

      if ((event === GameEvent.BLUE_PORTAL_OPENED) || (event === GameEvent.ORANGE_PORTAL_OPENED)) {
        this.portalCount++
      }
    }

    return updated
  }

  /**
   * Undoes or redoes a step, silently, in place of the rules' frame. The
   * states in the history are settled, so the next press may follow at once.
   * @param state - The chamber being played
   * @param history - The run's undo and redo
   * @param key - Undo or redo
   * @returns Whether a step was undone or redone
   */
  private updateHistory(state: State, history: UndoHistory, key: HistoryKey): boolean {
    const restored = (key === GameKey.UNDO) ? history.undo(state) : history.redo(state)

    if (restored && (key === GameKey.UNDO)) {
      this.undoCount++
    }

    return restored
  }

  /**
   * Starts the frame loop, running the first frame straight away.
   */
  private run(): void {
    this.startTime = Date.now()
    this.onFrame()
  }

  /**
   * Starts the next frame's time from now when the tab comes back, so the
   * time it spent hidden is not counted as one long frame.
   */
  private readonly onVisibilityChange = (): void => {
    if (!document.hidden) {
      this.startTime = Date.now()
    }
  }

  /**
   * Runs one frame, then requests the next. A frame that throws ends the loop.
   */
  private readonly onFrame = (): void => {
    const currentTime = Date.now()
    const delta = (currentTime - this.startTime) / 1000
    this.startTime = currentTime

    if (!this.isPaused) {
      const stateUpdated = this.update(delta, this.input)

      if (stateUpdated) {
        this.render()
      }
    }

    // A callback during the frame may have disposed of the level
    if (!this.disposed) {
      this.frameId = requestAnimationFrame(this.onFrame)
    }
  }
}
