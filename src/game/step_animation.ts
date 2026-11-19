import type {GameEvent} from '@/game/game_event'
import type {RulesState} from '@/game/rules/rules_state'
import type {SlideLeg} from '@/game/rules/step'

/**
 * A step of the rules as drawn part way through: the states before and after
 * it, what happened during it, the tiles a slide entered, and how far the
 * drawing has gone.
 */
export type StepTransition = {
  readonly from: RulesState // The state before the step
  readonly to: RulesState // The state after the step, the one the frame ends on
  readonly events: readonly GameEvent[] // What happened during the step, in order
  readonly path: readonly SlideLeg[] // Each tile a slide entered, in order; empty when the step didn't slide
  readonly progress: number // How far the drawing has gone, eased: from 0 up to, never reaching, 1; along a slide, the share of its path's units travelled
}

/**
 * A step being drawn, as started.
 */
type RunningStep = {
  readonly from: RulesState // The state before the step
  readonly to: RulesState // The state after the step
  readonly events: readonly GameEvent[] // What happened during the step, in order
  readonly path: readonly SlideLeg[] // Each tile a slide entered, in order; empty when the step didn't slide
  readonly units: number // The slide's length in units (slideUnits), or 0 when it didn't slide
  readonly duration: number // How long it takes to draw, in milliseconds
  readonly startTime: number // When the drawing started, in milliseconds on the frame clock
}

/** How long a step takes to draw, in milliseconds: about seven frames at 60 Hz, short enough to never feel late */
const STEP_MILLISECONDS = 120

/** A slide's pace, in milliseconds per unit: a tile glided, or half of a portal crossing */
const SLIDE_UNIT_MILLISECONDS = 60

/** How far back a step's drawing starts, in milliseconds: one frame at 60 Hz, so the frame that takes the press already shows part of it */
const FIRST_FRAME_LEAD_MILLISECONDS = 1000 / 60

/**
 * How many units a leg of a slide takes: one for a tile glided onto, two for
 * a portal crossing, into the entry portal and out of the exit portal.
 * @param leg - The leg
 * @returns Its units
 */
export function legUnits(leg: SlideLeg): number {
  return leg.crossed ? 2 : 1
}

/**
 * How long a slide's path is, in units (legUnits).
 * @param path - Each tile the slide entered
 * @returns The units of all its legs
 */
export function slideUnits(path: readonly SlideLeg[]): number {
  return path.reduce((units, leg) => units + legUnits(leg), 0)
}

/**
 * How far along a slide the subject has reached a leg's tile, in units: half
 * way into it, or, for a portal crossing, through the portal. What happens
 * on that tile shows from then on.
 * @param path - Each tile the slide entered
 * @param index - The leg
 * @returns The distance along the path, in units
 */
export function legReach(path: readonly SlideLeg[], index: number): number {
  const before = slideUnits(path.slice(0, index))
  const leg = path[index]

  if (leg === undefined) {
    return before
  }

  return before + (leg.crossed ? 1 : 0.5)
}

/**
 * The state a frame shows part way through a step: along a slide, the state
 * on the last tile the subject has reached (legReach), or the state before
 * the step until it reaches the first; for any other step, the state after
 * it.
 * @param transition - The step being drawn
 * @returns The state shown
 */
export function shownState(transition: StepTransition): RulesState {
  const path = transition.path

  if (path.length === 0) {
    return transition.to
  }

  const travelled = transition.progress * slideUnits(path)
  let shown = transition.from

  for (const [
    index,
    leg,
  ] of path.entries()) {
    if (travelled < legReach(path, index)) {
      break
    }

    shown = leg.state
  }

  return shown
}

/**
 * Draws one step of the rules over a short time, from the state before it to
 * the state after it. Purely visual: the rules have already settled the step
 * when it starts, and ending it early changes nothing but the drawing. At most
 * one step runs; starting another replaces it. A slide is drawn along its
 * path at an even pace, one unit (legUnits) every SLIDE_UNIT_MILLISECONDS,
 * easing out over its last unit, so a six-tile slide takes about 0.42 s;
 * every other step takes STEP_MILLISECONDS, eased out.
 */
export class StepAnimation {
  private runningStep: RunningStep | null = null // The step being drawn, null when none is

