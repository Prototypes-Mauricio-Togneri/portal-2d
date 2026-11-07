import type {ArrowData, BlockableData, BoxData, LaserData, SubjectData, TriggerData, WallData} from '@/game/chamber_data'

// Format 2 of a chamber file, for the v2 rules (stage 01). The chamber files
// stay in format 1 (ChamberData) until stage 01 switches over; then this
// becomes ChamberData. Imported JSON widens literals (2 becomes number, 'UP'
// becomes string), so every field is typed as the JSON import reads it and
// the validator checks the values

/**
 * A wall entry in format 2: one tile, or a rectangle of tiles, that may refuse
 * portals.
 */
export type WallDataV2 = WallData & {
  readonly takesPortals?: boolean // Whether portals can open on it; true when absent
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
 * How well a chamber can be solved, for medals. Left empty until stage 02's
 * solver fills it, so adding it later needs no new format version.
 */
export type ParData = {
  readonly moves?: number // Fewest tiles stepped onto
  readonly portals?: number // Fewest portals opened on a wall
}

/**
 * Shape of a chamber file in format 2. A list that is left out means the
 * chamber has none of that element. Never mutated by the game.
 */
export type ChamberDataV2 = {
  readonly version: number // The format's version, 2
  readonly size: {
    readonly width: number // In tiles
    readonly height: number // In tiles
  }
  readonly subject: SubjectData // Where the subject starts and which way it faces
  readonly exit: BlockableData // The way out
  readonly walls?: readonly WallDataV2[] // Wall tiles and rectangles
  readonly barriers?: readonly BlockableData[] // Barriers, which may sit on a wall tile
  readonly ditches?: readonly BlockableData[] // Ditches
  readonly boxes?: readonly BoxData[] // Boxes, at their start tiles
  readonly buttons?: readonly TriggerData[] // Buttons; their links name elements or groups
  readonly arrows?: readonly ArrowData[] // One-way floor tiles
  readonly fizzlers?: readonly BlockableData[] // Fizzlers
  readonly doors?: readonly BlockableData[] // Doors
  readonly switches?: readonly TriggerData[] // Switches; their links name elements or groups
  readonly lasers?: readonly LaserData[] // Lasers
  readonly groups?: readonly LinkGroupData[] // Link groups
  readonly par?: ParData // How well the chamber can be solved
}
