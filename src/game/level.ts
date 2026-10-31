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
  onCompleted: (() => void) | null = null // Called once per load when the subject reaches the exit

  private state: State | null = null // The chamber being played, null before the first load
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
  }

  /**
   * Builds the chamber from scratch and draws it; loading again resets it.
   * The first load starts the frame loop, running its first frame at once.
   * @param chamberData - The chamber JSON, which is only read
   */
  load(chamberData: ChamberData): void {
    this.renderer.setSize(chamberData.size.width, chamberData.size.height)

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

    if (this.state !== null) {
      updated = this.state.update(delta, input)
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
