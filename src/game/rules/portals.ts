import {DELTAS, Direction} from '@/game/direction'
import {PORTAL_COLORS, PortalColor} from '@/game/rules/portal_color'
import type {StateReader} from '@/game/rules/state_reader'

// Where a portal pair leads, read from a state's portal slots: shared by the
// step, which moves the subject through them, and the rays, which go through
// them too, so neither copies the other

/**
 * A tile the subject can come onto next, and how; or, for a ray, the tile it
 * goes on from and the way it travels.
 */
export type Arrival = {
  readonly x: number // Column
  readonly y: number // Row
  readonly direction: Direction // The way it faces on arriving
  readonly crossed: boolean // Whether it comes out of a portal
}

/** The way opposite each way */
export const OPPOSITES: Readonly<Record<Direction, Direction>> = {
  [Direction.UP]: Direction.DOWN,
  [Direction.DOWN]: Direction.UP,
  [Direction.LEFT]: Direction.RIGHT,
  [Direction.RIGHT]: Direction.LEFT,
}

/**
 * The portal a move into a wall enters: with both portals open, the one on
 * the wall's side facing the subject. Exported for the solver, like
 * allowsWay, so it skips moves into walls that can't change anything.
 * @param draft - The state, a step's draft or a settled state
 * @param wallX - Column of the wall
 * @param wallY - Row of the wall
 * @param direction - The way the subject walks
 * @returns The portal entered, or null when the move enters none
 */
export function portalEntrance(draft: StateReader, wallX: number, wallY: number, direction: Direction): PortalColor | null {
  if ((!draft.isPortalOpen(PortalColor.BLUE)) || (!draft.isPortalOpen(PortalColor.ORANGE))) {
    return null
  }

  const facingSide = OPPOSITES[direction]

  return PORTAL_COLORS.find((color) => (draft.portalX(color) === wallX) && (draft.portalY(color) === wallY) && (draft.portalSide(color) === facingSide)) ?? null
}

/**
 * Where walking into a wall comes out, when the wall holds a portal on its
 * side facing the subject (portalEntrance): in front of the other portal,
 * facing away from its wall. Whether the subject can arrive there isn't
 * checked. A ray goes on the same way.
 * @param draft - The state, a step's draft or a settled state
 * @param wallX - Column of the wall
 * @param wallY - Row of the wall
 * @param direction - The way the subject walks
 * @returns The tile and the way out, or null when the move enters no portal
 */
export function portalExit(draft: StateReader, wallX: number, wallY: number, direction: Direction): Arrival | null {
  const entrance = portalEntrance(draft, wallX, wallY, direction)

  if (entrance === null) {
    return null
  }

  const exit = (entrance === PortalColor.BLUE) ? PortalColor.ORANGE : PortalColor.BLUE
  const exitSide = draft.portalSide(exit)

  // Both portals are open, so this never returns
  if (exitSide === null) {
    return null
  }

  const delta = DELTAS[exitSide]

  return {
    x: draft.portalX(exit) + delta.dx,
    y: draft.portalY(exit) + delta.dy,
    direction: exitSide,
    crossed: true,
  }
}
