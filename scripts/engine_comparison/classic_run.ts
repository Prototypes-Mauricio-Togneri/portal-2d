import type {ChamberData} from '@/game/chamber_data'
import {Chamber} from '@/game/classic/chamber'
import {State} from '@/game/classic/state'
import {restoreSnapshot, takeSnapshot} from '@/game/classic/state_snapshot'
import {runFrame, settleClassic, stepClassic} from '@/game/classic/step_classic'
import {Subject} from '@/game/classic/subject'
import {EMPTY_FRAME_INPUT} from '@/game/frame_input'
import type {GameEvent} from '@/game/game_event'
import type {Action} from '@/game/rules/action'
import {toFrameInput} from '@scripts/engine_comparison/compared_action'
import type {ComparedRun, ComparedView} from '@scripts/engine_comparison/compared_run'

/**
 * Today's rules behind the comparison's engine interface: the chamber is
 * settled at load, and each action is one key frame followed by empty frames
 * until the state settles, as live play does.
 */
export class ClassicRun implements ComparedRun {
  readonly startEvents: readonly GameEvent[] // What settling the chamber at load reported, in order
  private readonly state: State // The rules playing the chamber

  /**
   * @param chamber - The chamber JSON, which is only read
   */
  constructor(chamber: ChamberData) {
    const state = new State(new Chamber(chamber), new Subject(chamber.subject))
    const startEvents: GameEvent[] = []

    settleClassic(state, () => {
      startEvents.push(...runFrame(state, EMPTY_FRAME_INPUT))
    })

    this.state = state
    this.startEvents = startEvents
  }

  /**
   * The state now, without today's "inside a fizzler" flag.
   */
  get view(): ComparedView {
    const snapshot = takeSnapshot(this.state)

    return {
      subject: snapshot.subject,
      bluePortal: snapshot.bluePortal,
      orangePortal: snapshot.orangePortal,
      boxes: snapshot.boxes,
      buttons: snapshot.buttons,
      barriers: snapshot.barriers,
      ditches: snapshot.ditches,
      doors: snapshot.doors,
      fizzlers: snapshot.fizzlers,
      lasers: snapshot.lasers,
      exit: snapshot.exit,
      chamberCompleted: snapshot.chamberCompleted,
    }
  }

  /**
   * Runs the action's key frame, then empty frames until the state settles.
   * @param action - The step's action
   * @returns What every frame reported, in order
   * @throws Error when the rules throw or the state doesn't settle
   */
  step(action: Action): readonly GameEvent[] {
    return stepClassic(this.state, toFrameInput(action))
  }

  /**
   * Carries on from a state another engine reached. That engine keeps no
   * "inside a fizzler" flag, so a subject standing in a field that is on
   * counts as inside it, and is not fizzled again for standing there.
   * @param view - The state to carry on from
   */
  takeOver(view: ComparedView): void {
    restoreSnapshot(this.state, {
      ...view,
      insideFizzler: false,
    })

    const fizzler = this.state.chamber.getFizzler(view.subject.x, view.subject.y)

    this.state.insideFizzler = (fizzler !== null) && fizzler.activated
  }
}

/**
 * Starts a chamber on today's rules.
 * @param chamber - The chamber JSON, which is only read
 * @returns The chamber, settled
 */
export function startClassicRun(chamber: ChamberData): ComparedRun {
  return new ClassicRun(chamber)
}
