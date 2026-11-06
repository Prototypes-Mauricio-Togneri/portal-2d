import type {ChamberData} from '@/game/chamber_data'
import {Chamber} from '@/game/classic/chamber'
import {State} from '@/game/classic/state'
import {getSnapshotText, restoreSnapshot, type StateSnapshot, takeSnapshot} from '@/game/classic/state_snapshot'
import {runFrame, settleClassic} from '@/game/classic/step_classic'
import {Subject} from '@/game/classic/subject'
import {EMPTY_FRAME_INPUT} from '@/game/frame_input'

/**
 * Undo and redo for a run on today's rules. Holds the states before each step
 * that changed something, and those undone since the last new step. Every
 * state it holds is settled: worked out on a copy of the chamber of its own,
 * with the effects that land a frame late already landed. So undo never stops
 * halfway through a step, and nothing is left to happen (or to play a sound)
 * after it. The live game and the replay runner share it, so a replay steps
 * through the history exactly as the live run did.
 */
export class UndoHistory {
  private readonly undoStates: StateSnapshot[] = [] // Settled states before each recorded step, oldest first
  private readonly redoStates: StateSnapshot[] = [] // Settled states undone since the last recorded step, most recently undone last
  private readonly scratch: State // A copy of the chamber that states are settled on, so the run itself is never touched

  /**
   * @param chamberData - The chamber being played, which is only read
   */
  constructor(chamberData: ChamberData) {
    this.scratch = new State(new Chamber(chamberData), new Subject(chamberData.subject))
  }

  /**
   * Records the step a frame with keys took, when it changed something:
   * saves the state before it for undo and forgets what was undone. Keys that
   * change nothing, or only let an earlier step's late effect land, add no step.
   * @param before - The state just before the frame
   * @param state - The rules playing the chamber, just after the frame
   */
  record(before: StateSnapshot, state: State): void {
    const settledBefore = this.settle(before)
    const settledAfter = this.settle(takeSnapshot(state))

    if ((settledBefore !== null) && (settledAfter !== null) && (getSnapshotText(settledBefore) === getSnapshotText(settledAfter))) {
      return
    }

    // A state the rules can't settle still counts as a change; one before the
    // step that can't be settled has nothing to go back to, so undo goes
    // further back instead
    if (settledBefore !== null) {
      this.undoStates.push(settledBefore)
    }

    this.redoStates.length = 0
  }

  /**
   * Takes the run back to the state before its latest step.
   * @param state - The rules playing the chamber, changed in place
   * @returns Whether a step was undone
   */
  undo(state: State): boolean {
    return this.restoreFrom(this.undoStates, this.redoStates, state)
  }

  /**
   * Takes the run forward again to the state before the latest undo.
   * @param state - The rules playing the chamber, changed in place
   * @returns Whether a step was redone
   */
  redo(state: State): boolean {
    return this.restoreFrom(this.redoStates, this.undoStates, state)
  }

  /**
   * Restores the latest state of one list, keeping the current one in the other.
   * @param from - The list to take the state from
   * @param to - The list that keeps the current state, to come back to it
   * @param state - The rules playing the chamber, changed in place
   * @returns Whether a state was restored
   */
  private restoreFrom(from: StateSnapshot[], to: StateSnapshot[], state: State): boolean {
    const target = from.at(-1)

    if (target === undefined) {
      return false
    }

    const current = this.settle(takeSnapshot(state))

    // Reaching the exit is reported a frame after arriving, so a run already
    // on its way out can't be taken back; nor can one the rules fail on next
    if ((current === null) || current.chamberCompleted) {
      return false
    }

    from.pop()
    to.push(current)
    restoreSnapshot(state, target)

    return true
  }

  /**
   * Works out where a state ends up once no key is pressed, on the copy of
   * the chamber.
   * @param snapshot - The state
   * @returns The state once settled, or null when the rules throw on the way
   * (releasing a button linked to a box) or it does not settle within the cap
   * @throws Error when the snapshot does not fit the chamber
   */
  private settle(snapshot: StateSnapshot): StateSnapshot | null {
    restoreSnapshot(this.scratch, snapshot)

    // An error here is only a forecast: the run itself throws on its own
    // frame if it gets there, as it always has, and may yet step out of the way
    try {
      settleClassic(this.scratch, () => {
        runFrame(this.scratch, EMPTY_FRAME_INPUT)
      })
    } catch {
      return null
    }

    return takeSnapshot(this.scratch)
  }
}
