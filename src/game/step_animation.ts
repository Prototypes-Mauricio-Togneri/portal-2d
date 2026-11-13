import type {GameEvent} from '@/game/game_event'
import type {RulesState} from '@/game/rules/rules_state'

/**
 * A step of the rules as drawn part way through: the states before and after
 * it, what happened during it, and how far the drawing has gone.
 */
export type StepTransition = {
  readonly from: RulesState // The state before the step
  readonly to: RulesState // The state after the step, the one the frame ends on
  readonly events: readonly GameEvent[] // What happened during the step, in order
  readonly progress: number // How far the drawing has gone, eased: from 0 up to, never reaching, 1
}

/**
 * A step being drawn, as started.
 */
type RunningStep = {
  readonly from: RulesState // The state before the step
  readonly to: RulesState // The state after the step
  readonly events: readonly GameEvent[] // What happened during the step, in order
  readonly startTime: number // When the drawing started, in milliseconds on the frame clock
}

/** How long a step takes to draw, in milliseconds: about seven frames at 60 Hz, short enough to never feel late */
const STEP_MILLISECONDS = 120

/** How far back a step's drawing starts, in milliseconds: one frame at 60 Hz, so the frame that takes the press already shows part of it */
const FIRST_FRAME_LEAD_MILLISECONDS = 1000 / 60

/**
 * Draws one step of the rules over a short time, from the state before it to
 * the state after it. Purely visual: the rules have already settled the step
 * when it starts, and ending it early changes nothing but the drawing. At most
 * one step runs; starting another replaces it.
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
   * Whether the step being drawn takes the subject to another tile, walking
   * or through a portal, so it is still on its way there.
   */
  get movingSubject(): boolean {
    const runningStep = this.runningStep

    return (runningStep !== null) && ((runningStep.from.subjectX !== runningStep.to.subjectX) || (runningStep.from.subjectY !== runningStep.to.subjectY))
  }

  /**
   * Starts drawing a step, replacing any step still being drawn.
   * @param from - The state before the step
   * @param to - The state after the step
   * @param events - What happened during the step, in order
   * @param time - Now, in milliseconds on the frame clock
   */
  start(from: RulesState, to: RulesState, events: readonly GameEvent[], time: number): void {
    this.runningStep = {
      from: from,
      to: to,
      events: events,
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
   * The step being drawn as it looks at a time. Once the time reaches its
   * end the step is over: it ends, and the frame draws the state after it as
   * it is.
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns The step part way through, or null when none is being drawn
   */
  transitionAt(time: number): StepTransition | null {
    if (this.runningStep === null) {
      return null
    }

    const linear = (time - this.runningStep.startTime) / STEP_MILLISECONDS

    if (linear >= 1) {
      this.runningStep = null

      return null
    }

    return {
      from: this.runningStep.from,
      to: this.runningStep.to,
      events: this.runningStep.events,
      progress: StepAnimation.easeOut(Math.max(linear, 0)),
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
}
