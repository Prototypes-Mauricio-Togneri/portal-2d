import type {ChamberData, PositionData, WallData} from '@/game/chamber_data'
import {DELTAS, Direction, parseDirection} from '@/game/direction'
import {listEntries, type PlacedEntry} from '@/game/rules/chamber_entries'
import {ELEMENT_REGISTRY, type ElementKind} from '@/game/rules/element_registry'
import {NOT_STORED, StateLayout} from '@/game/rules/state_layout'

/**
 * An element type the compiled chamber finds by tile: every type in the
 * registry but walls, which have flags of their own, and boxes, which move
 * (where they are is state). A blocked wall is found on every tile of its
 * entry.
 */
export type PlacedKind = Exclude<ElementKind, 'wall' | 'box'>

/**
 * The element types drawn as a beam running one way, which neighbours of the
 * same type running the same way continue, with an end plate at each end of
 * each run.
 */
export type BeamKind = 'laser' | 'lightBarrier'

/**
 * Which way a laser or a light barrier runs: H for horizontal, V for vertical.
 */
export type BeamOrientation = 'H' | 'V'

/**
 * The mirror a box holds from corner to corner, seen with rows growing
 * upwards: '/' from bottom left to top right, '\\' from top left to bottom
 * right.
 */
export type Mirror = '/' | '\\'

/**
 * An element type a button, switch or receiver link can name.
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
 * An antline as the game draws it: the element it leads to, whose blocked
 * flag lights it, and its corner tiles.
 */
export type CompiledAntline = {
  readonly target: LinkTarget // The element it leads to
  readonly path: readonly PositionData[] // Its corner tiles, from the button or switch to the element
}

/**
 * Where the subject starts, and which way it faces.
 */
export type SubjectStart = {
  readonly x: number // Column
  readonly y: number // Row
  readonly facing: Direction // Which way it faces
}

/**
 * Where the elements of one type are.
 */
