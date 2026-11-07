import type {ChamberData} from '@/game/chamber_data'
import {GameKey, type HistoryKey} from '@/game/game_key'
import {type Action, ACTIONS} from '@/game/rules/action'
import {formatHash, hashText} from '@/game/text_hash'

/**
 * What replaying a recording must give.
 */
export type ReplayExpectation = {
  readonly completed: boolean // Whether the chamber ends completed
  readonly moves: number // Tiles stepped onto, counted as the chamber screen counts them
  readonly portals: number // Portals opened on a wall, misses not counted
  readonly finalHash: string // Hash of the state after the last step
}

/**
 * One press of a recorded run: an action of the rules, or an undo or redo,
 * which the level handles instead.
 */
export type ReplayStep = Action | HistoryKey

/**
 * A run recorded press by press, replayable without a browser. Each press is
 * written as its action ("up", "turnLeft", "blue", "interact") or as "undo"
 * or "redo".
 */
export type ReplayData = {
  readonly format: 2 // Version of this layout; format 1, frame by frame on the original rules, is no longer read
  readonly ruleset: 'v2' // The rules the presses were recorded on, as named when the original rules still ran beside them
  readonly chamberHash: string // Hash of the chamber the run was recorded on, read in the current format; editing the chamber changes it
  readonly actions: readonly ReplayStep[] // The presses, in order
  readonly expected: ReplayExpectation // What replaying the presses gives
}

/**
 * A recorded solution of a chamber in the catalogue, as saved next to the
 * chamber's file.
 */
export type SolutionData = ReplayData & {
  readonly chamberId: number // The chamber's permanent id in the catalogue
}

/** Every press a recorded run can hold: the actions, then undo and redo */
const REPLAY_STEPS: readonly ReplayStep[] = [
  ...ACTIONS,
  GameKey.UNDO,
  GameKey.REDO,
]

/**
 * Reads a press of a recorded run.
 * @param text - The press as text, such as "up", "turnLeft" or "undo"
 * @returns The press
 * @throws Error when the text names no action, undo or redo
 */
export function parseReplayStep(text: string): ReplayStep {
  const replayStep = REPLAY_STEPS.find((candidate) => candidate === text)

  if (replayStep === undefined) {
    throw new Error(`Unknown replay action: "${text}"`)
  }

  return replayStep
}

/**
 * The hash that ties a replay to the chamber it was recorded on, taken from
 * the chamber as read in the current format, so the browser and Node agree
 * on it, and upgrading a chamber file to the current format keeps it.
 * @param chamber - The chamber, read in the current format
 * @returns Eight hexadecimal digits
 */
export function getChamberHash(chamber: ChamberData): string {
  return formatHash(hashText(JSON.stringify(chamber)))
}
