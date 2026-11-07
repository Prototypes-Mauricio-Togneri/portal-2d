import type {ChamberData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {GameKey, type HistoryKey} from '@/game/game_key'
import type {FrameInput} from '@/game/frame_input'
import {Input} from '@/game/input'
import type {KeyBindings} from '@/game/key_bindings'
import type {ReplayData} from '@/game/replay_data'
import {RendererV2} from '@/game/renderer_v2'
import {actionOfPress} from '@/game/rules/action'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {loadChamber} from '@/game/rules/load_chamber'
import type {RulesState} from '@/game/rules/rules_state'
import {startChamber, step} from '@/game/rules/step'
import {Sound} from '@/game/sound'

/**
 * Development only (stage 01): plays chambers on the v2 rules, with the same
 * interface as Level so the chamber screen can drive either. Each frame takes
 * the oldest waiting key press, if any, as one action, fully resolved by the
 * rules' step, plays a sound for each thing that happened and redraws when
 * the state changed. Undo and redo bring back earlier states from two stacks
 * of the run's states, silently. Solutions are still recorded on today's
 * rules, so it records none.
 */
export class LevelV2 {
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

  private chamber: CompiledChamber | null = null // The chamber being played, null before the first load
  private state: RulesState | null = null // The state now, null before the first load
  private undoStates: RulesState[] = [] // The states before each step since the last load, newest last
  private redoStates: RulesState[] = [] // The states undone since the latest step, most recently undone last
  private clockStarted = false // Whether a game key has been pressed since the last load
  private elapsedSeconds = 0 // Play time since the clock started; only grows while unpaused
  private stepCount = 0 // Tiles the subject has stepped onto since the last load
  private portalCount = 0 // Portals opened on a wall since the last load, misses not counted
  private undoCount = 0 // Steps taken back with undo since the last load
  private readonly renderer: RendererV2 // Draws the state
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
    this.renderer = new RendererV2(canvas, screenWidth, screenHeight, pixelRatio)
    this.input = new Input(bindings)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  /**
   * Loads the chamber for the v2 rules, settles its start and draws it;
   * loading again resets it, its clock, its counters and its undo history.
   * The first load starts the frame loop, running its first frame at once.
   * @param chamberData - The chamber JSON, which is only read
   * @throws Error when the v2 rules can't load the chamber
   */
  load(chamberData: ChamberData): void {
    const loaded = loadChamber(chamberData)

    if (loaded.chamber === null) {
      throw new Error(`The v2 rules can't load the chamber: ${loaded.problems.map((problem) => problem.message).join('; ')}`)
    }

    const chamber = new CompiledChamber(loaded.chamber)
    const start = startChamber(chamber)

    this.renderer.setSize(chamber.width, chamber.height)
    this.chamber = chamber
    this.state = start.state
    this.undoStates = []
    this.redoStates = []
    this.clockStarted = false
    this.elapsedSeconds = 0
    this.stepCount = 0
    this.portalCount = 0
    this.undoCount = 0

    this.playEvents(start.events)

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
   * Refuses: solutions are still recorded on today's rules, until stage 01
   * gives the v2 rules a replay format of their own.
   * @returns Never
   * @throws Error always
   */
  createReplay(): ReplayData {
    throw new Error('Solutions are recorded on today\'s rules; open the chamber without ?rules=v2 to record one')
  }

  /**
   * Fits the current chamber to a new screen area or pixel ratio and redraws it.
   * @param screenWidth - Width available to the chamber, in canvas pixels
   * @param screenHeight - Height available to the chamber, in canvas pixels
   * @param pixelRatio - Canvas pixels per page pixel; 1 by default
   */
  resize(screenWidth: number, screenHeight: number, pixelRatio = 1): void {
    this.renderer.resize(screenWidth, screenHeight, pixelRatio)

    if (this.chamber !== null) {
      this.renderer.setSize(this.chamber.width, this.chamber.height)
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
   * Plays the sound of each thing that happened, in order, and counts the
   * portals opened.
   * @param events - What happened
   */
  private playEvents(events: readonly GameEvent[]): void {
    for (const event of events) {
      LevelV2.SOUNDS[event].play()

      if ((event === GameEvent.BLUE_PORTAL_OPENED) || (event === GameEvent.ORANGE_PORTAL_OPENED)) {
        this.portalCount++
      }
    }
  }

  /**
   * Runs one frame: takes the oldest waiting press, if any, and steps
   * through the history for undo or redo, or runs the rules' step for any
   * other key. Then forgets which keys went down during the frame, for the
   * clock.
   * @param delta - Seconds since the previous frame
   * @param input - The keyboard
   * @returns Whether the state changed
   */
  private update(delta: number, input: Input): boolean {
    let updated = false

    // The clock counts from the frame after the first key, so the wait before it is not included
    if (this.clockStarted) {
      this.elapsedSeconds += delta
    } else if (LevelV2.CLOCK_START_KEYS.some((key) => input.isPressed(key))) {
      this.clockStarted = true
    }

    if ((this.chamber !== null) && (this.state !== null)) {
      const press = input.takePress()

      if (typeof press === 'string') {
        updated = this.updateHistory(this.state, press)
      } else if (press !== null) {
        updated = this.updateRules(this.chamber, this.state, press)
      }
    }

    input.clear()

    return updated
  }

  /**
   * Runs one step of the rules for a press, records it in the history when
   * it changed the state, counts the move and plays the sounds of what
   * happened. Nothing runs once the chamber is completed.
   * @param chamber - The chamber being played
   * @param state - The state before the step
   * @param press - The press, one key and whether the turn key was held
   * @returns Whether the state changed
   */
  private updateRules(chamber: CompiledChamber, state: RulesState, press: FrameInput): boolean {
    const action = actionOfPress(press)

    if ((action === null) || state.completed) {
      return false
    }

    const result = step(chamber, state, action)
    const next = result.state

    if (next !== state) {
      this.undoStates.push(state)
      this.redoStates = []
    }

    // Only moves change the subject's tile, so a new tile is one step
    if ((next.subjectX !== state.subjectX) || (next.subjectY !== state.subjectY)) {
      this.stepCount++
    }

    this.state = next
    this.playEvents(result.events)

    if (next.completed) {
      this.onCompleted?.()
    }

    return next !== state
  }

  /**
   * Undoes or redoes a step, silently. Nothing can be undone once the
   * chamber is completed.
   * @param state - The state now
   * @param key - Undo or redo
   * @returns Whether a step was undone or redone
   */
  private updateHistory(state: RulesState, key: HistoryKey): boolean {
    if (state.completed) {
      return false
    }

    const from = (key === GameKey.UNDO) ? this.undoStates : this.redoStates
    const to = (key === GameKey.UNDO) ? this.redoStates : this.undoStates
    const restored = from.pop()

    if (restored === undefined) {
      return false
    }

    to.push(state)
    this.state = restored

    if (key === GameKey.UNDO) {
      this.undoCount++
    }

    return true
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
