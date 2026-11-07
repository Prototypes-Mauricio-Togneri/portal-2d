import type {ChamberDataV2} from '@/game/chamber_data_v2'
import {FRAME_KEYS, type FrameInput, type FrameKey} from '@/game/frame_input'
import {GameKey, type HistoryKey} from '@/game/game_key'
import {type Action, ACTIONS} from '@/game/rules/action'
import {formatHash, hashText} from '@/game/text_hash'

/**
 * One frame in which keys were pressed on today's rules, with the empty
 * frames that ran before it, as the behaviour fixtures of today's rules are
 * written. In a frame with undo or redo the rules don't run: the level steps
 * through its history instead.
 */
export type ReplayFrame = {
  readonly gap: number // Frames without a key pressed since the previous key frame, or since the load
  readonly input: FrameInput | HistoryKey // What the rules read in this frame, or the undo or redo pressed instead
}

/**
 * What replaying a recording must give.
 */
export type ReplayExpectation = {
  readonly completed: boolean // Whether the chamber ends completed
  readonly moves: number // Tiles stepped onto, counted as the chamber screen counts them
  readonly portals: number // Portals opened on a wall, misses not counted
  readonly finalHash: string // Hash of the state after the last step (on today's rules, once it has settled after the last frame)
}

/**
 * One press of a run recorded on the v2 rules: an action of the rules, or an
 * undo or redo, which the level handles instead.
 */
export type ReplayStep = Action | HistoryKey

/**
 * A run recorded press by press on the v2 rules, replayable without a
 * browser. Each press is written as its action ("up", "turnLeft", "blue",
 * "interact") or as "undo" or "redo".
 */
export type ReplayData = {
  readonly format: 2 // Version of this layout; format 1, frame by frame on today's rules, is no longer read
  readonly ruleset: 'v2' // The rules the presses were recorded on
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

/** Every press a recorded run of the v2 rules can hold: the actions, then undo and redo */
const REPLAY_STEPS: readonly ReplayStep[] = [
  ...ACTIONS,
  GameKey.UNDO,
  GameKey.REDO,
]

/** A frame's text form: gap, colon, optional caret, keys joined by plus signs */
const FRAME_PATTERN = /^(\d+):(\^?)([a-z]+(?:\+[a-z]+)*)$/

/**
 * Reads a frame from its text form. Keys may come in any order, and are
 * returned in the fixed order.
 * @param text - The frame as text
 * @returns The frame
 * @throws Error when the text is not a frame, names an unknown key or names a
 * key twice, or pairs undo or redo with another key or the turn key
 */
export function parseReplayFrame(text: string): ReplayFrame {
  const match = FRAME_PATTERN.exec(text)
  const gapText = match?.[1]
  const keysText = match?.[3]

  if ((match === null) || (gapText === undefined) || (keysText === undefined)) {
    throw new Error(`Malformed replay frame: "${text}"`)
  }

  const gap = Number(gapText)

  if (!Number.isSafeInteger(gap)) {
    throw new Error(`Replay frame gap too large: "${text}"`)
  }

  if ((keysText === GameKey.UNDO) || (keysText === GameKey.REDO)) {
    if (match[2] === '^') {
      throw new Error(`Replay frame with the turn key held on ${keysText}: "${text}"`)
    }

    return {
      gap: gap,
      input: keysText,
    }
  }

  const names = keysText.split('+')
  const keys: FrameKey[] = FRAME_KEYS.filter((key) => names.includes(key))

  if (keys.length !== names.length) {
    throw new Error(`Replay frame with an unknown or repeated key: "${text}"`)
  }

  return {
    gap: gap,
    input: {
      keys: keys,
      turnHeld: match[2] === '^',
    },
  }
}

/**
 * Reads a press of a recorded run of the v2 rules.
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
export function getChamberHash(chamber: ChamberDataV2): string {
  return formatHash(hashText(JSON.stringify(chamber)))
}
