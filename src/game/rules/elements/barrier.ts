import type {BlockableData} from '@/game/chamber_data'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Lowers a barrier, when a link unblocks it.
 * @param draft - The step's state
 * @param index - The barrier's index in the chamber's barrier list
 */
function lowerBarrier(draft: StateDraft, index: number): void {
  draft.setBlocked('barrier', index, false)
}

/**
 * Raises a barrier, when a link blocks it, closing a portal on its tile: on
 * a wall tile it stops shots before they reach the wall.
 * @param draft - The step's state
 * @param index - The barrier's index in the chamber's barrier list
 */
function raiseBarrier(draft: StateDraft, index: number): void {
  const position = draft.chamber.positionOf('barrier', index)

  draft.setBlocked('barrier', index, true)
  draft.closePortalsAt(position.x, position.y)
}

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
  hooks: {
    linkUnblocked: lowerBarrier,
    linkBlocked: raiseBarrier,
  },
})