type TileIndex = {
  readonly first: Int32Array // The first element of the type on each cell, in list order, or NO_ELEMENT
  readonly next: Int32Array // For each element on one tile, the next one of the type on its cell, or NO_ELEMENT
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

/** The way a laser or a light barrier runs when a wall on each side of its tile ends its run, behind its end plate */
const BEAM_ALONG_SIDE: Readonly<Record<Direction, BeamOrientation>> = {
  [Direction.UP]: 'V',
  [Direction.DOWN]: 'V',
  [Direction.LEFT]: 'H',
  [Direction.RIGHT]: 'H',
}

/** The links of an element that has none */
const NO_LINKS: readonly LinkTarget[] = []

/** The element types that are wall tiles of their own and take no portal on any face: emitters and receivers */
const DEVICE_KINDS = [
  'emitter',
  'receiver',
] as const

/**
 * Reads a box's mirror.
 * @param text - The box's mirror, when it has one
 * @returns The mirror, or null for a plain box
 */
function readMirror(text: string | undefined): Mirror | null {
  return ((text === '/') || (text === '\\')) ? text : null
}

/**
 * Reads an entry's direction when it is one of the four ways an arrow or the
 * subject can point.
 * @param text - The entry's direction, when it has one
 * @returns The direction, or null for none, or for a laser's or a light barrier's H or V
 */
function readDirection(text: string | undefined): Direction | null {
  if ((text === Direction.UP) || (text === Direction.DOWN) || (text === Direction.LEFT) || (text === Direction.RIGHT)) {
    return text
  }

  return null
}

/**
 * Notes what each link id names: the linkable elements' ids, in registry
 * order, then the groups'. An id used twice, which the validator rejects,
 * names the first one.
 * @param data - The chamber
 * @returns The elements and the groups, by id
 */
function collectLinkIds(data: ChamberData): LinkIds {
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
 * The fixed part of a chamber, built once per load: its
 * size, its walls and which of them can take portals, where each element is and
 * which way it points, what each link reaches, where the subject and each
 * box start and which boxes hold a mirror, how its state is laid out, and
 * its antlines, for the drawing.
 * Every lookup takes the
 * same time whatever the chamber's size. Outside the chamber's edge is wall
 * that takes no portals, with no element on it. Built from a chamber whose
 * fields have been read (readChamber), even one the validator rejects.
 */
export class CompiledChamber {
  readonly width: number // In tiles
  readonly height: number // In tiles
  readonly boxStarts: readonly PositionData[] // Each box's start tile, in list order
  readonly subjectStart: SubjectStart // Where the subject starts
  readonly stateLayout: StateLayout // How this chamber's state is laid out
  readonly antlines: readonly CompiledAntline[] // The antlines, which are only drawn; one leading to no element, which the validator rejects, is left out
  private readonly walls: Uint8Array // 1 on each cell holding a wall, blocked walls, emitters and receivers included
  private readonly portalWalls: Uint8Array // 1 on each cell holding a wall that can take portals: a wall, or a blocked wall a link reaches or that starts unblocked
  private readonly mirrors: readonly (Mirror | null)[] // Each box's mirror, or null for a plain box, in list order
  private readonly tileIndexes = new Map<PlacedKind, TileIndex>() // Where each type's elements are
  private readonly entries = new Map<PlacedKind, readonly PlacedEntry[]>() // Each type's entries, in list order
  private readonly directions = new Map<PlacedKind, readonly (Direction | null)[]>() // Which way each element points, by type, then index
  private readonly turnedDirections = new Map<PlacedKind, readonly (Direction | null)[]>() // Which way each arrow a link can turn points while unblocked, by type, then index
  private readonly links = new Map<PlacedKind, readonly (readonly LinkTarget[])[]>() // What each element's links reach, by type, then index

  /**
   * @param data - The chamber, its fields already read; it is only read
   * @throws Error when the chamber is too large for a state's numbers
   */
  constructor(data: ChamberData) {
    this.width = data.size.width
    this.height = data.size.height
    this.boxStarts = data.boxes ?? []
    this.mirrors = (data.boxes ?? []).map((box) => readMirror(box.mirror))
    this.subjectStart = {
      x: data.subject.x,
      y: data.subject.y,
      facing: parseDirection(data.subject.direction),
    }
    this.walls = new Uint8Array(this.width * this.height)
    this.portalWalls = new Uint8Array(this.width * this.height)

    this.placeWalls(data.walls ?? [])

    const linkIds = collectLinkIds(data)

    for (const definition of ELEMENT_REGISTRY) {
      if ((definition.kind === 'wall') || (definition.kind === 'box')) {
        continue
      }

      const entries = listEntries(data[definition.fileKey])

      this.entries.set(definition.kind, entries)
      this.directions.set(definition.kind, entries.map((entry) => readDirection(entry.direction)))
      this.turnedDirections.set(definition.kind, entries.map((entry) => readDirection(entry.turnedDirection)))
      this.tileIndexes.set(definition.kind, this.indexTiles(entries))
      this.links.set(definition.kind, entries.map((entry) => resolveLinks(entry.links ?? [], linkIds)))
    }

    this.antlines = (data.antlines ?? []).flatMap((antline) => {
      const target = linkIds.elements.get(antline.link)

      return (target === undefined) ? [] : [
        {
          target: target,
          path: antline.path,
        },
      ]
    })

    const linked: LinkTarget[] = []

    this.links.forEach((byElement) => {
      for (const targets of byElement) {
        linked.push(...targets)
      }
    })

    this.stateLayout = new StateLayout(data, linked)
    this.placeBlockedWalls()
    this.placeDevices()
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
   * Calls back for each cell of an entry's tiles inside the chamber: one
   * tile, or each tile of a rectangle (a blocked wall's).
   * @param entry - The entry
   * @param visit - Called with each cell
   */
  private forEachCell(entry: PlacedEntry, visit: (cell: number) => void): void {
    for (let y = Math.max(entry.y, 0); y <= Math.min(entry.yTo ?? entry.y, this.height - 1); y++) {
      for (let x = Math.max(entry.x, 0); x <= Math.min(entry.xTo ?? entry.x, this.width - 1); x++) {
        visit(this.cellOf(x, y))
      }
    }
  }

  /**
   * Marks the wall tiles, all of which take portals. Only the part of a
   * wall entry inside the chamber is marked.
   * @param walls - The wall entries: single tiles or inclusive rectangles
   */
  private placeWalls(walls: readonly WallData[]): void {
    for (const wall of walls) {
      const corner = {
        x: ('x' in wall) ? wall.x : wall.xFrom,
        y: ('y' in wall) ? wall.y : wall.yFrom,
        xTo: ('x' in wall) ? wall.x : wall.xTo,
        yTo: ('y' in wall) ? wall.y : wall.yTo,
      }

      this.forEachCell(corner, (cell) => {
        this.walls[cell] = 1
        this.portalWalls[cell] = 1
      })
    }
  }

  /**
   * Marks the blocked walls' tiles as wall, and those that can take portals:
   * a blocked wall a link reaches, or one that starts unblocked. Run once
   * the state's layout knows which elements links reach.
   */
  private placeBlockedWalls(): void {
    this.entriesOf('blockedWall').forEach((entry, index) => {
      const canTakePortals = (this.stateLayout.flagOffset('blockedWall', index) !== NOT_STORED) || (!this.stateLayout.isBlockedAtStart('blockedWall', index))

      this.forEachCell(entry, (cell) => {
        this.walls[cell] = 1
        this.portalWalls[cell] = canTakePortals ? 1 : 0
      })
    })
  }

  /**
   * Marks the emitters' and receivers' tiles as wall that takes no portal on
   * any face.
   */
  private placeDevices(): void {
    for (const kind of DEVICE_KINDS) {
      for (const entry of this.entriesOf(kind)) {
        this.forEachCell(entry, (cell) => {
          this.walls[cell] = 1
          this.portalWalls[cell] = 0
        })
      }
    }
  }

  /**
   * Indexes one element type by cell. The elements on a cell are chained in
   * list order, so a tile can hold more than one (two crossing lasers). A
   * rectangle entry (a blocked wall's) is found on each of its tiles, which
   * hold nothing else. An element outside the chamber keeps its index but
   * sits on no cell.
   * @param entries - The type's entries, in file order
   * @returns The type's index
   */
  private indexTiles(entries: readonly PlacedEntry[]): TileIndex {
    const cells = this.width * this.height
    const first = new Int32Array(cells).fill(NO_ELEMENT)
    const next = new Int32Array(entries.length).fill(NO_ELEMENT)
    const last = new Int32Array(cells).fill(NO_ELEMENT)

    entries.forEach((entry, index) => {
      this.forEachCell(entry, (cell) => {
        const previous = last[cell] ?? NO_ELEMENT

        if (previous === NO_ELEMENT) {
          first[cell] = index
        } else {
          next[previous] = index
        }

        last[cell] = index
      })
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
   * Whether a tile holds a wall a portal can ever open on: a wall, or a
   * blocked wall a link reaches or that starts unblocked, never an emitter
   * or a receiver. Whether a blocked wall is blocked now is the step's to
   * judge.
   * @param x - Column
   * @param y - Row
   * @returns True on a wall that can take portals; false elsewhere, outside the chamber included
   */
  canTakePortals(x: number, y: number): boolean {
    const cell = this.cellOf(x, y)

    return (cell !== OUTSIDE) && (this.portalWalls[cell] === 1)
  }

  /**
   * Whether a portal can ever open on one side of a wall: the wall can take
   * portals, and the tile that side faces holds no door or exit, since the
   * walls beside a doorway never take one, open or closed, and no laser or
   * light barrier running towards the wall, since the wall at the end of a
   * run, behind its end plate, never takes one either, on or off.
   * @param x - Column of the wall
   * @param y - Row of the wall
   * @param side - The side, the way it faces
   * @returns True when a portal can open there; false elsewhere, outside the chamber included
   */
  canTakePortalOn(x: number, y: number, side: Direction): boolean {
    const facedX = x + DELTAS[side].dx
    const facedY = y + DELTAS[side].dy
    const along = BEAM_ALONG_SIDE[side]
    const doorway = (this.elementAt('door', facedX, facedY) !== NO_ELEMENT) || (this.elementAt('exit', facedX, facedY) !== NO_ELEMENT)
    const runEnd = this.hasBeamAt('laser', facedX, facedY, along) || this.hasBeamAt('lightBarrier', facedX, facedY, along)

    return this.canTakePortals(x, y) && (!doorway) && (!runEnd)
  }

  /**
   * Whether a tile holds a laser or a light barrier running a way, either of
   * two lasers that cross there.
   * @param kind - The beam's type
   * @param x - Column
   * @param y - Row
   * @param orientation - The way it runs
   * @returns True when one does, false for none or outside the chamber
   */
  hasBeamAt(kind: BeamKind, x: number, y: number, orientation: BeamOrientation): boolean {
    for (let index = this.elementAt(kind, x, y); index !== NO_ELEMENT; index = this.nextOnTile(kind, index)) {
      if (this.entriesOf(kind)[index]?.direction === orientation) {
        return true
      }
    }

    return false
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
   * Every entry of an element type, in list order.
   * @param kind - The element type
   * @returns Its entries, as the chamber file lists them
   */
  entriesOf(kind: PlacedKind): readonly PlacedEntry[] {
    return this.entries.get(kind) ?? []
  }

  /**
   * How many elements of a type the chamber has.
   * @param kind - The element type
   * @returns The length of its list
   */
  countOf(kind: PlacedKind): number {
    return this.entriesOf(kind).length
  }

  /**
   * The tile an element sits on: for a rectangle (a blocked wall's), its
   * lower left tile.
   * @param kind - The element type
   * @param index - The element's index in the type's list
   * @returns Its entry, which holds its column and row
   * @throws RangeError for an element the chamber doesn't have
   */
  positionOf(kind: PlacedKind, index: number): PositionData {
    const entry = this.entriesOf(kind)[index]

    if (entry === undefined) {
      throw new RangeError(`no ${kind} ${index} in the chamber`)
    }

    return entry
  }

  /**
   * Which way an element points as its file gives it, for an arrow: the way
   * it points while blocked, as every arrow starts.
   * @param kind - The element type
   * @param index - The element's index in the type's list
   * @returns Its direction, or null when it points no way of the four
   */
  directionOf(kind: PlacedKind, index: number): Direction | null {
    return this.directions.get(kind)?.[index] ?? null
  }

  /**
   * Which way an arrow a link can turn points while unblocked.
   * @param kind - The element type
   * @param index - The element's index in the type's list
   * @returns Its turned direction, or null for an element without one
   */
  turnedDirectionOf(kind: PlacedKind, index: number): Direction | null {
    return this.turnedDirections.get(kind)?.[index] ?? null
  }

  /**
   * The mirror a box holds.
   * @param index - The box's index in the chamber's box list
   * @returns Its mirror, or null for a plain box or a box the chamber doesn't have
   */
  mirrorOf(index: number): Mirror | null {
    return this.mirrors[index] ?? null
  }

  /**
   * What an element's links reach, groups expanded, in order.
   * @param kind - The element type, a button, a switch or a receiver for any link
   * @param index - The element's index in the type's list
   * @returns The elements reached; empty for an element without links
   */
  linksOf(kind: PlacedKind, index: number): readonly LinkTarget[] {
    return this.links.get(kind)?.[index] ?? NO_LINKS
  }
}
