import type {TriggerData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'

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
})
