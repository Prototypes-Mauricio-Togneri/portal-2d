import type {ChamberElementFields} from '@/game/rules/element_registry'

// Format 2 of a chamber file. Imported JSON widens literals (2 becomes
// number, 'UP' becomes string), so every field is typed as the JSON import
// reads it and the validator checks the values. The element fields come from
// the element registry (src/game/rules/element_registry.ts), each typed by
// its element definition

/**
 * A single tile of the chamber, in chamber coordinates: x grows to the right
 * and y grows upwards from the bottom row.
 */
export type PositionData = {
  readonly x: number
  readonly y: number
}

/**
 * A rectangle of wall tiles, both ends inclusive.
 */
export type WallRangeData = {
  readonly xFrom: number
  readonly xTo: number
  readonly yFrom: number
  readonly yTo: number
}

/**
 * A wall entry, which takes portals: one tile when it has x and y, otherwise
 * a rectangle of tiles.
 */
export type WallData = PositionData | WallRangeData

/**
 * A blocked wall entry, a wall that refuses portals while blocked: one tile
 * when it has x and y, which a button or switch can link, otherwise a
 * rectangle of tiles, which none can.
 */
export type BlockedWallData = (PositionData & {
  readonly id?: number // Target for button and switch links; absent means it cannot be linked
  readonly blocked?: boolean // Initial state; true when absent
}) | (WallRangeData & {
  readonly blocked?: boolean // Initial state; true when absent
})

/**
 * An element a button or switch can open and close: ditch, door, fizzler or
 * exit.
 */
export type BlockableData = PositionData & {
  readonly id?: number // Target for button and switch links; absent means it cannot be linked
  readonly blocked?: boolean // Initial state; true when absent
}

/**
 * A box the subject can carry; a link to it puts it back where it started.
 */
export type BoxData = PositionData & {
  readonly id?: number // Target for button and switch links; absent means it cannot be linked
}

/**
 * A laser or a light barrier: a beam of light running horizontally or
 * vertically, which a button or switch can turn on and off.
 */
export type BeamData = BlockableData & {
  readonly direction: string // 'H' or 'V'
}

/**
 * A one-way floor tile.
 */
export type ArrowData = PositionData & {
  readonly direction: string // 'UP', 'DOWN', 'LEFT' or 'RIGHT'
}

/**
 * A button or switch, with the ids of the elements it opens and closes.
 */
export type TriggerData = PositionData & {
  readonly links: readonly number[] // Ids of the linked elements and link groups
}

/**
 * Where the subject starts and which way it faces.
 */
export type SubjectData = PositionData & {
  readonly direction: string // 'UP', 'DOWN', 'LEFT' or 'RIGHT'
}

/**
 * A set of link targets defined once and linked as a whole. Its id comes from
 * the same pool as element ids, so a button or switch names it in its links
 * like an element. It holds element ids only, never another group's.
 */
export type LinkGroupData = {
  readonly id: number // Target for button and switch links; unique among element and group ids
  readonly links: readonly number[] // Ids of the elements it stands for
}

/**
 * An antline: a dotted line on the floor from a button or switch to one
 * element it links, drawn only, lit while that element is unblocked. Its path
 * runs straight along rows and columns from corner to corner, from the
 * button's or switch's tile to the element's.
 */
export type AntlineData = {
  readonly link: number // Id of the element it leads to, never a group's
  readonly path: readonly PositionData[] // Its corner tiles, from the button or switch to the element, at least two
}

/**
 * How well a chamber can be solved, for medals. Reserved: nothing writes it
 * yet (docs/solver.md), and having it already means filling it later needs
 * no new format version.
 */
export type ParData = {
  readonly moves?: number // Fewest tiles stepped onto
  readonly portals?: number // Fewest portals opened on a wall
}

/**
 * Shape of a chamber file: the version, the size, the subject, the link
 * groups, the antlines and the par block, then one field per element type in
 * the registry (the exit, and a list for each other type). A list that is
 * left out means the chamber has none of that element. Never mutated by the
 * game, so one object can be loaded again to reset the chamber.
 */
export type ChamberData = {
  readonly version: number // The format's version, 2
  readonly size: {
    readonly width: number // In tiles
    readonly height: number // In tiles
  }
  readonly subject: SubjectData // Where the subject starts and which way it faces
  readonly groups?: readonly LinkGroupData[] // Link groups
  readonly antlines?: readonly AntlineData[] // Drawn only: dotted lines from buttons and switches to elements they link
  readonly par?: ParData // How well the chamber can be solved
} & ChamberElementFields
