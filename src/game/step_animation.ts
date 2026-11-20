import type {Direction} from '@/game/direction'
import {GameEvent} from '@/game/game_event'
import type {RulesState} from '@/game/rules/rules_state'
import {NO_PATH, type SlideLeg} from '@/game/rules/step'

/**
 * A step of the rules as drawn part way through: the states before and after
 * it, what happened during it, the tiles a slide entered, how far the
 * drawing has gone, and how far the subject has walked on past the step's
 * last tile, out of the chamber through the exit.
 */
export type StepTransition = {
  readonly from: RulesState // The state before the step
  readonly to: RulesState // The state after the step, the one the frame ends on
  readonly events: readonly GameEvent[] // What happened during the step, in order
  readonly path: readonly SlideLeg[] // Each tile a slide entered, in order; empty when the step didn't slide
  readonly progress: number // How far the drawing has gone, eased: from 0 up to, never reaching, 1; along a slide, the share of its path's units travelled; for a step the subject walks out of the chamber after, at an even pace, reaching 1 once it is on the exit
  readonly walkOut: Direction | null // The way the subject walks on out of the chamber through the exit after the step, or null when it doesn't
  readonly beyond: number // How far past the step's last tile, the exit's, the subject has walked on, in tiles: 0 until it is on the exit, and for every step it doesn't walk out after
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
  readonly walkOut: Direction | null // The way the subject walks on out of the chamber through the exit after the step, or null when it doesn't
  readonly duration: number // How long it takes to draw, in milliseconds
  readonly startTime: number // When the drawing started, in milliseconds on the frame clock
}

/** How long a step takes to draw, in milliseconds: about seven frames at 60 Hz, short enough to never feel late */
const STEP_MILLISECONDS = 120

/** A slide's pace, in milliseconds per unit: a tile glided, or half of a portal crossing */
const SLIDE_UNIT_MILLISECONDS = 60

/** A walk-out's pace after a step that didn't slide, in milliseconds per tile: the subject crosses the exit and walks on out of sight at an even pace, slower than a step, so it reads as leaving */
const WALK_OUT_TILE_MILLISECONDS = 180

/** How far past the exit's tile a walk-out takes the subject, in tiles: its middle one tile past the exit's, so the whole tile it is drawn on lies past the chamber's edge */
const WALK_OUT_TILES = 1

/** How far back a step's drawing starts, in milliseconds: one frame at 60 Hz, so the frame that takes the press already shows part of it */
const FIRST_FRAME_LEAD_MILLISECONDS = 1000 / 60

/** What a walk-out held at its end still has happening: nothing */
const NO_EVENTS: readonly GameEvent[] = []

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
 * the step until it reaches the first, and the state on the exit while it
 * walks on out of the chamber, until the slide's stop and settling play as
 * the walk-out ends; for any other step, the state after it.
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
 * every other step takes STEP_MILLISECONDS, eased out. A step that puts the
 * subject on the exit, moving out through the chamber's edge, walks it on
 * out of the chamber, never stopping on the exit: a slide at its own pace,
 * its last unit not eased, any other step at WALK_OUT_TILE_MILLISECONDS a
 * tile, then on WALK_OUT_TILES past the exit at the same pace. Once drawn to
 * its end, a walk-out is held there, the subject out of sight, until the
 * next step starts or finish().
 */
export class StepAnimation {
  private runningStep: RunningStep | null = null // The step being drawn, null when none is
  private walkedOut: StepTransition | null = null // The latest walk-out, held at its end once drawn there: the state after it, the subject past the chamber's edge; null when none is

  /**
   * Whether a step is being drawn and has not yet drawn its end.
   */
  get running(): boolean {
    return this.runningStep !== null
  }

  /**
   * When the step being drawn draws its end, in milliseconds on the frame
   * clock: a slide's stop, or the end of a walk-out, the subject out of
   * sight; null when no step is being drawn.
   */
  get endTime(): number | null {
    const running = this.runningStep

    return (running === null) ? null : running.startTime + running.duration
  }

