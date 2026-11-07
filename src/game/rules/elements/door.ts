import type {BlockableData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'

/** A door, which keeps the subject and shots out while closed */
export const DOOR_ELEMENT = defineElement<BlockableData>()({
  kind: 'door',
  fileKey: 'doors',
  count: 'many',
  sitsOn: 'floor',
  layer: 'blockers',
  linkable: true,
  defaultBlocked: true,
  blocksWalking: 'whenBlocked',
  blocksShots: 'whenBlocked',
  stopsShootingFrom: 'never',
  takesPortals: false,
  reactsToSubject: false,
  events: [
    GameEvent.DOOR_OPENED,
    GameEvent.DOOR_CLOSED,
  ],
})
