import type {BlockableData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'

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
})
