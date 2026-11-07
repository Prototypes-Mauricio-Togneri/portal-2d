import type {BoxData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'

/** A box the subject can carry, mainly to hold buttons down, listed at its start tile; it blocks nothing, and a link sends it back there */
export const BOX_ELEMENT = defineElement<BoxData>()({
  kind: 'box',
  fileKey: 'boxes',
  count: 'many',
  sitsOn: 'floor',
  layer: 'items',
  linkable: true,
  defaultBlocked: null,
  blocksWalking: 'never',
  blocksShots: 'never',
  stopsShootingFrom: 'never',
  takesPortals: false,
  reactsToSubject: false,
  events: [GameEvent.BOX_PICKED_UP],
})
