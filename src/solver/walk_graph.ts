import {DELTAS} from '@/game/direction'
import {NO_ELEMENT, type PlacedKind} from '@/game/rules/compiled_chamber'
import {ELEMENT_REGISTRY, type ElementKind} from '@/game/rules/element_registry'
import type {RulesState} from '@/game/rules/rules_state'
import {DIRECTIONS} from '@/game/rules/state_layout'
import {allowsWay, boxBlocksEntry, canEnter} from '@/game/rules/step'
import {type ChamberIndex, NO_NUMBER} from '@/solver/chamber_index'

/** A walk edge's target where the subject can't simply walk that way */
export const NO_WALK = -1

/** A tile's distance before a walk reaches it */
export const UNREACHED = -1

/** Bits in one word of a row of tiles */
const WORD_BITS = 32

/**
 * Whether an element type is found by tile: every type but walls and boxes.
 * @param kind - The type
 * @returns True when it is found by tile
 */
export function isPlacedKind(kind: ElementKind): kind is PlacedKind {
  return (kind !== 'wall') && (kind !== 'box')
}

/**
 * Each tile's ways for one set of blocked flags, which turn the arrows a
 * link reaches.
 */
type TileWays = {
  readonly allowed: Uint8Array // Each tile's ways the subject may move, one bit per index in DIRECTIONS
  readonly facings: Uint8Array // Each tile's canonical facing, as an index in DIRECTIONS
}

/** The element types whose tile can change the state when the subject enters or leaves it */
const REACTING_KINDS: readonly PlacedKind[] = ELEMENT_REGISTRY
  .filter((definition) => definition.reactsToSubject)
  .map((definition) => definition.kind)
  .filter(isPlacedKind)

/**
 * Finds each tile's region: the tiles the subject can walk between both
 * ways. Arrows make some walks one-way, so the tiles a walk reaches aren't
 * always a region. A walk from each tile, breadth first, marks the tiles it
 * reaches in a row of bits, then each tile's region is the smallest tile
 * that reaches it and that it reaches. Walks start from every tile, event
 * tiles included, but no walk edge leads onto an event tile, so each event
 * tile is a region of its own, and none onto a tile where a box rests, so
 * such a tile is one too. Built once per set of flags and of the resting
 * boxes' tiles, at a cost of tiles times walk edges.
 * @param edges - The walk edges, without those onto a tile where a box rests
 * @param tileCount - The chamber's tiles
 * @returns Each tile's region, as its smallest tile's number
 */
function findRegions(edges: Int32Array, tileCount: number): Int32Array {
  const rowWords = Math.ceil(tileCount / WORD_BITS)
  const reaches = new Uint32Array(tileCount * rowWords)
  const queue = new Int32Array(tileCount)
  const regions = new Int32Array(tileCount)

  /**
   * Whether the walk from one tile reaches another.
   * @param from - The tile the walk starts on
   * @param tile - The tile it may reach
   * @returns True when it does
   */
  const reachesTile = (from: number, tile: number): boolean => {
    return ((((reaches[(from * rowWords) + Math.floor(tile / WORD_BITS)] ?? 0) >>> (tile % WORD_BITS)) & 1) === 1)
  }

  /**
   * Marks a tile as reached by the walk from another.
   * @param from - The tile the walk starts on
   * @param tile - The tile it reaches
   */
  const markReached = (from: number, tile: number): void => {
    const word = (from * rowWords) + Math.floor(tile / WORD_BITS)

    reaches[word] = (reaches[word] ?? 0) | (1 << (tile % WORD_BITS))
  }

  for (let from = 0; from < tileCount; from++) {
    let queued = 1

    queue[0] = from
    markReached(from, from)

    for (let next = 0; next < queued; next++) {
      const tile = queue[next] ?? 0

      for (let directionIndex = 0; directionIndex < DIRECTIONS.length; directionIndex++) {
        const target = edges[(tile * DIRECTIONS.length) + directionIndex] ?? NO_WALK

        if ((target !== NO_WALK) && (!reachesTile(from, target))) {
          markReached(from, target)
          queue[queued] = target
          queued++
        }
      }
    }
  }

  for (let tile = 0; tile < tileCount; tile++) {
    let region = tile

    for (let other = 0; other < tile; other++) {
      if (reachesTile(tile, other) && reachesTile(other, tile)) {
        region = other
        break
      }
    }

    regions[tile] = region
  }

  return regions
}

