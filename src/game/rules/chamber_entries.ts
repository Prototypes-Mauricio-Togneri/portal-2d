import type {PositionData, WallRangeData} from '@/game/chamber_data'

/**
 * An element's entry in a chamber file, whatever its type, as the rules
 * read it. A rectangle of blocked walls is read as its lower left tile, with
 * its far corner.
 */
export type PlacedEntry = PositionData & {
  readonly id?: number // Target for links, when it has one
  readonly links?: readonly number[] // Ids it links, for a button or a switch
  readonly blocked?: boolean // Its blocked flag at the start, for an element that has one
  readonly direction?: string // Which way it points: UP, DOWN, LEFT or RIGHT for an arrow, H or V for a laser or a light barrier
  readonly xTo?: number // A rectangle's last column, both ends included; absent for one tile
  readonly yTo?: number // A rectangle's last row, both ends included; absent for one tile
}

/**
 * A rectangle entry of an element that can cover several tiles (a blocked
 * wall), as a chamber file holds it.
 */
type RectangleEntry = WallRangeData & {
  readonly blocked?: boolean // Its blocked flag at the start
}

/**
 * Reads an element type's field of a chamber file as a list: a list left out
 * is empty, the exit, a single entry, is a list of one, and a rectangle is
 * read as its lower left tile with its far corner.
 * @param field - The field, as the chamber file holds it
 * @returns The entries, in file order
 */
export function listEntries(field: PlacedEntry | readonly (PlacedEntry | RectangleEntry)[] | undefined): readonly PlacedEntry[] {
  if (field === undefined) {
    return []
  }

  if ('x' in field) {
    return [field]
  }

  return field.map((entry) => ('x' in entry) ? entry : {
    x: entry.xFrom,
    y: entry.yFrom,
    xTo: entry.xTo,
    yTo: entry.yTo,
    blocked: entry.blocked,
  })
}
