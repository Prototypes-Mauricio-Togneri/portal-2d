import type {BeamData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Turns a laser off, when a link unblocks it, reporting it only if it was on.
 * @param draft - The step's state
 * @param index - The laser's index in the chamber's laser list
 */
function turnLaserOff(draft: StateDraft, index: number): void {
  if (draft.setBlocked('laser', index, false)) {
    draft.emit(GameEvent.LASER_SWITCHED_OFF)
  }
}

/**
 * Turns a laser on, when a link blocks it, reporting it only if it was off.
 * @param draft - The step's state
 * @param index - The laser's index in the chamber's laser list
 */
function turnLaserOn(draft: StateDraft, index: number): void {
  if (draft.setBlocked('laser', index, true)) {
    draft.emit(GameEvent.LASER_SWITCHED_ON)
  }
}

/** A laser beam the subject can't walk through while it is on; shots pass through it, and its direction sets which way it is drawn and keeps portals off the wall at each end of its run, behind its end plate */
export const LASER_ELEMENT = defineElement<BeamData>()({
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
  takesPortals: 'never',
  blocksRays: 'never',
  reactsToSubject: false,
  continuesMovement: false,
  events: [
    GameEvent.LASER_SWITCHED_OFF,
    GameEvent.LASER_SWITCHED_ON,
  ],
  hooks: {
    linkUnblocked: turnLaserOff,
    linkBlocked: turnLaserOn,
  },
})