/**
 * Where the subject can walk in a chamber, for the solver. A walk edge
 * leads from a tile one way to the next tile when the rules let the subject
 * leave its tile that way and step onto the next one (allowsWay and
 * canEnter, read from the rules, never copied), and the next tile is no
 * event tile: one holding an element that reacts to the subject entering or
 * leaving it. Which edges exist depends only on the blocked flags, so they
 * are built once per set of flags. A resting box also keeps the subject off
 * its tile (the rules' boxBlocksEntry), but boxes move, so a walk skips an
 * edge onto a box in the state it walks in (walkTarget) rather than leaving
 * it out of the edges. Walking along walk edges changes only the subject's
 * tile, its facing and a carried box's tile, so the solver can take a whole
 * walk as one move. The regions, the tiles the subject can walk between both
 * ways, depend on the resting boxes too, so they are built once per set of
 * flags and of the resting boxes' tiles. Also gives each tile's ways the
 * subject may move and its canonical facing, the first of them, which on an
 * arrow is the way it points now; a link can turn an arrow, so they too are
 * built once per set of flags.
 */
export class WalkGraph {
  readonly index: ChamberIndex // The chamber's tile numbers
  private readonly eventTiles: Uint8Array // 1 on each event tile
  private readonly waysByFlags = new Map<number, TileWays>() // Each tile's allowed ways and canonical facing, by the blocked flags they were built for
  private readonly edgesByFlags = new Map<number, Int32Array>() // The walk edges, by the blocked flags they were built for
  private readonly regionsByKey = new Map<string, Int32Array>() // Each tile's region, by the blocked flags and the resting boxes' tiles it was found for (regionsKey)
  private readonly regionEdges: Int32Array // The walk edges but those onto a resting box, for finding regions; apart from the walk's buffers, so finding regions mid-expansion leaves the last walk intact
  private readonly reached: Int32Array // The tiles the last walk reached, in the order reached
  private readonly distances: Int32Array // Each tile's distance in the last walk, or UNREACHED
  private readonly arrivals: Int8Array // Each reached tile's last move in the last walk, as an index in DIRECTIONS
  private reachedCount = 0 // How many tiles the last walk reached

  /**
   * @param index - The chamber's tile numbers
   */
  constructor(index: ChamberIndex) {
    const chamber = index.chamber

    this.index = index
    this.eventTiles = new Uint8Array(index.tileCount)
    this.regionEdges = new Int32Array(index.tileCount * DIRECTIONS.length)
    this.reached = new Int32Array(index.tileCount)
    this.distances = new Int32Array(index.tileCount).fill(UNREACHED)
    this.arrivals = new Int8Array(index.tileCount)

    for (let tile = 0; tile < index.tileCount; tile++) {
      this.eventTiles[tile] = REACTING_KINDS.some((kind) => chamber.elementAt(kind, index.tileX(tile), index.tileY(tile)) !== NO_ELEMENT) ? 1 : 0
    }
  }

  /**
   * Whether a tile is an event tile.
   * @param tile - The tile's number
   * @returns True when entering or leaving it can change the state
   */
  isEventTile(tile: number): boolean {
    return this.eventTiles[tile] === 1
  }

  /**
   * A tile's canonical facing for a set of blocked flags: the first way the
   * subject may move there, which on an arrow is the way it points now. The
   * caller passes a state with these flags, from which they are built the
   * first time they are asked for.
   * @param state - A state with these flags
   * @param flags - Its blocked flags, as one number, the cache key
   * @param tile - The tile's number
   * @returns The facing, as an index in DIRECTIONS
   */
  facingOf(state: RulesState, flags: number, tile: number): number {
    return this.waysFor(state, flags).facings[tile] ?? 0
  }

  /**
   * Whether the subject may move or shoot a way from a tile, for a set of
   * blocked flags; on an arrow only the way it points now acts. The caller
   * passes a state with these flags, from which they are built the first
   * time they are asked for.
   * @param state - A state with these flags
   * @param flags - Its blocked flags, as one number, the cache key
   * @param tile - The tile's number
   * @param directionIndex - The way, as an index in DIRECTIONS
   * @returns True when it may
   */
  allowsWayFrom(state: RulesState, flags: number, tile: number, directionIndex: number): boolean {
    return (((this.waysFor(state, flags).allowed[tile] ?? 0) >> directionIndex) & 1) === 1
  }

