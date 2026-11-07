import type {TriggerData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Judges a button in every pass: held down while the subject or any box is
 * on its tile. Going down, it reports it and unblocks its links; coming up,
 * it reports it and blocks them.
 * @param draft - The step's state
 * @param index - The button's index in the chamber's button list
 */
function judgeButton(draft: StateDraft, index: number): void {
  const position = draft.chamber.positionOf('button', index)
  const held = draft.isSubjectAt(position.x, position.y) || draft.hasBoxAt(position.x, position.y)

  if (draft.setButtonPressed(index, held)) {
    draft.emit(held ? GameEvent.BUTTON_PRESSED : GameEvent.BUTTON_RELEASED)
    draft.applyLinks('button', index, held)
  }
}

/** A floor button, held down while the subject or a box is on it: going down unblocks its links (elements or link groups), coming up blocks them */
export const BUTTON_ELEMENT = defineElement<TriggerData>()({
  kind: 'button',
  fileKey: 'buttons',
  count: 'many',
  sitsOn: 'floor',
  layer: 'fixtures',
  linkable: false,
  defaultBlocked: null,
  blocksWalking: 'never',
  blocksShots: 'never',
  stopsShootingFrom: 'never',
  takesPortals: false,
  reactsToSubject: true,
  events: [
    GameEvent.BUTTON_PRESSED,
    GameEvent.BUTTON_RELEASED,
  ],
  hooks: {
    everyPass: judgeButton,
  },
})
