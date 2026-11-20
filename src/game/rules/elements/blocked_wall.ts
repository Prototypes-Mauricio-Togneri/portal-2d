import type {BlockedWallData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Unblocks a blocked wall, when a link unblocks it, so it takes portals,
 * reporting it only if it switched.
 * @param draft - The step's state
 * @param index - The blocked wall's index in the chamber's blocked wall list
 */
function unblockWall(draft: StateDraft, index: number): void {
  if (draft.setBlocked('blockedWall', index, false)) {
    draft.emit(GameEvent.BLOCKED_WALL_SWITCHED)
  }
}

/**
 * Blocks a blocked wall, when a link blocks it, closing a portal on any of
 * its sides, reporting it only if it switched. Only a one-tile blocked wall
 * can be linked, so its tile is the whole wall.
 * @param draft - The step's state
 * @param index - The blocked wall's index in the chamber's blocked wall list
 */
function blockWall(draft: StateDraft, index: number): void {
  const position = draft.chamber.positionOf('blockedWall', index)

  if (draft.setBlocked('blockedWall', index, true)) {
    draft.emit(GameEvent.BLOCKED_WALL_SWITCHED)
  }

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
  blocksRays: 'never',
  reactsToSubject: false,
  continuesMovement: false,
  events: [GameEvent.BLOCKED_WALL_SWITCHED],
  hooks: {
    linkUnblocked: unblockWall,
    linkBlocked: blockWall,
  },
})
