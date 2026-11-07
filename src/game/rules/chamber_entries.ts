import type {PositionData} from '@/game/chamber_data'

/**
 * An element's entry in a chamber file, whatever its type, as the rules
 * read it.
 */
export type PlacedEntry = PositionData & {
  readonly id?: number // Target for links, when it has one
  readonly links?: readonly number[] // Ids it links, for a button or a switch
  readonly blocked?: boolean // Its blocked flag at the start, for an element that has one
  readonly direction?: string // Which way it points: UP, DOWN, LEFT or RIGHT for an arrow, H or V for a laser
}

/**
 * Reads an element type's field of a chamber file as a list: a list left out
 * is empty, and the exit, a single entry, is a list of one.
 * @param field - The field, as the chamber file holds it
 * @returns The entries, in file order
 */
export function listEntries(field: PlacedEntry | readonly PlacedEntry[] | undefined): readonly PlacedEntry[] {
  if (field === undefined) {
    return []
  }

  return ('x' in field) ? [field] : field
}
