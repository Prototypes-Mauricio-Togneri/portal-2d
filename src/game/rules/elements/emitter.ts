import type {EmitterData} from '@/game/chamber_data'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Switches an emitter on, when a link unblocks it: a button goes down, a
 * switch is used or a receiver lights.
 * @param draft - The step's state
 * @param index - The emitter's index in the chamber's emitter list
 */
function switchEmitterOn(draft: StateDraft, index: number): void {
  draft.setBlocked('emitter', index, false)
}

/**
 * Switches an emitter off, when a link blocks it: a button comes up or a
 * receiver goes dark.
 * @param draft - The step's state
 * @param index - The emitter's index in the chamber's emitter list
 */
function switchEmitterOff(draft: StateDraft, index: number): void {
  draft.setBlocked('emitter', index, true)
}

/** An emitter, a wall tile of its own that sends a ray from its firing face while it is on (blocked means off, and it starts on unless its file says otherwise); it stops walking and shots by being a wall, which the step reads apart, and takes no portal on any face */
export const EMITTER_ELEMENT = defineElement<EmitterData>()({
  kind: 'emitter',
  fileKey: 'emitters',
  count: 'many',
  sitsOn: 'wall',
  layer: 'blockers',
  linkable: true,
  defaultBlocked: false,
  blocksWalking: 'always',
  blocksShots: 'always',
  stopsShootingFrom: 'never',
  takesPortals: 'never',
  blocksRays: 'never',
  reactsToSubject: false,
  continuesMovement: false,
  events: [],
  hooks: {
    linkUnblocked: switchEmitterOn,
    linkBlocked: switchEmitterOff,
  },
})
