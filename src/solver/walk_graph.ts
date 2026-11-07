import {NO_ELEMENT, type PlacedKind} from '@/game/rules/compiled_chamber'
import {ELEMENT_REGISTRY, type ElementKind} from '@/game/rules/element_registry'
import type {RulesState} from '@/game/rules/rules_state'
import {DIRECTIONS} from '@/game/rules/state_layout'
import {allowsWay, canEnter, DELTAS} from '@/game/rules/step'
import {type ChamberIndex, NO_NUMBER} from '@/solver/chamber_index'

/** A walk edge's target where the subject can't simply walk that way */
export const NO_WALK = -1

/** A tile's distance before a walk reaches it */
const UNREACHED = -1

/**
 * Whether an element type is found by tile: every type but walls and boxes.
 * @param kind - The type
 * @returns True when it is found by tile
 */
function isPlacedKind(kind: ElementKind): kind is PlacedKind {
  return (kind !== 'wall') && (kind !== 'box')
}

/** The element types whose tile can change the state when the subject enters or leaves it */
const REACTING_KINDS: readonly PlacedKind[] = ELEMENT_REGISTRY
  .filter((definition) => definition.reactsToSubject)
  .map((definition) => definition.kind)
  .filter(isPlacedKind)

/**
 * Where the subject can walk in a chamber, for the solver. A walk edge
 * leads from a tile one way to the next tile when the rules let the subject
 * leave its tile that way and step onto the next one (allowsWay and
 * canEnter, read from the rules, never copied), and the next tile is no
 * event tile: one holding an element that reacts to the subject entering or
 * leaving it. Walking along walk edges changes only the subject's tile, its
 * facing and a carried box's tile, so the solver can take a whole walk as one
 * move. Which edges exist depends only on the blocked flags, so the edges are
 * built once per set of flags. Also numbers each tile's canonical facing: the
 * first way the subject may move there, which on an arrow is its own way.
 */
export class WalkGraph {
  readonly index: ChamberIndex // The chamber's tile numbers
  private readonly eventTiles: Uint8Array // 1 on each event tile
  private readonly facings: Uint8Array // Each tile's canonical facing, as an index in DIRECTIONS
  private readonly allowedWays: Uint8Array // Each tile's ways the subject may move, one bit per index in DIRECTIONS
  private readonly edgesByFlags = new Map<number, Int32Array>() // The walk edges, by the blocked flags they were built for
  private readonly reached: Int32Array // The tiles the last walk reached, in the order reached
  private readonly distances: Int32Array // Each tile's distance in the last walk, or UNREACHED
  private readonly arrivals: Int8Array // Each reached tile's last move in the last walk, as an index in DIRECTIONS
  private reachedCount = 0 // How many tiles the last walk reached

  /**
   * @param index - The chamber's tile numbers
   * @param state - Any state of the chamber; arrows don't depend on it
   */
  constructor(index: ChamberIndex, state: RulesState) {
    const chamber = index.chamber

    this.index = index
    this.eventTiles = new Uint8Array(index.tileCount)
    this.facings = new Uint8Array(index.tileCount)
    this.allowedWays = new Uint8Array(index.tileCount)
    this.reached = new Int32Array(index.tileCount)
    this.distances = new Int32Array(index.tileCount).fill(UNREACHED)
    this.arrivals = new Int8Array(index.tileCount)

    for (let tile = 0; tile < index.tileCount; tile++) {
      const x = index.tileX(tile)
      const y = index.tileY(tile)
      let facing = NO_WALK

      this.eventTiles[tile] = REACTING_KINDS.some((kind) => chamber.elementAt(kind, x, y) !== NO_ELEMENT) ? 1 : 0

      DIRECTIONS.forEach((direction, directionIndex) => {
        if (allowsWay(state, x, y, direction)) {
          this.allowedWays[tile] = (this.allowedWays[tile] ?? 0) | (1 << directionIndex)

          if (facing === NO_WALK) {
            facing = directionIndex
          }
        }
      })

      this.facings[tile] = Math.max(facing, 0)
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
   * A tile's canonical facing.
   * @param tile - The tile's number
   * @returns The facing, as an index in DIRECTIONS
   */
  facingOf(tile: number): number {
    return this.facings[tile] ?? 0
  }

  /**
   * Whether the subject may move or shoot a way from a tile; only an arrow's
   * own way acts on an arrow.
   * @param tile - The tile's number
   * @param directionIndex - The way, as an index in DIRECTIONS
   * @returns True when it may
   */
  allowsWayFrom(tile: number, directionIndex: number): boolean {
    return (((this.allowedWays[tile] ?? 0) >> directionIndex) & 1) === 1
  }

  /**
   * The walk edges for a state's blocked flags: for each tile, four entries
   * in DIRECTIONS order, each the tile a walk that way reaches, or NO_WALK.
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
   * Walks from a tile along walk edges, breadth first, so each tile reached
   * gets its fewest moves. From an event tile the walk reaches only that
   * tile, since leaving it can change the state.
   * @param edges - The walk edges, from edgesFor
   * @param from - The tile it starts on
   * @returns How many tiles it reached, the start included
   */
  walk(edges: Int32Array, from: number): number {
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

        if ((target !== NO_WALK) && (this.distances[target] === UNREACHED)) {
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
