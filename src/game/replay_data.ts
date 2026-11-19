import type {ChamberData} from '@/game/chamber_data'
import {type Action, ACTIONS} from '@/game/rules/action'
import {formatHash, hashText} from '@/game/text_hash'

/**
 * What replaying a recording must give.
 */
export type ReplayExpectation = {
  readonly completed: boolean // Whether the chamber ends completed
  readonly moves: number // Steps that put the subject on another tile, counted as the chamber screen counts them
  readonly portals: number // Portals opened on a wall, misses not counted
  readonly finalHash: string // Hash of the state after the last step
}

/**
 * A run recorded press by press, replayable without a browser, as a recorded
 * solution saved next to its chamber's file. Each press is written as its
 * action ("up", "turnLeft", "blue", "interact").
 */
export type ReplayData = {
  readonly chamberHash: string // Hash of the chamber the run was recorded on, as read; editing the chamber changes it, but for its antlines
  readonly actions: readonly Action[] // The presses, in order
  readonly expected: ReplayExpectation // What replaying the presses gives
}

/**
 * Reads a press of a recorded run.
 * @param text - The press as text, such as "up" or "turnLeft"
 * @returns The action
 * @throws Error when the text names no action
 */
export function parseReplayAction(text: string): Action {
  const action = ACTIONS.find((candidate) => candidate === text)

  if (action === undefined) {
    throw new Error(`Unknown replay action: "${text}"`)
  }

  return action
}

/**
 * The hash that ties a replay to the chamber it was recorded on, taken from
 * the chamber as read, so the browser and Node agree on it. It leaves out
 * the antlines, which are only drawn, so adding or moving one never asks for
 * the chamber's solution to be recorded again.
 * @param chamber - The chamber, as read
 * @returns Eight hexadecimal digits
 */
export function getChamberHash(chamber: ChamberData): string {
  // A field set to undefined is left out of the JSON, as if never there
  return formatHash(hashText(JSON.stringify({
    ...chamber,
    antlines: undefined,
  })))
}
