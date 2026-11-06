import type {State} from '@/game/classic/state'
import {getSnapshotText, takeSnapshot} from '@/game/classic/state_snapshot'
import {createFrameInputReader, EMPTY_FRAME_INPUT, type FrameInput} from '@/game/frame_input'
import type {GameEvent} from '@/game/game_event'

/**
 * The most empty frames that may still change the state after a frame with
 * keys, or after a load. Some effects land a frame late (a button behind a
 * carried box, a fizzler under the subject, the exit check), so a key's
 * consequences can take a few frames; once this many empty frames have run,
 * the state is settled and further empty frames change nothing.
 */
export const SETTLE_CAP = 8

/**
 * Runs one frame of today's rules with a frame's input.
 * @param state - The rules playing a chamber
 * @param input - What the rules read in this frame
 * @returns What happened during the frame, in order
 */
export function runFrame(state: State, input: FrameInput): readonly GameEvent[] {
  // The rules ignore the frame time
  state.update(0, createFrameInputReader(input))

  return state.events
}

/**
 * Runs empty frames until one leaves the state as it was. The snapshot is
 * compared rather than the frame's own "changed" result, which misses a
 * fizzler firing on a later frame.
 * @param state - The rules playing a chamber
 * @param runEmptyFrame - Runs one empty frame on the state; replays pass one that also counts moves and portals
 * @throws Error when the state still changes after SETTLE_CAP empty frames
 */
export function settleClassic(state: State, runEmptyFrame: () => void): void {
  let previous = getSnapshotText(takeSnapshot(state))

  for (let i = 0; i <= SETTLE_CAP; i++) {
    runEmptyFrame()

    const current = getSnapshotText(takeSnapshot(state))

    if (current === previous) {
      return
    }

    previous = current
  }

  throw new Error(`The state still changed after ${SETTLE_CAP} empty frames`)
}

/**
 * Today's rules as a step function: runs one frame with the input, then
 * empty frames until the state has settled.
 * @param state - The rules playing a chamber, changed in place
 * @param input - What the rules read in the frame with keys
 * @returns What happened during every frame run, in order
 * @throws Error when the state does not settle within SETTLE_CAP empty frames
 */
export function stepClassic(state: State, input: FrameInput): GameEvent[] {
  const events = [...runFrame(state, input)]

  settleClassic(state, () => {
    events.push(...runFrame(state, EMPTY_FRAME_INPUT))
  })

  return events
}
