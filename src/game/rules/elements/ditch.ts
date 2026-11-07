import type {BlockableData} from '@/game/chamber_data'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Bridges a ditch, when a link unblocks it.
 * @param draft - The step's state
 * @param index - The ditch's index in the chamber's ditch list
 */
function bridgeDitch(draft: StateDraft, index: number): void {
  draft.setBlocked('ditch', index, false)
}

/**
 * Opens a ditch, when a link blocks it.
 * @param draft - The step's state
 * @param index - The ditch's index in the chamber's ditch list
 */
function openDitch(draft: StateDraft, index: number): void {
  draft.setBlocked('ditch', index, true)
}

/** A hole in the floor the subject can't cross while it is open; shots pass over it */
export const DITCH_ELEMENT = defineElement<BlockableData>()({
  kind: 'ditch',
  fileKey: 'ditches',
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
  hooks: {
    linkUnblocked: bridgeDitch,
    linkBlocked: openDitch,
  },
})
