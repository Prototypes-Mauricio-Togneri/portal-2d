import type {PositionData} from '@/game/chamber_data'
import type {ChamberDataV2, WallDataV2} from '@/game/chamber_data_v2'
import {ELEMENT_REGISTRY, type ElementKind} from '@/game/rules/element_registry'

/**
 * An element type the compiled chamber finds by tile: every type in the
 * registry but walls, which have flags of their own, and boxes, which move
 * (where they are is state).
 */
export type PlacedKind = Exclude<ElementKind, 'wall' | 'box'>

/**
 * An element type a button or switch link can name.
 */
export type LinkableKind = Extract<(typeof ELEMENT_REGISTRY)[number], {readonly linkable: true}>['kind']

/**
 * An element a link reaches.
 */
export type LinkTarget = {
  readonly kind: LinkableKind // Its type
  readonly index: number // Its index in that type's list in the chamber file; 0 for the exit
}

/**
 * An element's entry in a chamber file, whatever its type, as the compiled
 * chamber reads it.
 */
type PlacedEntry = PositionData & {
  readonly id?: number // Target for links, when it has one
  readonly links?: readonly number[] // Ids it links, for a button or a switch
}

/**
 * Where the elements of one type are.
 */
type TileIndex = {
  readonly first: Int32Array // The first element of the type on each cell, in list order, or NO_ELEMENT
  readonly next: Int32Array // For each element, the next one of the type on its cell, or NO_ELEMENT
}

/**
 * What the link ids of a chamber name.
 */
type LinkIds = {
  readonly elements: ReadonlyMap<number, LinkTarget> // The element each id names
  readonly groups: ReadonlyMap<number, readonly number[]> // The element ids each group id stands for
}

/** What a lookup answers when a tile has no element of the type, or is outside the chamber */
export const NO_ELEMENT = -1

/** What cellOf answers outside the chamber */
const OUTSIDE = -1

/** The links of an element that has none */
const NO_LINKS: readonly LinkTarget[] = []

/**
 * Reads an element type's field of a chamber file as a list: a list left out
 * is empty, and the exit, a single entry, is a list of one.
 * @param field - The field, as the chamber file holds it
 * @returns The entries, in file order
 */
function listEntries(field: PlacedEntry | readonly PlacedEntry[] | undefined): readonly PlacedEntry[] {
  if (field === undefined) {
    return []
  }

  return ('x' in field) ? [field] : field
}

/**
 * Notes what each link id names: the linkable elements' ids, in registry
 * order, then the groups'. An id used twice, which the validator rejects,
 * names the first one.
 * @param data - The chamber
 * @returns The elements and the groups, by id
 */
function collectLinkIds(data: ChamberDataV2): LinkIds {
  const elements = new Map<number, LinkTarget>()
  const groups = new Map<number, readonly number[]>()

  for (const definition of ELEMENT_REGISTRY) {
    if (!definition.linkable) {
      continue
    }

    listEntries(data[definition.fileKey]).forEach((entry, index) => {
      if ((entry.id !== undefined) && (!elements.has(entry.id))) {
        elements.set(entry.id, {
          kind: definition.kind,
          index: index,
        })
      }
    })
  }

  for (const group of data.groups ?? []) {
    if ((!elements.has(group.id)) && (!groups.has(group.id))) {
      groups.set(group.id, group.links)
    }
  }

  return {
    elements: elements,
    groups: groups,
  }
}

/**
 * Turns a button's or switch's link ids into the elements they reach, in
 * order: a group's elements take its place, in the group's order. An id that
 * names nothing, and a group's id naming another group, both of which the
 * validator rejects, reach nothing.
 * @param ids - The link ids, as the chamber file lists them
 * @param linkIds - What each id names
 * @returns The elements reached, a repeated one as often as it is named
 */
function resolveLinks(ids: readonly number[], linkIds: LinkIds): readonly LinkTarget[] {
  const result: LinkTarget[] = []

  for (const id of ids) {
    const element = linkIds.elements.get(id)

    if (element !== undefined) {
      result.push(element)
      continue
    }

    for (const member of linkIds.groups.get(id) ?? []) {
      const memberElement = linkIds.elements.get(member)

      if (memberElement !== undefined) {
        result.push(memberElement)
      }
    }
  }

  return (result.length > 0) ? result : NO_LINKS
}

/**
 * The fixed part of a chamber, built once per load for the v2 rules: its
 * size, its walls and which of them take portals, where each element is,
 * what each link reaches and where each box starts. Every lookup takes the
 * same time whatever the chamber's size. Outside the chamber's edge is wall
 * that takes no portals, with no element on it. Built from a chamber whose
 * fields have been read (readChamber), even one the validator rejects.
 */
export class CompiledChamber {
  readonly width: number // In tiles
  readonly height: number // In tiles
  readonly boxStarts: readonly PositionData[] // Each box's start tile, in list order
  private readonly walls: Uint8Array // 1 on each cell holding a wall
  private readonly portalWalls: Uint8Array // 1 on each cell holding a wall that takes portals
  private readonly tileIndexes = new Map<PlacedKind, TileIndex>() // Where each type's elements are
  private readonly links = new Map<PlacedKind, readonly (readonly LinkTarget[])[]>() // What each element's links reach, by type, then index

