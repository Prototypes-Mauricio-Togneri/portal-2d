import type {ChamberData} from '@/game/chamber_data'
import {Chamber} from '@/game/classic/chamber'
import {State} from '@/game/classic/state'
import {getStateHash} from '@/game/classic/state_snapshot'
import {runFrame, settleClassic} from '@/game/classic/step_classic'
import {Subject} from '@/game/classic/subject'
import {EMPTY_FRAME_INPUT, type FrameInput} from '@/game/frame_input'
import {GameEvent} from '@/game/game_event'
import {parseReplayFrame} from '@/game/replay_data'

/**
 * What replaying a recording gave.
 */
export type ReplayResult = {
  readonly completed: boolean // Whether the chamber ended completed
  readonly moves: number // Tiles stepped onto, counted as the chamber screen counts them
  readonly portals: number // Portals opened on a wall, misses not counted
  readonly finalHash: string // Hash of the state once it settled after the last frame
  readonly keyFrameHashes: readonly string[] // Hash of the state right after each key frame, to compare with the live run
}

/**
 * The run's counters while a replay runs.
 */
type ReplayCounters = {
  moves: number // Tiles stepped onto so far
  portals: number // Portals opened on a wall so far
}

/**
 * Runs one frame and counts it as the chamber screen does: a new tile is one
 * step, and each portal opened on a wall is one portal.
 * @param state - The rules playing the chamber
 * @param input - What the rules read in this frame
 * @param counters - The run's counters, updated in place
 */
function runCountedFrame(state: State, input: FrameInput, counters: ReplayCounters): void {
  const startX = state.subject.x
  const startY = state.subject.y

  for (const event of runFrame(state, input)) {
    if ((event === GameEvent.BLUE_PORTAL_OPENED) || (event === GameEvent.ORANGE_PORTAL_OPENED)) {
      counters.portals++
    }
  }

  if ((state.subject.x !== startX) || (state.subject.y !== startY)) {
    counters.moves++
  }
}

/**
 * Replays recorded frames on a freshly built chamber with today's rules:
 * each frame's gap of empty frames, then the frame itself; at the end, empty
 * frames until the state settles.
 * @param chamberData - The chamber JSON, which is only read
 * @param frames - The key frames, in their text form
 * @returns What the replay gave
 * @throws Error when a frame is malformed, when the rules throw, or when the state does not settle
 */
export function runReplay(chamberData: ChamberData, frames: readonly string[]): ReplayResult {
  const state = new State(new Chamber(chamberData), new Subject(chamberData.subject))
  const keyFrameHashes: string[] = []
  const counters: ReplayCounters = {
    moves: 0,
    portals: 0,
  }

  for (const text of frames) {
    const frame = parseReplayFrame(text)

    for (let i = 0; i < frame.gap; i++) {
      runCountedFrame(state, EMPTY_FRAME_INPUT, counters)
    }

    runCountedFrame(state, frame.input, counters)
    keyFrameHashes.push(getStateHash(state))
  }

  settleClassic(state, () => {
    runCountedFrame(state, EMPTY_FRAME_INPUT, counters)
  })

  return {
    completed: state.chamberCompleted,
    moves: counters.moves,
    portals: counters.portals,
    finalHash: getStateHash(state),
    keyFrameHashes: keyFrameHashes,
  }
}
