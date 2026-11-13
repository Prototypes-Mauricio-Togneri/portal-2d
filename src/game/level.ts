import type {ChamberData} from '@/game/chamber_data'
import {Direction} from '@/game/direction'
import {FizzleParticles} from '@/game/fizzle_particles'
import {GameEvent} from '@/game/game_event'
import {GameKey, type HistoryKey} from '@/game/game_key'
import type {FrameInput} from '@/game/frame_input'
import {Input, type PointerPosition} from '@/game/input'
import type {KeyBindings} from '@/game/key_bindings'
import {getChamberHash, type ReplayData, type ReplayStep} from '@/game/replay_data'
import {hasAmbientLife, Renderer} from '@/game/renderer'
import {Action, actionOfPress} from '@/game/rules/action'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {loadChamber} from '@/game/rules/load_chamber'
import {runRulesReplay} from '@/game/rules/replay_runner'
import type {RulesState} from '@/game/rules/rules_state'
import {StateHistory} from '@/game/rules/state_history'
import {startChamber, step, type StepResult} from '@/game/rules/step'
import {Sound} from '@/game/sound'
import {StepAnimation} from '@/game/step_animation'

/**
 * Plays a chamber on a canvas, driven by the chamber screen. Each frame takes
 * the oldest waiting key press, if any, as one action, fully resolved by the
 * rules' step, plays a sound for each thing that happened and redraws when
 * the state changed. A step that changes the state is then drawn over a few
 * frames, redrawn every frame until it ends, paused or not; the next press
 * ends it at once. When a step fizzles, what it took breaks up over a few
 * frames, which no press waits for. While anything glows, shimmers or breaks
 * up, every frame is drawn too. Nothing is drawn over time when the player
 * asks for reduced motion: the glows hold steady. Undo and redo bring back
 * earlier states from the run's history, silently and at once. Every press it acts on is logged, so the run
 * since the last load can be replayed without a browser. When a mouse button
 * is bound, a frame may instead turn the subject to face the pointer, as a
 * turn action logged like a pressed one.
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

  /** Keys whose action goes the way the subject faces, so the subject turns to the pointer before a press of one is taken: both portals */
  private static readonly AIMED_KEYS: readonly GameKey[] = [
    GameKey.BLUE,
    GameKey.ORANGE,
  ]

  /** The move keys, while any of which is held the subject keeps the way it walks instead of turning back to the pointer */
  private static readonly MOVE_KEYS: readonly GameKey[] = [
    GameKey.LEFT,
    GameKey.UP,
    GameKey.RIGHT,
    GameKey.DOWN,
  ]

  /** The turn action that faces each direction */
  private static readonly TURNS: Readonly<Record<Direction, Action>> = {
    [Direction.UP]: Action.TURN_UP,
    [Direction.DOWN]: Action.TURN_DOWN,
    [Direction.LEFT]: Action.TURN_LEFT,
    [Direction.RIGHT]: Action.TURN_RIGHT,
  }

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
  private chamberHash = '' // Hash of the chamber being played, as replays name it
  private state: RulesState | null = null // The state now, null before the first load
  private history = new StateHistory() // Undo and redo for the run since the last load
  private replaySteps: ReplayStep[] = [] // Every press acted on since the last load, in order
  private stepHashes: string[] = [] // Hash of the state right after each logged press
  private clockStarted = false // Whether a game key has been pressed since the last load
  private elapsedSeconds = 0 // Play time since the clock started; only grows while unpaused
  private stepCount = 0 // Tiles the subject has stepped onto since the last load
  private portalCount = 0 // Portals opened on a wall since the last load, misses not counted
  private undoCount = 0 // Steps taken back with undo since the last load
  private aimPending = false // Whether the pointer moved or an action was taken since the subject last turned, or tried to turn, to face the pointer
  private readonly canvas: HTMLCanvasElement // The canvas drawn on, where the pointer is measured from
  private readonly renderer: Renderer // Draws the state
  private readonly animation = new StepAnimation() // The step being drawn over a few frames, if any
  private readonly fizzle = new FizzleParticles() // What the latest fizzle took, breaking up over a few frames, if anything
  private frameTime = 0 // The latest frame's time, in milliseconds on the frame clock; redraws outside a frame use it, so a step being drawn never goes back
  private readonly reducedMotion: MediaQueryList // Whether the player asks for reduced motion, read each time something could be drawn over time
  private ambientDrawn = false // Whether the latest frame was drawn for what moves with time alone, so the frame after it ends draws it still
  private readonly input: Input // The keyboard and mouse, listening from construction until dispose()
  private initialized = false // Whether the frame loop has started
  private isPaused = false // Whether the loop skips updates and the input ignores keydown and mousedown
  private disposed = false // Whether dispose() has run
  private frameId: number | null = null // The pending animation frame request
  private startTime = 0 // When the previous frame ran, in milliseconds since the epoch

  /**
   * Takes over a canvas. Nothing is drawn until load().
   * @param canvas - The canvas to draw on
   * @param bindings - The key bound to each game key, which is only read
   * @param screenWidth - Width available to the chamber, in canvas pixels
   * @param screenHeight - Height available to the chamber, in canvas pixels
   */
  constructor(canvas: HTMLCanvasElement, bindings: KeyBindings, screenWidth: number, screenHeight: number) {
    this.canvas = canvas
    this.renderer = new Renderer(canvas, screenWidth, screenHeight)
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.input = new Input(bindings)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  /**
   * Loads the chamber, settles its start and draws it;
   * loading again resets it, its clock, its counters and its undo history.
   * The first load starts the frame loop, running its first frame at once.
   * @param chamberData - The chamber JSON, which is only read
   * @throws Error when the rules can't load the chamber
   */
  load(chamberData: ChamberData): void {
    const loaded = loadChamber(chamberData)

    if (loaded.chamber === null) {
      throw new Error(`The rules can't load the chamber: ${loaded.problems.map((problem) => problem.message).join('; ')}`)
    }

    const chamber = new CompiledChamber(loaded.chamber)
    const start = startChamber(chamber)

    this.renderer.setSize(chamber.width, chamber.height)
    this.chamber = chamber
    this.chamberHash = getChamberHash(loaded.chamber)
    this.state = start.state
    this.history = new StateHistory()
    this.replaySteps = []
    this.stepHashes = []
    this.clockStarted = false
    this.elapsedSeconds = 0
    this.stepCount = 0
    this.portalCount = 0
    this.undoCount = 0
    this.aimPending = false
    this.input.takePointerMoved()
    this.animation.finish()
    this.fizzle.clear()

    this.playEvents(start.events)

    if (!this.initialized) {
      this.initialized = true
      this.run()
    }

    this.render(this.frameTime)
  }

  /**
   * Whether the game is paused.
   */
  get paused(): boolean {
    return this.isPaused
  }

  /**
   * Pauses or resumes. While paused the state does not update and keydown and
   * mousedown are ignored, but a step being drawn still runs to its end.
   * Resuming forgets every key, pressed and held, first.
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
   * the logged presses on the chamber's start first and checks that they
   * reproduce the live run: the state after every press, the moves and the
   * portals.
   * @returns The replay
   * @throws Error when no chamber is loaded, or when the replay differs from the live run
   */
  createReplay(): ReplayData {
    if (this.chamber === null) {
      throw new Error('No chamber is loaded')
    }

    const actions = [...this.replaySteps]
    const result = runRulesReplay(this.chamber, actions)
    const differingStep = this.stepHashes.findIndex((hash, index) => hash !== result.stepHashes[index])

    if (differingStep !== -1) {
      throw new Error(`The replay differs from the live run after press ${differingStep + 1} of ${actions.length} (${actions[differingStep]})`)
    }

    if ((result.moves !== this.stepCount) || (result.portals !== this.portalCount)) {
      throw new Error(`The replay counts ${result.moves} moves and ${result.portals} portals, the live run ${this.stepCount} and ${this.portalCount}`)
    }

    return {
      chamberHash: this.chamberHash,
      actions: actions,
      expected: {
        completed: result.completed,
        moves: result.moves,
        portals: result.portals,
        finalHash: result.finalState.hash,
      },
    }
  }

  /**
   * Fits the current chamber to a new screen area and redraws it as the
   * latest frame drew it, part way through a step being drawn too.
   * @param screenWidth - Width available to the chamber, in canvas pixels
   * @param screenHeight - Height available to the chamber, in canvas pixels
   */
  resize(screenWidth: number, screenHeight: number): void {
    this.renderer.resize(screenWidth, screenHeight)

    if (this.chamber !== null) {
      this.renderer.setSize(this.chamber.width, this.chamber.height)
      this.render(this.frameTime)
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
   * Draws the current state, part way through the step being drawn, if any,
   * with what moves with time alone at this time, what a fizzle took
   * breaking up included, or held still when the player asks for reduced
   * motion.
   * @param time - Now, in milliseconds on the frame clock
   */
  private render(time: number): void {
    if (this.state !== null) {
      this.renderer.render(this.state, this.animation.transitionAt(time), this.reducedMotion.matches ? null : time, this.fizzle)
    }
  }

  /**
   * Plays the sound of each thing that happened, in order, and counts the
   * portals opened.
   * @param events - What happened
   */
  private playEvents(events: readonly GameEvent[]): void {
    for (const event of events) {
      Level.SOUNDS[event].play()

      if ((event === GameEvent.BLUE_PORTAL_OPENED) || (event === GameEvent.ORANGE_PORTAL_OPENED)) {
        this.portalCount++
      }
    }
  }

  /**
   * Runs one frame: turns the subject to face the pointer, when it should,
   * or else takes the oldest waiting press, if any, ends the step being
   * drawn, and steps through the history for undo or redo, or runs the rules'
   * step for any other key. Then forgets which keys went down during the
   * frame, for the clock.
   * @param delta - Seconds since the previous frame
   * @param input - The keyboard and mouse
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns Whether the state changed
   */
  private update(delta: number, input: Input, time: number): boolean {
    let updated = false

    // The clock counts from the frame after the first key, so the wait before it is not included
    if (this.clockStarted) {
      this.elapsedSeconds += delta
    } else if (Level.CLOCK_START_KEYS.some((key) => input.isPressed(key))) {
      this.clockStarted = true
    }

    if ((this.chamber !== null) && (this.state !== null)) {
      if (input.takePointerMoved()) {
        this.aimPending = true
      }

      // Turning to face the pointer takes the frame's step, so a waiting
      // press is taken on the next frame
      if (this.aimAtPointer(this.chamber, this.state, input, time)) {
        updated = true
      } else {
        const press = input.takePress()

        // A press never waits for the step being drawn: it ends it at once,
        // even when the press itself changes nothing
        if (press !== null) {
          this.animation.finish()
        }

        if (typeof press === 'string') {
          updated = this.updateHistory(this.state, press)
        } else if (press !== null) {
          updated = this.updateRules(this.chamber, this.state, press, time)
        }
      }
    }

    input.clear()

    return updated
  }

  /**
   * Turns the subject to face the pointer, when a mouse button is bound and
   * it faces another way: before a waiting portal press is taken, so the
   * shot goes where the pointer is, or, with no press waiting, no move key
   * held and the subject not on its way to another tile, once the pointer
   * has moved or an action was taken. Undo, redo and a load keep the facing
   * they bring back until then. The turn goes through the rules' step and is
   * logged like a pressed one, but one the rules refuse (an arrow tile
   * allows no other way) is dropped unlogged. Nothing turns once the chamber
   * is completed.
   * @param chamber - The chamber being played
   * @param state - The state now
   * @param input - The keyboard and mouse
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns Whether the subject turned
   */
  private aimAtPointer(chamber: CompiledChamber, state: RulesState, input: Input, time: number): boolean {
    if (!input.aimsWithPointer || state.completed) {
      return false
    }

    const nextKey = input.nextKey
    const beforeAimedPress = (nextKey !== null) && Level.AIMED_KEYS.includes(nextKey)

    if (!beforeAimedPress) {
      // A move gliding to its tile is never cut short, nor a walk with a
      // held move key (whose repeats would each turn the subject back and
      // forth), and any other press goes first, since it either faces its
      // own way or brings a facing back
      if ((nextKey !== null) || !this.aimPending || this.animation.movingSubject || Level.MOVE_KEYS.some((key) => input.isHolding(key))) {
        return false
      }

      this.aimPending = false
    }

    const direction = this.pointerDirection(chamber, state, input.pointer)

    // A turn towards the way the subject already faces would walk it
    if ((direction === null) || (direction === state.facing)) {
      return false
    }

    const action = Level.TURNS[direction]
    const result = step(chamber, state, action)

    if (result.state === state) {
      return false
    }

    return this.applyStep(state, action, result, time)
  }

  /**
   * Which way the pointer lies from the centre of the subject's tile: along
   * the axis it is further along, up or down, left or right.
   * @param chamber - The chamber being played
   * @param state - The state now
   * @param pointer - Where the pointer is in the window, or null before it moved
   * @returns The direction, or null when the pointer hasn't moved yet, is over
   * the subject's tile or lies exactly on a diagonal from it, or the canvas
   * isn't shown
   */
  private pointerDirection(chamber: CompiledChamber, state: RulesState, pointer: PointerPosition | null): Direction | null {
    const canvas = this.canvas

    if ((pointer === null) || (canvas.clientWidth === 0) || (canvas.clientHeight === 0)) {
      return null
    }

    // The pointer in tiles from the chamber's bottom left corner, the inside
    // of the canvas's border, with rows counted upwards as the rules count them
    const bounds = canvas.getBoundingClientRect()
    const x = (pointer.x - bounds.left - canvas.clientLeft) * chamber.width / canvas.clientWidth
    const y = chamber.height - ((pointer.y - bounds.top - canvas.clientTop) * chamber.height / canvas.clientHeight)
    const dx = x - (state.subjectX + 0.5)
    const dy = y - (state.subjectY + 0.5)

    if (((Math.abs(dx) <= 0.5) && (Math.abs(dy) <= 0.5)) || (Math.abs(dx) === Math.abs(dy))) {
      return null
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      return (dx > 0) ? Direction.RIGHT : Direction.LEFT
    }

    return (dy > 0) ? Direction.UP : Direction.DOWN
  }

  /**
   * Runs one step of the rules for a press. Nothing runs once the chamber is
   * completed. The subject turns to face the pointer again afterwards, once
   * it is on its tile.
   * @param chamber - The chamber being played
   * @param state - The state before the step
   * @param press - The press, one key and whether the turn key was held
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns Whether the state changed
   */
  private updateRules(chamber: CompiledChamber, state: RulesState, press: FrameInput, time: number): boolean {
    const action = actionOfPress(press)

    if ((action === null) || state.completed) {
      return false
    }

    this.aimPending = true

    return this.applyStep(state, action, step(chamber, state, action), time)
  }

  /**
   * Takes a step of the rules: records it in the history and the log,
   * counts the move, starts drawing the step when it changed the state, and
   * what it took breaking up when it fizzled, and plays the sounds of what
   * happened.
   * @param state - The state before the step
   * @param action - The action stepped
   * @param result - What the rules' step gave for it
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns Whether the state changed
   */
  private applyStep(state: RulesState, action: Action, result: StepResult, time: number): boolean {
    const next = result.state

    this.history.record(state, next)
    this.logStep(action, next)

    // Only moves change the subject's tile, so a new tile is one step
    if ((next.subjectX !== state.subjectX) || (next.subjectY !== state.subjectY)) {
      this.stepCount++
    }

    this.state = next

    if ((next !== state) && !this.reducedMotion.matches) {
      this.animation.start(state, next, result.events, time)
    }

    if (result.events.includes(GameEvent.FIZZLED) && !this.reducedMotion.matches) {
      this.fizzle.start(state, next, time)
    }

    this.playEvents(result.events)

    if (next.completed) {
      this.onCompleted?.()
    }

    return next !== state
  }

  /**
   * Undoes or redoes a step, silently and at once, ending anything a fizzle
   * took breaking up, and logs the press. Nothing can be undone once the
   * chamber is completed.
   * @param state - The state now
   * @param key - Undo or redo
   * @returns Whether a step was undone or redone
   */
  private updateHistory(state: RulesState, key: HistoryKey): boolean {
    if (state.completed) {
      return false
    }

    const restored = (key === GameKey.UNDO) ? this.history.undo(state) : this.history.redo(state)

    // The facing brought back stays until the pointer moves or an action is taken
    this.aimPending = false
    this.logStep(key, restored ?? state)

    if (restored === null) {
      return false
    }

    this.state = restored
    this.fizzle.clear()

    if (key === GameKey.UNDO) {
      this.undoCount++
    }

    return true
  }

  /**
   * Logs a press acted on and the state it led to.
   * @param replayStep - The action, or the undo or redo
   * @param state - The state after it
   */
  private logStep(replayStep: ReplayStep, state: RulesState): void {
    this.replaySteps.push(replayStep)
    this.stepHashes.push(state.hash)
  }

  /**
   * Starts the frame loop, running the first frame straight away.
   */
  private run(): void {
    this.startTime = Date.now()
    this.onFrame(performance.now())
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
   * @param time - The frame's time, in milliseconds on the frame clock (the page's, as `performance.now()` reads it)
   */
  private readonly onFrame = (time: number): void => {
    this.frameTime = time

    const currentTime = Date.now()
    const delta = (currentTime - this.startTime) / 1000
    this.startTime = currentTime

    // A step still being drawn needs this frame, paused or not: part way
    // through, or its end once it is over or a press ended it
    const wasAnimating = this.animation.running
    let stateUpdated = false

    if (!this.isPaused) {
      stateUpdated = this.update(delta, this.input, time)
    }

    // So does anything that glows, shimmers or breaks up, paused or not, and
    // the first frame after it stops, which draws it still
    const ambient = (this.state !== null) && !this.reducedMotion.matches && (hasAmbientLife(this.state) || this.fizzle.isRunningAt(time))

    if (stateUpdated || wasAnimating || ambient || this.ambientDrawn) {
      this.render(time)
    }

    this.ambientDrawn = ambient

    // A callback during the frame may have disposed of the level
    if (!this.disposed) {
      this.frameId = requestAnimationFrame(this.onFrame)
    }
  }
}
