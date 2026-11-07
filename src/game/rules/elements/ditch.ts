import type {BlockableData} from '@/game/chamber_data'
import {defineElement} from '@/game/rules/element_definition'

/** A hole in the floor the subject can't cross while it is open; shots pass over it */
export const DITCH_ELEMENT = defineElement<BlockableData>()({
  kind: 'ditch',
  fileKey: 'ditches',
  count: 'many',
  sitsOn: 'floor',
  layer: 'blockers',
  linkable: true,
  defaultBlocked: true,
  blocksWalking: 'whenBlocked',
  blocksShots: 'never',
  stopsShootingFrom: 'never',
  takesPortals: false,
  reactsToSubject: false,
  events: [],
})
