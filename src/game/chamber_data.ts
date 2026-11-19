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
 * A rectangle of tiles (walls, blocked walls or slide floors), both ends
 * inclusive.
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
 * A slide floor entry, floor that keeps the subject moving: one tile when it
 * has x and y, otherwise a rectangle of tiles.
 */
export type SlideFloorData = PositionData | WallRangeData

/**
 * A blocked wall entry, a wall that refuses portals while blocked: one tile
 * when it has x and y, which a button or switch can link, otherwise a
 * rectangle of tiles, which none can.
 */
export type BlockedWallData = (PositionData & {
  readonly id?: number // Target for button, switch and receiver links; absent means it cannot be linked
  readonly blocked?: boolean // Initial state; true when absent
}) | (WallRangeData & {
  readonly blocked?: boolean // Initial state; true when absent
})

/**
 * An element a button or switch can open and close: ditch, door, fizzler or
 * exit. An arrow, which a link turns, has its own entry type.
 */
export type BlockableData = PositionData & {
  readonly id?: number // Target for button, switch and receiver links; absent means it cannot be linked
  readonly blocked?: boolean // Initial state; true when absent
}

/**
 * A box the subject can carry; a link to it puts it back where it started.
 * With a mirror, it turns an emitter's ray a quarter turn while it rests.
 */
export type BoxData = PositionData & {
  readonly id?: number // Target for button, switch and receiver links; absent means it cannot be linked
  readonly mirror?: string // '/' or '\\': the mirror it holds from corner to corner, fixed wherever it goes; absent for a plain box
}

/**
 * A laser or a light barrier: a beam of light running horizontally or
 * vertically, which a button or switch can turn on and off.
 */
export type BeamData = BlockableData & {
  readonly direction: string // 'H' or 'V'
}

/**
 * A one-way floor tile. With an id and a turned way, given together, a
 * button or switch can turn it between its way and its turned way.
 */
export type ArrowData = PositionData & {
  readonly direction: string // 'UP', 'DOWN', 'LEFT' or 'RIGHT': the way it points while blocked, as it starts
  readonly id?: number // Target for button, switch and receiver links; absent means it cannot be linked
  readonly turnedDirection?: string // 'UP', 'DOWN', 'LEFT' or 'RIGHT': the way it points while a link holds it turned; given with id
}

/**
 * An emitter: a wall tile of its own that sends a ray from one face onto
 * the floor while it is on, which a link switches on and off.
 */
export type EmitterData = PositionData & {
  readonly direction: string // 'UP', 'DOWN', 'LEFT' or 'RIGHT': the face it fires from
  readonly id?: number // Target for button, switch and receiver links; absent means it cannot be linked
  readonly blocked?: boolean // Initial state, blocked meaning off; false when absent, so it starts on
}

/**
 * A receiver: a wall tile of its own, lit while a ray reaches its listening
 * face, which acts on its links as a button held down does while it is lit.
 */
export type ReceiverData = PositionData & {
  readonly direction: string // 'UP', 'DOWN', 'LEFT' or 'RIGHT': the face it listens on
  readonly links: readonly number[] // Ids of the linked elements and link groups
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
 * An antline: a dotted line on the floor from a button, switch or receiver
 * to one element it links, drawn only, lit while that element is unblocked.
 * Its path runs straight along rows and columns from corner to corner, from
 * the button's, switch's or receiver's tile to the element's.
 */
export type AntlineData = {
  readonly link: number // Id of the element it leads to, never a group's
  readonly path: readonly PositionData[] // Its corner tiles, from the button, switch or receiver to the element, at least two
}

/**
 * How well a chamber can be solved, for medals. Reserved: nothing writes it
 * yet (docs/solver.md), and having it already means filling it later needs
 * no new format version.
 */
export type ParData = {
  readonly moves?: number // Fewest steps that put the subject on another tile
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
  readonly antlines?: readonly AntlineData[] // Drawn only: dotted lines from buttons, switches and receivers to elements they link
  readonly par?: ParData // How well the chamber can be solved
} & ChamberElementFields
