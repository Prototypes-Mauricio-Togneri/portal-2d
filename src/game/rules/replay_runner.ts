import {GameKey} from '@/game/game_key'
import type {ReplayStep} from '@/game/replay_data'
import type {CompiledChamber} from '@/game/rules/compiled_chamber'
import type {RulesState} from '@/game/rules/rules_state'
import {StateHistory} from '@/game/rules/state_history'
import {startChamber, step} from '@/game/rules/step'
import {countPortalsOpened, countsAsMove} from '@/game/rules/step_counts'

/**
 * What replaying a recording on the rules gave.
 */
export type RulesReplayResult = {
  readonly completed: boolean // Whether the chamber ended completed
  readonly moves: number // Tiles stepped onto, counted as the chamber screen counts them
  readonly portals: number // Portals opened on a wall, misses not counted
  readonly finalState: RulesState // The state after the last press
  readonly states: readonly RulesState[] // The settled start, then the state after each press
  readonly stepHashes: readonly string[] // Hash of the state after each press, to compare with the live run
}

/**
 * Replays recorded presses on a chamber's settled start with the rules,
 * as the live game plays them: each action is one step of the rules, undo
 * and redo step through the run's history, and nothing runs once the
 * chamber is completed.
 * @param chamber - The chamber, compiled for the rules
 * @param steps - The presses, in order
 * @returns What the replay gave
 * @throws Error when the rules throw
 */
export function runRulesReplay(chamber: CompiledChamber, steps: readonly ReplayStep[]): RulesReplayResult {
  const start = startChamber(chamber)
  const history = new StateHistory()
  const states: RulesState[] = [start.state]
  const stepHashes: string[] = []
  let state: RulesState = start.state
  let moves = 0
  let portals = countPortalsOpened(start.events)

  for (const replayStep of steps) {
    // The live game takes no press once the chamber is completed
    if (state.completed) {
      states.push(state)
      stepHashes.push(state.hash)
      continue
    }

    if (replayStep === GameKey.UNDO) {
      state = history.undo(state) ?? state
    } else if (replayStep === GameKey.REDO) {
      state = history.redo(state) ?? state
    } else {
      const result = step(chamber, state, replayStep)

      history.record(state, result.state)

      if (countsAsMove(state, result.state)) {
        moves++
      }

      portals += countPortalsOpened(result.events)
      state = result.state
    }

    states.push(state)
    stepHashes.push(state.hash)
  }

  return {
    completed: state.completed,
    moves: moves,
    portals: portals,
    finalState: state,
    states: states,
    stepHashes: stepHashes,
  }
}