  /**
   * Whether a step is being drawn and has not yet drawn its end.
   */
  get running(): boolean {
    return this.runningStep !== null
  }

  /**
   * Starts drawing a step, replacing any step still being drawn.
   * @param from - The state before the step
   * @param to - The state after the step
   * @param events - What happened during the step, in order
   * @param path - Each tile a slide entered, in order; empty when the step didn't slide
   * @param time - Now, in milliseconds on the frame clock
   */
  start(from: RulesState, to: RulesState, events: readonly GameEvent[], path: readonly SlideLeg[], time: number): void {
    const units = slideUnits(path)

    this.runningStep = {
      from: from,
      to: to,
      events: events,
      path: path,
      units: units,
      duration: (path.length === 0) ? STEP_MILLISECONDS : StepAnimation.slideElapsed(units, units),
      startTime: time - FIRST_FRAME_LEAD_MILLISECONDS,
    }
  }

  /**
   * Ends the step being drawn at once, so the next frame draws the state
   * after it as it is.
   */
  finish(): void {
    this.runningStep = null
  }

  /**
   * When the slide being drawn reaches a distance along its path.
   * @param distance - The distance, in units, from 0 to its length
   * @returns The time, in milliseconds on the frame clock, or null when no slide is being drawn
   */
  momentAt(distance: number): number | null {
    const running = this.runningStep

    if ((running === null) || (running.path.length === 0)) {
      return null
    }

    return running.startTime + StepAnimation.slideElapsed(distance, running.units)
  }

  /**
   * The step being drawn as it looks at a time. Once the time reaches its
   * end the step is over: it ends, and the frame draws the state after it as
   * it is.
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns The step part way through, or null when none is being drawn
   */
  transitionAt(time: number): StepTransition | null {
    const running = this.runningStep

    if (running === null) {
      return null
    }

    const elapsed = time - running.startTime

    if (elapsed >= running.duration) {
      this.runningStep = null

      return null
    }

    const sinceStart = Math.max(elapsed, 0)

    return {
      from: running.from,
      to: running.to,
      events: running.events,
      path: running.path,
      progress: (running.path.length === 0) ? StepAnimation.easeOut(sinceStart / STEP_MILLISECONDS) : StepAnimation.slideDistance(sinceStart, running.units) / running.units,
    }
  }

  /**
   * Eases a step's progress out: quick at first, settling gently into the
   * new tile, so most of the movement shows right after the key.
   * @param linear - Progress at an even pace, from 0 to 1
   * @returns The eased progress, from 0 to 1
   */
  private static easeOut(linear: number): number {
    // Cubic ease-out
    return 1 - ((1 - linear) ** 3)
  }

  /**
   * How far a slide has gone after a time: one unit every
   * SLIDE_UNIT_MILLISECONDS until its last unit, then that unit eased out
   * over twice as long, starting at the same speed, so it settles into its
   * last tile without a jolt.
   * @param elapsed - Time since the slide's drawing started, in milliseconds
   * @param units - The slide's length, in units
   * @returns The distance along its path, in units, from 0 to its length
   */
  private static slideDistance(elapsed: number, units: number): number {
    const steady = (units - 1) * SLIDE_UNIT_MILLISECONDS

    if (elapsed <= steady) {
      return elapsed / SLIDE_UNIT_MILLISECONDS
    }

    const linear = Math.min((elapsed - steady) / (2 * SLIDE_UNIT_MILLISECONDS), 1)

    // Quadratic ease-out, whose speed at its start is the steady pace
    return (units - 1) + (1 - ((1 - linear) ** 2))
  }

  /**
   * When a slide reaches a distance along its path, the inverse of
   * slideDistance.
   * @param distance - The distance, in units, from 0 to the slide's length
   * @param units - The slide's length, in units
   * @returns Time since the slide's drawing started, in milliseconds
   */
  private static slideElapsed(distance: number, units: number): number {
    const steady = units - 1

    if (distance <= steady) {
      return distance * SLIDE_UNIT_MILLISECONDS
    }

    const share = Math.min(distance - steady, 1)

    return (steady * SLIDE_UNIT_MILLISECONDS) + ((1 - Math.sqrt(1 - share)) * 2 * SLIDE_UNIT_MILLISECONDS)
  }
}
