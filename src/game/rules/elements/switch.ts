import type {TriggerData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'

/** A switch on the floor, used with the interact key: every use unblocks its links (elements or link groups), and nothing blocks them again */
export const SWITCH_ELEMENT = defineElement<TriggerData>()({
  kind: 'switch',
  fileKey: 'switches',
  count: 'many',
  sitsOn: 'floor',
  layer: 'fixtures',
  linkable: false,
  defaultBlocked: null,
  blocksWalking: 'never',
  blocksShots: 'never',
  stopsShootingFrom: 'never',
  takesPortals: false,
  reactsToSubject: false,
  events: [GameEvent.SWITCH_USED],
})
