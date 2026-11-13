import type {RulesState} from '@/game/rules/rules_state'

/**
 * The element types that slide open and shut: doors and the exit.
 */
export type SlidingKind = 'door' | 'exit'

/**
 * How far open a door or the exit is drawn, from 0 (shut) to 1 (open), or
 * null to draw it as the state says.
 */
export type DoorOpenings = (kind: SlidingKind, index: number) => number | null

/**
 * One door or the exit sliding open or shut.
 */
type Slide = {
  readonly kind: SlidingKind // Door or exit
  readonly index: number // Its number among its type's elements
  readonly from: number // How far open it was when the slide started, from 0 (shut) to 1 (open)
  readonly to: number // How far open it ends: 0 or 1
  readonly startTime: number // When the slide started, in milliseconds on the frame clock
  readonly duration: number // How long the slide takes, in milliseconds
}

/** The element types that slide, in the order they are looked through */
const SLIDING_KINDS: readonly SlidingKind[] = [
  'door',
  'exit',
]

/** How long a door or the exit takes to slide all the way open or shut, in milliseconds */
const SLIDE_MILLISECONDS = 300

/**
 * The doors and the exit sliding open or shut over a short time after a step
 * opened or closed them. Purely visual: the rules have already opened or
 * closed them, and nothing waits for a slide, so a press never cuts one
 * short. A door that turns back part way slides back from where it is.
 */
export class DoorSlides {
  private slides: readonly Slide[] = [] // The slides running, empty when none is

  /**
   * Starts sliding each door and the exit that a step opened or closed,
   * from where it is drawn now.
   * @param before - The state before the step
   * @param after - The state after the step
   * @param time - Now, in milliseconds on the frame clock
   */
  start(before: RulesState, after: RulesState, time: number): void {
    const started: Slide[] = []

    for (const kind of SLIDING_KINDS) {
      for (let i = 0; i < after.chamber.countOf(kind); i++) {
        const shut = after.isBlocked(kind, i)

        if (before.isBlocked(kind, i) === shut) {
          continue
        }

        const to = shut ? 0 : 1
        const from = this.openingAt(kind, i, time) ?? (1 - to)

        started.push({
          kind: kind,
          index: i,
          from: from,
          to: to,
          startTime: time,
          duration: SLIDE_MILLISECONDS * Math.abs(to - from),
        })
      }
    }

    if (started.length > 0) {
      const replaced = (slide: Slide): boolean => started.some((newSlide) => (newSlide.kind === slide.kind) && (newSlide.index === slide.index))

      this.slides = [
        ...this.slides.filter((slide) => !replaced(slide) && (time - slide.startTime < slide.duration)),
        ...started,
      ]
    }
  }

  /**
   * Ends every slide at once, so each door and the exit are drawn as the
   * state says.
   */
  clear(): void {
    this.slides = []
  }

  /**
   * Whether anything is still sliding at a time. A slide whose time has
   * reached its end is over.
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns True while a door or the exit is sliding
   */
  isRunningAt(time: number): boolean {
    if (this.slides.some((slide) => time - slide.startTime >= slide.duration)) {
      this.slides = this.slides.filter((slide) => time - slide.startTime < slide.duration)
    }

    return this.slides.length > 0
  }

  /**
   * How far open a door or the exit is drawn at a time.
   * @param kind - Door or exit
   * @param index - Its number among its type's elements
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns From 0 (shut) to 1 (open), or null when it isn't sliding
   */
  openingAt(kind: SlidingKind, index: number, time: number): number | null {
    const slide = this.slides.find((running) => (running.kind === kind) && (running.index === index))

    if (slide === undefined) {
      return null
    }

    if (slide.duration <= 0) {
      return null
    }

    const linear = (time - slide.startTime) / slide.duration

    if (linear >= 1) {
      return null
    }

    // Cubic ease-out, like a step's glide: quick at first, then settling
    const eased = 1 - ((1 - Math.max(linear, 0)) ** 3)

    return slide.from + ((slide.to - slide.from) * eased)
  }
}