  /**
   * Each tile's allowed ways and canonical facing for a state's blocked
   * flags, from the rules' allowsWay on that state.
   * @param state - A state with these flags
   * @param flags - Its blocked flags, as one number, the cache key
   * @returns The ways
   */
  private waysFor(state: RulesState, flags: number): TileWays {
    const cached = this.waysByFlags.get(flags)

    if (cached !== undefined) {
      return cached
    }

    const index = this.index
    const ways: TileWays = {
      allowed: new Uint8Array(index.tileCount),
      facings: new Uint8Array(index.tileCount),
    }

    for (let tile = 0; tile < index.tileCount; tile++) {
      const x = index.tileX(tile)
      const y = index.tileY(tile)
      let facing = NO_WALK

      DIRECTIONS.forEach((direction, directionIndex) => {
        if (allowsWay(state, x, y, direction)) {
          ways.allowed[tile] = (ways.allowed[tile] ?? 0) | (1 << directionIndex)

          if (facing === NO_WALK) {
            facing = directionIndex
          }
        }
      })

      ways.facings[tile] = Math.max(facing, 0)
    }

    this.waysByFlags.set(flags, ways)

    return ways
  }

  /**
   * The walk edges for a state's blocked flags: for each tile, four entries
   * in DIRECTIONS order, each the tile a walk that way reaches, or NO_WALK,
   * leaving boxes out (walkTarget skips a tile where one rests).
   * @param state - A state with these flags
   * @param flags - Its blocked flags, as one number, the cache key
   * @returns The edges
   */
  edgesFor(state: RulesState, flags: number): Int32Array {
    const cached = this.edgesByFlags.get(flags)

    if (cached !== undefined) {
      return cached
    }

    const index = this.index
    const edges = new Int32Array(index.tileCount * DIRECTIONS.length).fill(NO_WALK)

    for (let tile = 0; tile < index.tileCount; tile++) {
      const x = index.tileX(tile)
      const y = index.tileY(tile)

      DIRECTIONS.forEach((direction, directionIndex) => {
        const targetX = x + DELTAS[direction].dx
        const targetY = y + DELTAS[direction].dy
        const target = index.tileNumber(targetX, targetY)

        if ((target !== NO_NUMBER) && (!this.isEventTile(target)) && allowsWay(state, x, y, direction) && canEnter(state, targetX, targetY, direction)) {
          edges[(tile * DIRECTIONS.length) + directionIndex] = target
        }
      })
    }

    this.edgesByFlags.set(flags, edges)

    return edges
  }

  /**
   * The regions for a state's blocked flags and resting boxes: for each
   * tile, the smallest tile of its region, the tiles the subject can walk
   * between both ways, never onto a tile where a box rests. States that
   * differ only in where the subject stands inside one region can reach the
   * same states, so the search for any route keeps one. A tile where a box
   * rests is a region of its own: the subject stands there only when the box
   * was sent back under it, and can walk off but not back on.
   * @param state - A state with these flags, whose resting boxes count
   * @param flags - Its blocked flags, as one number, part of the cache key
   * @returns Each tile's region, as its smallest tile's number
   */
  regionsFor(state: RulesState, flags: number): Int32Array {
    const key = this.regionsKey(state, flags)
    const cached = this.regionsByKey.get(key)

    if (cached !== undefined) {
      return cached
    }

    const edges = this.edgesFor(state, flags)

    for (let tile = 0; tile < this.index.tileCount; tile++) {
      for (let directionIndex = 0; directionIndex < DIRECTIONS.length; directionIndex++) {
        this.regionEdges[(tile * DIRECTIONS.length) + directionIndex] = this.walkTarget(state, edges, tile, directionIndex)
      }
    }

    const regions = findRegions(this.regionEdges, this.index.tileCount)

    this.regionsByKey.set(key, regions)

    return regions
  }

  /**
   * The regions' cache key for a state: its blocked flags, then each box's
   * tile, in the chamber's box list, but the carried box's, which rests
   * nowhere.
   * @param state - The state
   * @param flags - Its blocked flags, as one number
   * @returns The key
   */
  private regionsKey(state: RulesState, flags: number): string {
    let key = String(flags)

    for (let box = 0; box < this.index.chamber.boxStarts.length; box++) {
      key += (box === state.carriedBox) ? ':carried' : `:${this.index.tileNumber(state.boxX(box), state.boxY(box))}`
    }

    return key
  }

