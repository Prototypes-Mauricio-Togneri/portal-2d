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
 * A wall entry: one tile when it has x and y, otherwise a rectangle of tiles.
 */
export type WallData = PositionData | WallRangeData

/**
 * An element a button or switch can open and close: barrier, ditch, door,
 * fizzler or exit.
 */
export type BlockableData = PositionData & {
  readonly id?: number // Target for button and switch links; absent or 0 means it cannot be linked
  readonly blocked?: boolean // Initial state; true when absent
}

/**
 * A box the subject can carry; a link to it puts it back where it started.
 */
export type BoxData = PositionData & {
  readonly id?: number // Target for button and switch links; absent or 0 means it cannot be linked
}

/**
 * A laser beam, drawn as a horizontal or vertical line.
 */
export type LaserData = BlockableData & {
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
  readonly links: readonly number[] // Ids of the linked elements
}

/**
 * Where the subject starts and which way it faces.
 */
export type SubjectData = PositionData & {
  readonly direction: string // 'UP', 'DOWN', 'LEFT' or 'RIGHT'
}

/**
 * Shape of a chamber JSON file. Never mutated by the game, so one object can
 * be loaded again to reset the chamber.
 */
export type ChamberData = {
  readonly size: {
    readonly width: number // In tiles
    readonly height: number // In tiles
  }
  readonly subject: SubjectData
  readonly exit: BlockableData
  readonly walls: readonly WallData[]
  readonly barriers: readonly BlockableData[]
  readonly ditches: readonly BlockableData[]
  readonly boxes: readonly BoxData[]
  readonly buttons: readonly TriggerData[]
  readonly arrows: readonly ArrowData[]
  readonly fizzlers: readonly BlockableData[]
  readonly doors: readonly BlockableData[]
  readonly switches: readonly TriggerData[]
  readonly lasers: readonly LaserData[]
}
