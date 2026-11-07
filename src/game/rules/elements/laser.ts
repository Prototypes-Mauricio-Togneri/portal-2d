import type {LaserData} from '@/game/chamber_data'
import {defineElement} from '@/game/rules/element_definition'

/** A laser beam the subject can't walk through while it is on; shots pass through it, and its direction only changes the drawing */
export const LASER_ELEMENT = defineElement<LaserData>()({
  kind: 'laser',
  fileKey: 'lasers',
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
