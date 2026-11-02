import {Chamber} from '@/game/chamber'
import type {ChamberData} from '@/game/chamber_data'
import {Input} from '@/game/input'
import {Renderer} from '@/game/renderer'
import {State} from '@/game/state'
import {Subject} from '@/game/subject'

/**
 * Plays chambers on a canvas: owns the keyboard input, the renderer and the
 * frame loop. Each frame advances the state with the keys pressed since the
 * previous frame and redraws only when the state reports a change.
 */
export class Level {
  /** Keys that start the clock: moving, turning, both portals and interacting */
  private static readonly CLOCK_START_KEYS: readonly number[] = [
    Input.LEFT,
    Input.UP,
    Input.RIGHT,
    Input.DOWN,
    Input.KEY_A,
    Input.KEY_D,
    Input.SPACE,
    Input.CTRL,
  ]

  onCompleted: (() => void) | null = null // Called once per load when the subject reaches the exit

  private state: State | null = null // The chamber being played, null before the first load
  private clockStarted = false // Whether a game key has been pressed since the last load
  private elapsedSeconds = 0 // Play time since the clock started; only grows while unpaused
  private stepCount = 0 // Tiles the subject has stepped onto since the last load
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
   * @param screenWidth - Width available to the chamber, in pixels
   * @param screenHeight - Height available to the chamber, in pixels
   */
  constructor(canvas: HTMLCanvasElement, screenWidth: number, screenHeight: number) {
    this.renderer = new Renderer(canvas, screenWidth, screenHeight)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  /**
   * Builds the chamber from scratch and draws it; loading again resets it
   * and its clock. The first load starts the frame loop, running its first
   * frame at once.
   * @param chamberData - The chamber JSON, which is only read
   */
  load(chamberData: ChamberData): void {
    this.renderer.setSize(chamberData.size.width, chamberData.size.height)
    this.clockStarted = false
    this.elapsedSeconds = 0
    this.stepCount = 0

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
   * counts as one step.
   */
  get moves(): number {
    return this.stepCount
  }

  /**
   * Portals opened on a wall since the last load, misses not counted.
   */
  get portalsPlaced(): number {
    return this.state?.portalsPlaced ?? 0
  }

  /**
   * Fits the current chamber to a new screen area and redraws it.
   * @param screenWidth - Width available to the chamber, in pixels
   * @param screenHeight - Height available to the chamber, in pixels
   */
  resize(screenWidth: number, screenHeight: number): void {
    this.renderer.resize(screenWidth, screenHeight)

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
   * Advances the state by one frame and forgets the keys pressed during it.
   * @param delta - Seconds since the previous frame
   * @param input - The keyboard
   * @returns Whether the state changed
   */
  private update(delta: number, input: Input): boolean {
    let updated = false

    // The clock counts from the frame after the first key, so the wait before it is not included
    if (this.clockStarted) {
      this.elapsedSeconds += delta
    } else if (Level.CLOCK_START_KEYS.some((keyCode) => input.isPressed(keyCode))) {
      this.clockStarted = true
    }

    if (this.state !== null) {
      const subject = this.state.subject
      const startX = subject.x
      const startY = subject.y

      updated = this.state.update(delta, input)

      // Only the arrow keys move the subject, so a new tile is one step
      if ((subject.x !== startX) || (subject.y !== startY)) {
        this.stepCount++
      }
    }

    input.clear()

    return updated
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
