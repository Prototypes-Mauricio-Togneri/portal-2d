import type {ChamberData} from '@/game/chamber_data'
import type {SharedSnapshot} from '@/game/classic/rules_state_bridge'
import type {GameEvent} from '@/game/game_event'
import type {Action} from '@/game/rules/action'

/**
 * The state both engines must agree on after every step: everything today's
 * snapshot holds except the "inside a fizzler" flag, which v2 drops. Lists
 * follow the chamber file's element order.
 */
export type ComparedView = SharedSnapshot

/**
 * One chamber being played by one engine, one action at a time.
 */
export type ComparedRun = {
  readonly startEvents: readonly GameEvent[] // What settling the chamber at load reported, in order
  readonly view: ComparedView // The state now
  step(action: Action): readonly GameEvent[] // Runs one step and returns what it reported; throws when the rules throw
  takeOver(view: ComparedView): void // Carries on from a state another engine reached
}

/**
 * Starts a chamber on one engine, settled as the rules say a chamber starts.
 */
export type ComparedEngine = (chamber: ChamberData) => ComparedRun

/**
 * What one engine did with a step.
 */
export type ComparedOutcome = {
  readonly view: ComparedView // The state after the step
  readonly events: readonly GameEvent[] // What it reported, in order; empty when it threw
  readonly error: string | null // The message when the rules threw, otherwise null
}

/**
 * Runs one step, catching the rules' errors so they can be compared too.
 * @param run - The chamber being played
 * @param action - The step's action
 * @returns The state, events and error after the step
 */
export function playStep(run: ComparedRun, action: Action): ComparedOutcome {
  try {
    const events = run.step(action)

    return {
      view: run.view,
      events: events,
      error: null,
    }
  } catch (error) {
    return {
      view: run.view,
      events: [],
      error: (error instanceof Error) ? error.message : String(error),
    }
  }
}
