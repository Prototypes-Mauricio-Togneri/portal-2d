import type {BlockableData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Turns a fizzler off, when a link unblocks it.
 * @param draft - The step's state
 * @param index - The fizzler's index in the chamber's fizzler list
 */
function turnFizzlerOff(draft: StateDraft, index: number): void {
  draft.setBlocked('fizzler', index, false)
}

/**
 * Turns a fizzler on, when a link blocks it.
 * @param draft - The step's state
 * @param index - The fizzler's index in the chamber's fizzler list
 */
function turnFizzlerOn(draft: StateDraft, index: number): void {
  draft.setBlocked('fizzler', index, true)
}

/**
 * The fizzler rule, in every pass while the subject stands in the field:
 * if it is on, both portals close and a carried box is destroyed. Reports
 * fizzled at most once per step, and only when the subject wasn't standing
 * in a field that was on when the step began, so nothing remembers having
 * been inside one.
 * @param draft - The step's state
 * @param index - The fizzler's index in the chamber's fizzler list
 */
function applyFizzlerRule(draft: StateDraft, index: number): void {
  if (!draft.isBlocked('fizzler', index)) {
    return
  }

  draft.closePortals()
  draft.destroyCarriedBox()

  const before = draft.before
  const startedInField = (before !== null) && before.isBlockedAt('fizzler', before.subjectX, before.subjectY)

  if ((!startedInField) && (!draft.events.includes(GameEvent.FIZZLED))) {
    draft.emit(GameEvent.FIZZLED)
  }
}

/** An emancipation field: while it is on, standing in it closes both portals and destroys a carried box, it stops shots, and the subject can't shoot from it */
export const FIZZLER_ELEMENT = defineElement<BlockableData>()({
  kind: 'fizzler',
  fileKey: 'fizzlers',
  count: 'many',
  sitsOn: 'floor',
  layer: 'fields',
  linkable: true,
  defaultBlocked: true,
  blocksWalking: 'never',
  blocksShots: 'whenBlocked',
  stopsShootingFrom: 'whenBlocked',
  takesPortals: false,
  reactsToSubject: true,
  events: [GameEvent.FIZZLED],
  hooks: {
    subjectInside: applyFizzlerRule,
    linkUnblocked: turnFizzlerOff,
    linkBlocked: turnFizzlerOn,
  },
})
