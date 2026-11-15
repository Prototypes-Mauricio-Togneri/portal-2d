import type {BlockedWallData} from '@/game/chamber_data'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Unblocks a blocked wall, when a link unblocks it, so it takes portals.
 * @param draft - The step's state
 * @param index - The blocked wall's index in the chamber's blocked wall list
 */
function unblockWall(draft: StateDraft, index: number): void {
  draft.setBlocked('blockedWall', index, false)
}

/**
 * Blocks a blocked wall, when a link blocks it, closing a portal on any of
 * its sides. Only a one-tile blocked wall can be linked, so its tile is the
 * whole wall.
 * @param draft - The step's state
 * @param index - The blocked wall's index in the chamber's blocked wall list
 */
function blockWall(draft: StateDraft, index: number): void {
  const position = draft.chamber.positionOf('blockedWall', index)

  draft.setBlocked('blockedWall', index, true)
  draft.closePortalsAt(position.x, position.y)
}

/** A blocked wall, a wall that refuses portals while blocked and takes them like any wall while not; it stops walking and shots by being a wall, which the step reads apart */
export const BLOCKED_WALL_ELEMENT = defineElement<BlockedWallData>()({
  kind: 'blockedWall',
  fileKey: 'blockedWalls',
  count: 'many',
  sitsOn: 'wall',
  layer: 'blockers',
  linkable: true,
  defaultBlocked: true,
  blocksWalking: 'always',
  blocksShots: 'always',
  stopsShootingFrom: 'never',
  takesPortals: 'whenUnblocked',
  reactsToSubject: false,
  events: [],
  hooks: {
    linkUnblocked: unblockWall,
    linkBlocked: blockWall,
  },
})