  /**
   * @param data - The chamber, its fields already read; it is only read
   */
  constructor(data: ChamberDataV2) {
    this.width = data.size.width
    this.height = data.size.height
    this.boxStarts = data.boxes ?? []
    this.walls = new Uint8Array(this.width * this.height)
    this.portalWalls = new Uint8Array(this.width * this.height)

    this.placeWalls(data.walls ?? [])

    const linkIds = collectLinkIds(data)

    for (const definition of ELEMENT_REGISTRY) {
      if ((definition.kind === 'wall') || (definition.kind === 'box')) {
        continue
      }

      const entries = listEntries(data[definition.fileKey])

      this.tileIndexes.set(definition.kind, this.indexTiles(entries))
      this.links.set(definition.kind, entries.map((entry) => resolveLinks(entry.links ?? [], linkIds)))
    }
  }

  /**
   * The cell of a tile, its index in the per-cell arrays.
   * @param x - Column
   * @param y - Row
   * @returns The cell, or OUTSIDE outside the chamber
   */
  private cellOf(x: number, y: number): number {
    if ((x < 0) || (y < 0) || (x >= this.width) || (y >= this.height)) {
      return OUTSIDE
    }

    return (y * this.width) + x
  }

  /**
   * Marks the wall tiles, and those that take portals. Only the part of a
   * wall entry inside the chamber is marked.
   * @param walls - The wall entries: single tiles or inclusive rectangles
   */
  private placeWalls(walls: readonly WallDataV2[]): void {
    for (const wall of walls) {
      const xFrom = ('x' in wall) ? wall.x : wall.xFrom
      const xTo = ('x' in wall) ? wall.x : wall.xTo
      const yFrom = ('y' in wall) ? wall.y : wall.yFrom
      const yTo = ('y' in wall) ? wall.y : wall.yTo
      const takesPortals = (wall.takesPortals ?? true) ? 1 : 0

      for (let y = Math.max(yFrom, 0); y <= Math.min(yTo, this.height - 1); y++) {
        for (let x = Math.max(xFrom, 0); x <= Math.min(xTo, this.width - 1); x++) {
          const cell = this.cellOf(x, y)

          this.walls[cell] = 1
          this.portalWalls[cell] = takesPortals
        }
      }
    }
  }

  /**
   * Indexes one element type by cell. The elements on a cell are chained in
   * list order, so a tile can hold more than one (two crossing lasers). An
   * element outside the chamber keeps its index but sits on no cell.
   * @param entries - The type's entries, in file order
   * @returns The type's index
   */
  private indexTiles(entries: readonly PlacedEntry[]): TileIndex {
    const cells = this.width * this.height
    const first = new Int32Array(cells).fill(NO_ELEMENT)
    const next = new Int32Array(entries.length).fill(NO_ELEMENT)
    const last = new Int32Array(cells).fill(NO_ELEMENT)

    entries.forEach((entry, index) => {
      const cell = this.cellOf(entry.x, entry.y)

      if (cell === OUTSIDE) {
        return
      }

      const previous = last[cell] ?? NO_ELEMENT

      if (previous === NO_ELEMENT) {
        first[cell] = index
      } else {
        next[previous] = index
      }

      last[cell] = index
    })

    return {
      first: first,
      next: next,
    }
  }

  /**
   * The index of one element type.
   * @param kind - The element type
   * @returns Its index
   * @throws Error for a type the registry doesn't hold, which the types rule out
   */
  private tileIndex(kind: PlacedKind): TileIndex {
    const index = this.tileIndexes.get(kind)

    if (index === undefined) {
      throw new Error(`no element type ${kind} in the registry`)
    }

    return index
  }

  /**
   * Whether a tile holds a wall. Outside the chamber is wall.
   * @param x - Column
   * @param y - Row
   * @returns True on a wall tile and outside the chamber
   */
  isWall(x: number, y: number): boolean {
    const cell = this.cellOf(x, y)

    return (cell === OUTSIDE) || (this.walls[cell] === 1)
  }

  /**
   * Whether a tile holds a wall a portal can open on, as the chamber file
   * says. A barrier raised on it stops shots, but that is the step's to judge.
   * @param x - Column
   * @param y - Row
   * @returns True on a wall that takes portals; false elsewhere, outside the chamber included
   */
  takesPortals(x: number, y: number): boolean {
    const cell = this.cellOf(x, y)

    return (cell !== OUTSIDE) && (this.portalWalls[cell] === 1)
  }

  /**
   * The first element of a type on a tile, in list order.
   * @param kind - The element type
   * @param x - Column
   * @param y - Row
   * @returns Its index in the type's list, or NO_ELEMENT when the tile has none or is outside the chamber
   */
  elementAt(kind: PlacedKind, x: number, y: number): number {
    const cell = this.cellOf(x, y)

    if (cell === OUTSIDE) {
      return NO_ELEMENT
    }

    return this.tileIndex(kind).first[cell] ?? NO_ELEMENT
  }

  /**
   * The next element of the same type on an element's tile, in list order,
   * such as the second of two crossing lasers.
   * @param kind - The element type
   * @param index - The element's index in the type's list
   * @returns The next one's index, or NO_ELEMENT when it is the last on its tile
   */
  nextOnTile(kind: PlacedKind, index: number): number {
    return this.tileIndex(kind).next[index] ?? NO_ELEMENT
  }

  /**
   * What an element's links reach, groups expanded, in order.
   * @param kind - The element type, a button or a switch for any link
   * @param index - The element's index in the type's list
   * @returns The elements reached; empty for an element without links
   */
  linksOf(kind: PlacedKind, index: number): readonly LinkTarget[] {
    return this.links.get(kind)?.[index] ?? NO_LINKS
  }
}