  /**
   * Starts drawing a step, replacing any step still being drawn and a
   * walk-out held at its end.
   * @param from - The state before the step
   * @param to - The state after the step
   * @param events - What happened during the step, in order
   * @param path - Each tile a slide entered, in order; empty when the step didn't slide
   * @param walkOut - The way the subject walks on out of the chamber through the exit after the step, or null when it doesn't
   * @param time - Now, in milliseconds on the frame clock
   */
  start(from: RulesState, to: RulesState, events: readonly GameEvent[], path: readonly SlideLeg[], walkOut: Direction | null, time: number): void {
    const units = slideUnits(path)
    const stepDuration = (path.length === 0) ? STEP_MILLISECONDS : StepAnimation.slideElapsed(units, units)

    this.walkedOut = null
    this.runningStep = {
      from: from,
      to: to,
      events: events,
      path: path,
      units: units,
      walkOut: walkOut,
      duration: (walkOut === null) ? stepDuration : (StepAnimation.walkLength(path, events) + WALK_OUT_TILES) * StepAnimation.walkPace(path),
      startTime: time - FIRST_FRAME_LEAD_MILLISECONDS,
    }
  }

  /**
   * Ends the step being drawn at once, so the next frame draws the state
   * after it as it is, and lets go of a walk-out held at its end.
   */
  finish(): void {
    this.runningStep = null
    this.walkedOut = null
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

    // A slide the subject walks out of the chamber after never eases out
    const elapsed = (running.walkOut === null) ? StepAnimation.slideElapsed(distance, running.units) : distance * SLIDE_UNIT_MILLISECONDS

    return running.startTime + elapsed
  }

  /**
   * The step being drawn as it looks at a time. Once the time reaches its
   * end the step is over: it ends, and the frame draws the state after it as
   * it is, or, after a walk-out, with the subject held out of sight.
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns The step part way through, a walk-out held at its end, or null when neither is being drawn
   */
  transitionAt(time: number): StepTransition | null {
    const running = this.runningStep

    if (running === null) {
      return this.walkedOut
    }

    const elapsed = time - running.startTime

    if (elapsed >= running.duration) {
      this.runningStep = null
      // Nothing of the step is left to draw but where the subject went: the
      // state after it, the subject held past the chamber's edge
      this.walkedOut = (running.walkOut === null) ? null : {
        from: running.to,
        to: running.to,
        events: NO_EVENTS,
        path: NO_PATH,
        progress: 1,
        walkOut: running.walkOut,
        beyond: WALK_OUT_TILES,
      }

      return this.walkedOut
    }

    const sinceStart = Math.max(elapsed, 0)

    if (running.walkOut !== null) {
      const length = StepAnimation.walkLength(running.path, running.events)
      const travelled = sinceStart / StepAnimation.walkPace(running.path)

      return {
        from: running.from,
        to: running.to,
        events: running.events,
        path: running.path,
        progress: Math.min(travelled / length, 1),
        walkOut: running.walkOut,
        beyond: Math.max(travelled - length, 0),
      }
    }

    return {
      from: running.from,
      to: running.to,
      events: running.events,
      path: running.path,
      progress: (running.path.length === 0) ? StepAnimation.easeOut(sinceStart / STEP_MILLISECONDS) : StepAnimation.slideDistance(sinceStart, running.units) / running.units,
      walkOut: null,
      beyond: 0,
    }
  }

  /**
   * How far the subject travels in a step it walks out of the chamber after,
   * up to the exit's tile, in units at its walk-out's pace (walkPace): a
   * slide's length, two for a portal crossing, into one portal and out of
   * the other, or else one tile.
   * @param path - Each tile a slide entered, in order; empty when the step didn't slide
   * @param events - What happened during the step, in order
   * @returns The distance, in units
   */
  private static walkLength(path: readonly SlideLeg[], events: readonly GameEvent[]): number {
    if (path.length > 0) {
      return slideUnits(path)
    }

    return events.includes(GameEvent.CROSSED) ? 2 : 1
  }

  /**
   * The pace of a walk-out: a slide's own, or WALK_OUT_TILE_MILLISECONDS
   * after any other step.
   * @param path - Each tile a slide entered, in order; empty when the step didn't slide
   * @returns Its pace, in milliseconds per unit
   */
  private static walkPace(path: readonly SlideLeg[]): number {
    return (path.length > 0) ? SLIDE_UNIT_MILLISECONDS : WALK_OUT_TILE_MILLISECONDS
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
