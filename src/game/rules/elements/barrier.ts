import type {BlockableData} from '@/game/chamber_data'
import {defineElement} from '@/game/rules/element_definition'

/** A barrier, which keeps the subject and shots out while raised; on a wall tile it stops shots before the wall, so the wall takes a portal only while it is lowered */
export const BARRIER_ELEMENT = defineElement<BlockableData>()({
  kind: 'barrier',
  fileKey: 'barriers',
  count: 'many',
  sitsOn: 'floorOrWall',
  layer: 'blockers',
  linkable: true,
  defaultBlocked: true,
  blocksWalking: 'whenBlocked',
  blocksShots: 'whenBlocked',
  stopsShootingFrom: 'never',
  takesPortals: false,
  reactsToSubject: false,
  events: [],
})
