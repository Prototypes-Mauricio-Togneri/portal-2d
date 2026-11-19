import type {BeamData} from '@/game/chamber_data'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Turns a laser off, when a link unblocks it.
 * @param draft - The step's state
 * @param index - The laser's index in the chamber's laser list
 */
function turnLaserOff(draft: StateDraft, index: number): void {
  draft.setBlocked('laser', index, false)
}

/**
 * Turns a laser on, when a link blocks it.
 * @param draft - The step's state
 * @param index - The laser's index in the chamber's laser list
 */
function turnLaserOn(draft: StateDraft, index: number): void {
  draft.setBlocked('laser', index, true)
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
  reactsToSubject: false,
  continuesMovement: false,
  events: [],
  hooks: {
    linkUnblocked: turnLaserOff,
    linkBlocked: turnLaserOn,
  },
})
