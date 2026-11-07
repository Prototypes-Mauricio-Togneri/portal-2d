import type {ChamberData} from '@/game/chamber_data'
import type {Action} from '@/game/rules/action'
import {ChamberTiles} from '@scripts/engine_comparison/chamber_tiles'
import {startClassicRun} from '@scripts/engine_comparison/classic_run'
import {type ComparedOutcome, type ComparedRun, playStep} from '@scripts/engine_comparison/compared_run'
import {findIntendedDifference} from '@scripts/engine_comparison/intended_differences'
import {describeOutcomeDifferences} from '@scripts/engine_comparison/outcome_differences'
import {startV2Run} from '@scripts/engine_comparison/v2_run'

/**
 * A chamber played on today's rules and on the v2 rules, in step with each
 * other.
 */
export type Comparison = {
  readonly data: ChamberData // The chamber JSON
  readonly tiles: ChamberTiles // What the chamber file puts on each tile
  readonly differences: Map<string, number> // Intended differences seen so far, by id
  classic: ComparedRun // The chamber on today's rules
  v2: ComparedRun // The chamber on the v2 rules
}

/**
 * Whether two outcomes of a step agree in everything compared. Cheaper than
 * listing the differences, which only a disagreement needs.
 * @param classic - What today's rules did
 * @param v2 - What the v2 rules did
 * @returns True when the error, the events and the state are the same
 */
function outcomesAgree(classic: ComparedOutcome, v2: ComparedOutcome): boolean {
  return (classic.error === v2.error) &&
    (classic.events.join() === v2.events.join()) &&
    (JSON.stringify(classic.view) === JSON.stringify(v2.view))
}

/**
 * Starts the chamber on both engines, which must agree on the settled start.
 * @param comparison - The chamber; both runs are replaced
 * @throws Error listing the differences when they disagree
 */
export function startBoth(comparison: Comparison): void {
  comparison.classic = startClassicRun(comparison.data)
  comparison.v2 = startV2Run(comparison.data)

  const differences = describeOutcomeDifferences({
    view: comparison.classic.view,
    events: comparison.classic.startEvents,
    error: null,
  }, {
    view: comparison.v2.view,
    events: comparison.v2.startEvents,
    error: null,
  })

  if (differences.length > 0) {
    throw new Error(`the start differs: ${differences.join('; ')}`)
  }
}

/**
 * Builds a comparison of a chamber, started on both engines.
 * @param data - The chamber JSON
 * @returns The comparison
 * @throws Error when the engines disagree on the start
 */
export function createComparison(data: ChamberData): Comparison {
  const comparison: Comparison = {
    data: data,
    tiles: new ChamberTiles(data),
    differences: new Map(),
    classic: startClassicRun(data),
    v2: startV2Run(data),
  }

  startBoth(comparison)

  return comparison
}

/**
 * Plays one action on both engines and compares them. An intended
 * difference is counted, and today's rules then take over v2's state.
 * @param comparison - The chamber on both engines
 * @param action - The step's action
 * @returns The id of the intended difference that explains the step, or null when the engines agree
 * @throws Error when v2 throws, or listing the differences when no intended difference explains them
 */
export function compareStep(comparison: Comparison, action: Action): string | null {
  const before = comparison.classic.view
  const classic = playStep(comparison.classic, action)
  const v2 = playStep(comparison.v2, action)

  if (v2.error !== null) {
    throw new Error(`v2 threw "${v2.error}"`)
  }

  if (outcomesAgree(classic, v2)) {
    return null
  }

  const difference = findIntendedDifference({
    tiles: comparison.tiles,
    action: action,
    before: before,
    classic: classic,
    v2: v2,
  })

  if (difference === null) {
    throw new Error(`no intended difference explains: ${describeOutcomeDifferences(classic, v2).join('; ')}`)
  }

  comparison.differences.set(difference.id, (comparison.differences.get(difference.id) ?? 0) + 1)
  comparison.classic.takeOver(v2.view)

  return difference.id
}
