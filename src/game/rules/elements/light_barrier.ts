import type {BeamData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Switches a light barrier off, when a link unblocks it, reporting it only if
 * it was on.
 * @param draft - The step's state
 * @param index - The light barrier's index in the chamber's light barrier list
 */
function switchLightBarrierOff(draft: StateDraft, index: number): void {
  if (draft.setBlocked('lightBarrier', index, false)) {
    draft.emit(GameEvent.LIGHT_BARRIER_SWITCHED_OFF)
  }
}

/**
 * Switches a light barrier on, when a link blocks it, reporting it only if it
 * was off. It stands on a floor tile, which never holds a portal, so there is
 * no portal to close.
 * @param draft - The step's state
 * @param index - The light barrier's index in the chamber's light barrier list
 */
function switchLightBarrierOn(draft: StateDraft, index: number): void {
  if (draft.setBlocked('lightBarrier', index, true)) {
    draft.emit(GameEvent.LIGHT_BARRIER_SWITCHED_ON)
  }
}

/** A field of light on a floor tile, which keeps the subject and shots out while it is on; its direction sets which way it is drawn and keeps portals off the wall at each end of its run, behind its end plate */
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
  blocksRays: 'whenBlocked',
  reactsToSubject: false,
  continuesMovement: false,
  events: [
    GameEvent.LIGHT_BARRIER_SWITCHED_OFF,
    GameEvent.LIGHT_BARRIER_SWITCHED_ON,
  ],
  hooks: {
    linkUnblocked: switchLightBarrierOff,
    linkBlocked: switchLightBarrierOn,
  },
})
