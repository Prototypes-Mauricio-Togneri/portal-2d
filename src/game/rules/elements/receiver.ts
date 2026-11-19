import type {ReceiverData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Judges a receiver in every pass, after the buttons: lit while a ray
 * reaches its listening face, the rays traced after every change made
 * before it, so two receivers that each open the other's door can't flip
 * together forever. Lighting, it reports it and unblocks its links; going
 * dark, it reports it and blocks them, as a button does going down and
 * coming up.
 * @param draft - The step's state
 * @param index - The receiver's index in the chamber's receiver list
 */
function judgeReceiver(draft: StateDraft, index: number): void {
  const lit = draft.rays.litReceivers[index] === true

  if (draft.setReceiverLit(index, lit)) {
    draft.emit(lit ? GameEvent.RECEIVER_LIT : GameEvent.RECEIVER_UNLIT)
    draft.applyLinks('receiver', index, lit)
  }
}

/** A receiver, a wall tile of its own lit while a ray reaches its listening face: lighting unblocks its links (elements or link groups), going dark blocks them, as a button held down and let go; it stops walking and shots by being a wall, which the step reads apart, and takes no portal on any face */
export const RECEIVER_ELEMENT = defineElement<ReceiverData>()({
  kind: 'receiver',
  fileKey: 'receivers',
  count: 'many',
  sitsOn: 'wall',
  layer: 'blockers',
  linkable: false,
  defaultBlocked: null,
  blocksWalking: 'always',
  blocksShots: 'always',
  stopsShootingFrom: 'never',
  takesPortals: 'never',
  blocksRays: 'never',
  reactsToSubject: false,
  continuesMovement: false,
  events: [
    GameEvent.RECEIVER_LIT,
    GameEvent.RECEIVER_UNLIT,
  ],
  hooks: {
    everyPass: judgeReceiver,
  },
})
