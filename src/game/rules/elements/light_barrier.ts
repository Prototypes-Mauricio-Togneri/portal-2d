import type {BeamData} from '@/game/chamber_data'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Switches a light barrier off, when a link unblocks it.
 * @param draft - The step's state
 * @param index - The light barrier's index in the chamber's light barrier list
 */
function switchLightBarrierOff(draft: StateDraft, index: number): void {
  draft.setBlocked('lightBarrier', index, false)
}

/**
 * Switches a light barrier on, when a link blocks it. It stands on a floor
 * tile, which never holds a portal, so there is no portal to close.
 * @param draft - The step's state
 * @param index - The light barrier's index in the chamber's light barrier list
 */
function switchLightBarrierOn(draft: StateDraft, index: number): void {
  draft.setBlocked('lightBarrier', index, true)
}

/** A field of light on a floor tile, which keeps the subject and shots out while it is on; its direction only changes the drawing */
export const LIGHT_BARRIER_ELEMENT = defineElement<BeamData>()({
  kind: 'lightBarrier',
  fileKey: 'lightBarriers',
  count: 'many',
  sitsOn: 'floor',
  layer: 'blockers',
  linkable: true,
  defaultBlocked: true,
  blocksWalking: 'whenBlocked',
  blocksShots: 'whenBlocked',
  stopsShootingFrom: 'never',
  takesPortals: 'never',
  reactsToSubject: false,
  events: [],
  hooks: {
    linkUnblocked: switchLightBarrierOff,
    linkBlocked: switchLightBarrierOn,
  },
})
