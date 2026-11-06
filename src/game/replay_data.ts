import type {ChamberData} from '@/game/chamber_data'
import {FRAME_KEYS, type FrameInput, type FrameKey} from '@/game/frame_input'
import {formatHash, hashText} from '@/game/text_hash'

/**
 * One frame in which keys were pressed, with the empty frames that ran before it.
 */
export type ReplayFrame = {
  readonly gap: number // Frames without a key pressed since the previous key frame, or since the load
  readonly input: FrameInput // What the rules read in this frame
}

/**
 * What replaying a recording must give.
 */
export type ReplayExpectation = {
  readonly completed: boolean // Whether the chamber ends completed
  readonly moves: number // Tiles stepped onto, counted as the chamber screen counts them
  readonly portals: number // Portals opened on a wall, misses not counted
  readonly finalHash: string // Hash of the state once it has settled after the last frame
}

/**
 * A run recorded frame by frame on today's rules, replayable without a
 * browser. Each frame is written as its gap, a colon and its keys joined by
 * plus signs, with a caret before the keys when the turn key is held: "2:up",
 * "0:up+blue", "1:^left".
 */
export type ReplayData = {
  readonly format: 1 // Version of this layout
  readonly ruleset: 'classic' // The rules the frames were recorded on
  readonly chamberHash: string // Hash of the chamber the run was recorded on; editing the chamber changes it
  readonly frames: readonly string[] // The key frames, in order
  readonly expected: ReplayExpectation // What replaying the frames gives
}

/**
 * A recorded solution of a chamber in the catalogue, as saved next to the
 * chamber's file.
 */
export type SolutionData = ReplayData & {
  readonly chamberId: number // The chamber's permanent id in the catalogue
}

/** A frame's text form: gap, colon, optional caret, keys joined by plus signs */
const FRAME_PATTERN = /^(\d+):(\^?)([a-z]+(?:\+[a-z]+)*)$/

/**
 * Writes a frame in its text form.
 * @param frame - A key frame
 * @returns The frame as text, such as "2:up" or "0:^left"
 */
export function formatReplayFrame(frame: ReplayFrame): string {
  const turn = frame.input.turnHeld ? '^' : ''

  return `${frame.gap}:${turn}${frame.input.keys.join('+')}`
}

/**
 * Reads a frame from its text form. Keys may come in any order, and are
 * returned in the fixed order.
 * @param text - The frame as text
 * @returns The frame
 * @throws Error when the text is not a frame, names an unknown key or names a key twice
 */
export function parseReplayFrame(text: string): ReplayFrame {
  const match = FRAME_PATTERN.exec(text)
  const gapText = match?.[1]
  const keysText = match?.[3]

  if ((match === null) || (gapText === undefined) || (keysText === undefined)) {
    throw new Error(`Malformed replay frame: "${text}"`)
  }

  const gap = Number(gapText)
  const names = keysText.split('+')
  const keys: FrameKey[] = FRAME_KEYS.filter((key) => names.includes(key))

  if (!Number.isSafeInteger(gap)) {
    throw new Error(`Replay frame gap too large: "${text}"`)
  }

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
 * The hash that ties a replay to the chamber it was recorded on, taken from
 * the chamber's data as JSON, so the browser and Node agree on it.
 * @param chamberData - The chamber JSON
 * @returns Eight hexadecimal digits
 */
export function getChamberHash(chamberData: ChamberData): string {
  return formatHash(hashText(JSON.stringify(chamberData)))
}
