import type {SlideFloorData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'

/** A floor tile that keeps the subject moving: entering it, the subject slides on the same way until something stops it (the core step); it blocks nothing, and walking, shots and portals treat it as floor */
export const SLIDE_FLOOR_ELEMENT = defineElement<SlideFloorData>()({
  kind: 'slideFloor',
  fileKey: 'slideFloors',
  count: 'many',
  sitsOn: 'floor',
  layer: 'floor',
  linkable: false,
  defaultBlocked: null,
  blocksWalking: 'never',
  blocksShots: 'never',
  stopsShootingFrom: 'never',
  takesPortals: 'never',
  reactsToSubject: true,
  continuesMovement: true,
  events: [
    GameEvent.SLIDE_STARTED,
    GameEvent.SLIDE_STOPPED,
  ],
})