  /**
   * Where a walk edge leads in a state: its target, unless a box rests
   * there, which keeps the subject off (the rules' boxBlocksEntry).
   * @param state - The state walked in
   * @param edges - The walk edges for its flags, from edgesFor
   * @param tile - The tile the edge leaves
   * @param directionIndex - The way, as an index in DIRECTIONS
   * @returns The tile it leads to, or NO_WALK
   */
  walkTarget(state: RulesState, edges: Int32Array, tile: number, directionIndex: number): number {
    const target = edges[(tile * DIRECTIONS.length) + directionIndex] ?? NO_WALK

    return ((target === NO_WALK) || this.boxRestsOn(state, target)) ? NO_WALK : target
  }

  /**
   * Whether a box rests on a tile in a state, keeping the subject off it
   * (the rules' boxBlocksEntry).
   * @param state - The state
   * @param tile - The tile's number
   * @returns True when one rests there
   */
  private boxRestsOn(state: RulesState, tile: number): boolean {
    return boxBlocksEntry(state, this.index.tileX(tile), this.index.tileY(tile))
  }

  /**
   * Walks from a tile along walk edges, breadth first, so each tile reached
   * gets its fewest moves, never onto a tile where a box rests in the state
   * (walkTarget). The start is reached from the outset, never asked about,
   * so a walk leaves a tile where a box was sent back under the subject, but
   * never comes back to it. From an event tile the walk reaches only that
   * tile, since leaving it can change the state.
   * @param state - The state walked in, whose resting boxes count
   * @param edges - The walk edges for its flags, from edgesFor
   * @param from - The tile it starts on
   * @returns How many tiles it reached, the start included
   */
  walk(state: RulesState, edges: Int32Array, from: number): number {
    for (let i = 0; i < this.reachedCount; i++) {
      this.distances[this.reached[i] ?? 0] = UNREACHED
    }

    this.reached[0] = from
    this.distances[from] = 0
    this.arrivals[from] = NO_WALK
    this.reachedCount = 1

    if (this.isEventTile(from)) {
      return 1
    }

    for (let next = 0; next < this.reachedCount; next++) {
      const tile = this.reached[next] ?? 0
      const distance = (this.distances[tile] ?? 0) + 1

      for (let directionIndex = 0; directionIndex < DIRECTIONS.length; directionIndex++) {
        const target = edges[(tile * DIRECTIONS.length) + directionIndex] ?? NO_WALK

        // A box is asked about only on a tile not reached yet, so never on the start
        if ((target !== NO_WALK) && (this.distances[target] === UNREACHED) && (!this.boxRestsOn(state, target))) {
          this.distances[target] = distance
          this.arrivals[target] = directionIndex
          this.reached[this.reachedCount] = target
          this.reachedCount++
        }
      }
    }

    return this.reachedCount
  }

  /**
   * A tile the last walk reached.
   * @param position - Its place in the order reached, below what walk returned
   * @returns The tile's number
   */
  reachedTile(position: number): number {
    return this.reached[position] ?? 0
  }

  /**
   * A tile's fewest moves in the last walk.
   * @param tile - The tile's number
   * @returns The moves, or UNREACHED when the walk didn't reach it
   */
  distanceTo(tile: number): number {
    return this.distances[tile] ?? UNREACHED
  }

  /**
   * The moves of a shortest walk to a tile in the last walk.
   * @param tile - A tile the last walk reached
   * @returns The ways moved, as indexes in DIRECTIONS, in order
   * @throws Error when the last walk didn't reach the tile
   */
  pathTo(tile: number): number[] {
    if (this.distanceTo(tile) === UNREACHED) {
      throw new Error(`the walk didn't reach tile ${tile}`)
    }

    const path: number[] = []

    for (let current = tile; this.distanceTo(current) > 0;) {
      const directionIndex = this.arrivals[current] ?? NO_WALK
      const direction = DIRECTIONS[directionIndex]

      if (direction === undefined) {
        throw new Error(`the walk recorded no way into tile ${current}`)
      }

      path.push(directionIndex)
      current = this.index.tileNumber(this.index.tileX(current) - DELTAS[direction].dx, this.index.tileY(current) - DELTAS[direction].dy)
    }

    return path.reverse()
  }
}
