import {Chamber} from '@/game/classic/chamber'
import type {ChamberData} from '@/game/chamber_data'
import {createFrameInputReader, type FrameInput} from '@/game/frame_input'
import {GameEvent} from '@/game/game_event'
import {GameKey, type HistoryKey} from '@/game/game_key'
import {Input} from '@/game/input'
import {formatReplayFrame, getChamberHash, type ReplayData} from '@/game/replay_data'
import {Renderer} from '@/game/renderer'
import {runReplay} from '@/game/classic/replay_runner'
import {SETTLE_CAP} from '@/game/classic/step_classic'
import {Sound} from '@/game/sound'
import {State} from '@/game/classic/state'
import {getStateHash, takeSnapshot} from '@/game/classic/state_snapshot'
import {Subject} from '@/game/classic/subject'
import {UndoHistory} from '@/game/classic/undo_history'

/**
 * Plays chambers on a canvas: owns the keyboard input, the renderer and the
 * frame loop. Each frame advances the state with the keys pressed since the
 * previous frame, plays a sound for each thing that happened in it, and
 * redraws only when the state reports a change. A frame with undo or redo
 * steps through the run's history instead, silently. Frames with keys are
 * logged, so the run since the last load can be replayed without a browser.
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
  private chamberData: ChamberData | null = null // The layout of the chamber being played, null before the first load
  private history: UndoHistory | null = null // Undo and redo for the run since the last load, null before the first load
  private frameLog: string[] = [] // Every frame with keys since the last load, in the replay text form
  private keyFrameHashes: string[] = [] // Hash of the state right after each logged frame
  private emptyFrames = 0 // Frames without keys since the last logged frame or the load
  private clockStarted = false // Whether a game key has been pressed since the last load
  private elapsedSeconds = 0 // Play time since the clock started; only grows while unpaused
  private stepCount = 0 // Tiles the subject has stepped onto since the last load
  private portalCount = 0 // Portals opened on a wall since the last load, misses not counted
  private undoCount = 0 // Steps taken back with undo since the last load
  private readonly renderer: Renderer // Draws the state
  private readonly input = new Input() // The keyboard, listening from construction until dispose()
  private initialized = false // Whether the frame loop has started
  private isPaused = false // Whether the loop skips updates and the input ignores keydown
  private disposed = false // Whether dispose() has run
  private frameId: number | null = null // The pending animation frame request
  private startTime = 0 // When the previous frame ran, in milliseconds since the epoch

  /**
   * Takes over a canvas. Nothing is drawn until load().
   * @param canvas - The canvas to draw on
   * @param screenWidth - Width available to the chamber, in canvas pixels
   * @param screenHeight - Height available to the chamber, in canvas pixels
   * @param pixelRatio - Canvas pixels per page pixel, such as the screen's device pixel ratio; 1 by default
   */
  constructor(canvas: HTMLCanvasElement, screenWidth: number, screenHeight: number, pixelRatio = 1) {
    this.renderer = new Renderer(canvas, screenWidth, screenHeight, pixelRatio)
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
    this.chamberData = chamberData
    this.history = new UndoHistory(chamberData)
    this.frameLog = []
    this.keyFrameHashes = []
    this.emptyFrames = 0

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
   * The run since the last load as a replay, for saving a solution. Replays
   * the logged frames on a fresh copy of the chamber first and checks that
   * they reproduce the live run: the state after every key frame, the moves
   * and the portals.
   * @returns The replay
   * @throws Error when no chamber is loaded, or when the replay differs from the live run
   */
  createReplay(): ReplayData {
    if (this.chamberData === null) {
      throw new Error('No chamber is loaded')
    }

    const frames = [...this.frameLog]
    const result = runReplay(this.chamberData, frames)
    const differingFrame = this.keyFrameHashes.findIndex((hash, index) => hash !== result.keyFrameHashes[index])

    if (differingFrame !== -1) {
      throw new Error(`The replay differs from the live run after key frame ${differingFrame + 1} of ${frames.length} (${frames[differingFrame]})`)
    }

    if ((result.moves !== this.stepCount) || (result.portals !== this.portalCount)) {
      throw new Error(`The replay counts ${result.moves} moves and ${result.portals} portals, the live run ${this.stepCount} and ${this.portalCount}`)
    }

    return {
      format: 1,
      ruleset: 'classic',
      chamberHash: getChamberHash(this.chamberData),
      frames: frames,
      expected: {
        completed: result.completed,
        moves: result.moves,
        portals: result.portals,
        finalHash: result.finalHash,
      },
    }
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
   * Runs one frame: steps through the history when undo or redo was pressed,
   * otherwise advances the rules. Then forgets the keys pressed during it.
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
      const historyKey = Level.getHistoryKey(input)

      if (historyKey !== null) {
        updated = this.updateHistory(this.state, this.history, historyKey)
      } else {
        updated = this.updateRules(delta, this.state, this.history, input)
      }
    }

    input.clear()

    return updated
  }

  /**
   * Advances the rules by one frame, records the step it took in the history
   * and plays the sounds of what happened in it.
   * @param delta - Seconds since the previous frame
   * @param state - The chamber being played
   * @param history - The run's undo and redo
   * @param input - The keyboard
   * @returns Whether the state changed
   */
  private updateRules(delta: number, state: State, history: UndoHistory, input: Input): boolean {
    const subject = state.subject
    const startX = subject.x
    const startY = subject.y
    // The rules read only this, so replaying the logged frames gives them exactly what they saw live
    const frameInput = input.frameInput
    // Only a frame with keys can take a step, so the others skip the snapshot
    const before = (frameInput.keys.length > 0) ? takeSnapshot(state) : null

    const updated = state.update(delta, createFrameInputReader(frameInput))

    if (before !== null) {
      history.record(before, state)
    }

    this.logFrame(state, frameInput)

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
   * Undoes or redoes a step, silently, in place of the rules' frame; any
   * other key pressed in the same frame is dropped.
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

    this.logFrame(state, key)

    return restored
  }

  /**
   * Logs a frame that had keys, with the empty frames before it, and the
   * state it led to; frames without keys are only counted.
   * @param state - The state after the frame
   * @param input - What the rules read in the frame, or the undo or redo pressed instead
   */
  private logFrame(state: State, input: FrameInput | HistoryKey): void {
    if ((typeof input !== 'string') && (input.keys.length === 0)) {
      this.emptyFrames++

      return
    }

    // Past the cap the state has settled, so more empty frames would replay the same
    this.frameLog.push(formatReplayFrame({
      gap: Math.min(this.emptyFrames, SETTLE_CAP),
      input: input,
    }))
    this.keyFrameHashes.push(getStateHash(state))
    this.emptyFrames = 0
  }

  /**
   * Which history key a frame pressed; undo wins when both were.
   * @param input - The keyboard
   * @returns Undo, redo, or null when neither was pressed
   */
  private static getHistoryKey(input: Input): HistoryKey | null {
    if (input.isPressed(GameKey.UNDO)) {
      return GameKey.UNDO
    }

    if (input.isPressed(GameKey.REDO)) {
      return GameKey.REDO
    }

    return null
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
