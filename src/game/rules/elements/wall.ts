import type {WallDataV2} from '@/game/chamber_data_v2'
import {defineElement} from '@/game/rules/element_definition'

/** A solid wall tile, the only element a portal opens on, unless its entry refuses portals; walking into one holding a portal crosses it (the core step) */
export const WALL_ELEMENT = defineElement<WallDataV2>()({
  kind: 'wall',
  fileKey: 'walls',
  count: 'many',
  sitsOn: 'wall',
  layer: 'structure',
  linkable: false,
  defaultBlocked: null,
  blocksWalking: 'always',
  blocksShots: 'always',
  stopsShootingFrom: 'never',
  takesPortals: true,
  reactsToSubject: false,
  events: [],
})
