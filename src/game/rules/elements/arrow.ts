import type {ArrowData} from '@/game/chamber_data'
import {defineElement} from '@/game/rules/element_definition'

/** A one-way floor tile: entered only moving its way, and while on it only its way acts; shots pass over it */
export const ARROW_ELEMENT = defineElement<ArrowData>()({
  kind: 'arrow',
  fileKey: 'arrows',
  count: 'many',
  sitsOn: 'floor',
  layer: 'floorMarks',
  linkable: false,
  defaultBlocked: null,
  blocksWalking: 'alongDirection',
  blocksShots: 'never',
  stopsShootingFrom: 'never',
  takesPortals: false,
  reactsToSubject: false,
  events: [],
})
