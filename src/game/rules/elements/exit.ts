import type {BlockableData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'

/** The way out, one per chamber, which keeps the subject and shots out while closed; a step that ends with the subject on it completes the chamber */
export const EXIT_ELEMENT = defineElement<BlockableData>()({
  kind: 'exit',
  fileKey: 'exit',
  count: 'one',
  sitsOn: 'floor',
  layer: 'blockers',
  linkable: true,
  defaultBlocked: true,
  blocksWalking: 'whenBlocked',
  blocksShots: 'whenBlocked',
  stopsShootingFrom: 'never',
  takesPortals: false,
  reactsToSubject: true,
  events: [
    GameEvent.EXIT_OPENED,
    GameEvent.EXIT_CLOSED,
  ],
})
