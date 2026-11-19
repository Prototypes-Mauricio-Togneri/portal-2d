import type {WallData} from '@/game/chamber_data'
import {defineElement} from '@/game/rules/element_definition'

/** A solid wall tile, which takes portals (a blocked wall takes them only while unblocked); walking into one holding a portal crosses it (the core step) */
export const WALL_ELEMENT = defineElement<WallData>()({
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
  takesPortals: 'always',
  reactsToSubject: false,
  continuesMovement: false,
  events: [],
})
