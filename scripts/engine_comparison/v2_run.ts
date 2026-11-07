import type {ChamberData} from '@/game/chamber_data'
import {createRulesState, readSharedSnapshot} from '@/game/classic/rules_state_bridge'
import type {GameEvent} from '@/game/game_event'
import type {Action} from '@/game/rules/action'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {readChamber} from '@/game/rules/load_chamber'
import type {RulesState} from '@/game/rules/rules_state'
import {startChamber, step} from '@/game/rules/step'
import type {ComparedRun, ComparedView} from '@scripts/engine_comparison/compared_run'

/**
 * The v2 rules behind the comparison's engine interface. The chamber file is
 * upgraded and read but not validated, so a fixture chamber the validator
 * rejects (one open at the edge) still plays.
 */
export class V2Run implements ComparedRun {
  readonly startEvents: readonly GameEvent[] // What settling the chamber at load reported, in order
  private readonly chamber: CompiledChamber // The chamber, compiled for the v2 rules
  private state: RulesState // The state now

  /**
   * @param data - The chamber JSON, which is only read
   * @throws Error when the chamber file can't be read
   */
  constructor(data: ChamberData) {
    const read = readChamber(data)

    if (read.chamber === null) {
      throw new Error(`the v2 rules can't read the chamber: ${read.problems.map((problem) => problem.message).join('; ')}`)
    }

    this.chamber = new CompiledChamber(read.chamber)

    const start = startChamber(this.chamber)

    this.state = start.state
    this.startEvents = start.events
  }

  /**
   * The state now.
   */
  get view(): ComparedView {
    return readSharedSnapshot(this.state)
  }

  /**
   * Runs one step.
   * @param action - The step's action
   * @returns What it reported, in order
   * @throws Error when the rules throw
   */
  step(action: Action): readonly GameEvent[] {
    const result = step(this.chamber, this.state, action)

    this.state = result.state

    return result.events
  }

  /**
   * Carries on from a state another engine reached.
   * @param view - The state to carry on from
   */
  takeOver(view: ComparedView): void {
    this.state = createRulesState(this.chamber, view)
  }
}

/**
 * Starts a chamber on the v2 rules.
 * @param chamber - The chamber JSON, which is only read
 * @returns The chamber, settled
 */
export function startV2Run(chamber: ChamberData): ComparedRun {
  return new V2Run(chamber)
}
