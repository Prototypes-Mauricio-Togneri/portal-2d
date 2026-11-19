import {DELTAS} from '@/game/direction'
import {NO_ELEMENT, type PlacedKind} from '@/game/rules/compiled_chamber'
import type {ElementDefinition, ElementHooks} from '@/game/rules/element_definition'
import {ELEMENT_REGISTRY} from '@/game/rules/element_registry'
import {PORTAL_COLORS} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {DIRECTIONS} from '@/game/rules/state_layout'
import {portalEntrance} from '@/game/rules/portals'
import {allowsWay, canEnter, canInteract, canInteractInPlace, putDownTile} from '@/game/rules/step'
import {type ChamberIndex, NO_NUMBER} from '@/solver/chamber_index'
import {isPlacedKind, NO_WALK} from '@/solver/walk_graph'

/**
 * The element types found by tile that have one of the rules' hooks.
 * @param name - The hook
 * @returns The types
 */
function kindsWithHook(name: keyof ElementHooks): readonly PlacedKind[] {
  return ELEMENT_REGISTRY
    .filter((definition) => {
      const widened: ElementDefinition = definition

      return widened.hooks?.[name] !== undefined
    })
    .map((definition) => definition.kind)
    .filter(isPlacedKind)
}

/** The element types whose every-pass hook judges what lies on them, so a box left there can matter (buttons) */
const DROP_ON_KINDS = kindsWithHook('everyPass')

/** The element types the subject needs free hands for (switches, which refuse while it carries a box) or that destroy a carried box (fizzlers): a box may be put down standing on or next to them */
const DROP_NEXT_TO_KINDS = [
  ...kindsWithHook('interact'),
  ...kindsWithHook('subjectInside'),
]

/**
 * Picks out, for the solver's macro search, the interacts and moves that
 * can't change anything but where the subject faces, so the search skips them
 * instead of calling the rules' step. A carried box is put down once per tile
 * it can land on: each way whose tile faced takes it. With limited drops, it
 * also skips putting a carried box down anywhere but where that is likely to
 * matter, judged by the tile the box lands on: a tile whose element judges
 * what lies on it (a button), or the box's start; or by the tile the subject
 * stands on: next to another box (to pick that one up), on or next to an
 * element the subject needs free hands for or that destroys a carried box (a
 * switch, a fizzler), or in front of either portal while both are open. That
 * is a guess that can, in an unusual layout, miss every route or the cheapest
 * one, so only the search for any route uses it. Every other answer comes
 * from the rules' own checks: canInteractInPlace, then putDownTile each way
 * while a box is carried, or else canInteract each way, for the interact key,
 * and for a move allowsWay and canEnter (built once per set of blocked flags)
 * and portalEntrance for a wall ahead; a move into a resting box is taken,
 * and only turns the subject. In one expansion only the subject's tile and
 * facing change, and a carried box goes with it, so the expanded state
 * answers for every tile its walk reaches. The solver check compares every
 * interact and move skipped without limited drops with the rules' step; the
 * drops limited drops leave out are not checked.
 */
export class ActionFilter {
  private readonly index: ChamberIndex // The chamber's tile numbers
  private readonly limitDrops: boolean // Whether a carried box is put down only where that can matter
  private readonly landingSpots: Uint8Array // 1 on each tile where a carried box may always land
  private readonly standingSpots: Uint8Array // 1 on each tile the subject may always put a carried box down from
  private readonly landingSerials: Uint32Array // The expansion in which each tile became a place for the carried box to land
  private readonly standingSerials: Uint32Array // The expansion in which each tile became a place to put the carried box down from
  private readonly stepsByFlags = new Map<number, Int32Array>() // The tiles a move reaches, by the blocked flags they were found for
  private steps: Int32Array = new Int32Array(0) // The current flags' moves, four per tile in DIRECTIONS order: the tile stepped onto, or NO_WALK
  private state: RulesState | null = null // The state expanded
  private skippedInteractCount = 0 // Tiles where no interact could change anything, skipped so far
  private skippedMoveCount = 0 // Moves skipped so far
  private skippedDropCount = 0 // Box drops skipped so far, with limited drops
  private serial = 0 // The current expansion's number

  /**
   * @param index - The chamber's tile numbers
   * @param limitDrops - Whether to put a carried box down only where that can matter
   */
  constructor(index: ChamberIndex, limitDrops: boolean) {
    const chamber = index.chamber

    this.index = index
    this.limitDrops = limitDrops
    this.landingSpots = new Uint8Array(index.tileCount)
    this.standingSpots = new Uint8Array(index.tileCount)
    this.landingSerials = new Uint32Array(index.tileCount)
    this.standingSerials = new Uint32Array(index.tileCount)

    for (let tile = 0; tile < index.tileCount; tile++) {
      const x = index.tileX(tile)
      const y = index.tileY(tile)

      if (DROP_ON_KINDS.some((kind) => chamber.elementAt(kind, x, y) !== NO_ELEMENT)) {
        this.landingSpots[tile] = 1
      }

      if (DROP_NEXT_TO_KINDS.some((kind) => chamber.elementAt(kind, x, y) !== NO_ELEMENT)) {
        this.markAround(this.standingSpots, tile, 1)
      }
    }
  }

  /**
   * Tiles where no interact could change anything, skipped so far.
   * @returns The count
   */
  get skippedInteracts(): number {
    return this.skippedInteractCount
  }

  /**
   * Moves skipped so far.
   * @returns The count
   */
  get skippedMoves(): number {
    return this.skippedMoveCount
  }

  /**
   * Box drops skipped so far, with limited drops.
   * @returns The count
   */
  get skippedDrops(): number {
    return this.skippedDropCount
  }

  /**
   * Starts an expansion: takes the state expanded, the moves for its flags,
   * and with limited drops, while it carries a box, the places that depend
   * on the state where the box may land or be put down from.
   * @param state - The state expanded
   * @param flags - Its blocked flags, as one number
   */
  begin(state: RulesState, flags: number): void {
    this.state = state
    this.steps = this.stepsFor(state, flags)
    this.serial++

    if (this.limitDrops && state.isCarrying) {
      this.markDropSpots(state)
    }
  }

  /**
   * The ways the subject may face on a tile the walk reached for the interact
   * key to change anything, as bits by index in DIRECTIONS. When something on
   * the tile takes the key (canInteractInPlace), the way doesn't matter, so
   * only the tile's canonical way is given; while a box is carried, each way
   * whose tile faced takes it (putDownWays); otherwise each way that faces a
   * box in reach (canInteract). Counts the tiles where it rules every way
   * out.
   * @param tile - The tile's number
   * @param canonicalIndex - The tile's canonical facing for the expanded state's blocked flags, as an index in DIRECTIONS
   * @returns The ways for which the rules' step has to tell, as bits; 0 for none
   * @throws Error before begin
   */
  interactWays(tile: number, canonicalIndex: number): number {
    const state = this.expanded
    const x = this.index.tileX(tile)
    const y = this.index.tileY(tile)

    if (canInteractInPlace(state, x, y)) {
      return 1 << canonicalIndex
    }

    if (state.isCarrying) {
      return this.putDownWays(state, tile, x, y)
    }

    let ways = 0

    DIRECTIONS.forEach((direction, directionIndex) => {
      if (canInteract(state, x, y, direction)) {
        ways |= 1 << directionIndex
      }
    })

    if (ways === 0) {
      this.skippedInteractCount++
    }

    return ways
  }

  /**
   * The ways to face on a tile for the interact key to put a carried box
   * down, as bits by index in DIRECTIONS: each way the subject may face
   * there whose tile faced takes the box (putDownTile). With limited drops,
   * a way is left out unless the subject's tile or the tile the box would
   * land on is one where that can matter. Counts the tiles where every way
   * is ruled out, but by limited drops.
   * @param state - The state expanded, carrying a box
   * @param tile - The tile's number
   * @param x - Column of the tile
   * @param y - Row of the tile
   * @returns The ways for which the rules' step has to tell, as bits; 0 for none
   */
  private putDownWays(state: RulesState, tile: number, x: number, y: number): number {
    const standingAllows = this.mayDropFrom(tile)
    let ways = 0
    let limited = false

    DIRECTIONS.forEach((direction, directionIndex) => {
      // On a one-way tile the subject faces only the way it points in this state
      if (!allowsWay(state, x, y, direction)) {
        return
      }

      const landing = putDownTile(state, x, y, direction)

      if (landing === null) {
        return
      }

      if (standingAllows || this.mayLandOn(landing.x, landing.y)) {
        ways |= 1 << directionIndex
      } else {
        limited = true
      }
    })

    if (limited) {
      this.skippedDropCount++
    } else if (ways === 0) {
      this.skippedInteractCount++
    }

    return ways
  }

  /**
   * Whether a carried box may land on a tile: always, but with limited
   * drops, only on a button or at its start.
   * @param x - Column
   * @param y - Row
   * @returns True when the rules' step has to tell
   */
  private mayLandOn(x: number, y: number): boolean {
    const tile = this.index.tileNumber(x, y)

    return (!this.limitDrops) || (tile === NO_NUMBER) || (this.landingSpots[tile] === 1) || (this.landingSerials[tile] === this.serial)
  }

  /**
   * Whether the subject may put a carried box down from a tile, wherever it
   * lands: always, but with limited drops, only next to another box, on or
   * next to a switch or a fizzler, or in front of either portal while both
   * are open.
   * @param tile - The tile's number
   * @returns True when the rules' step has to tell
   */
  private mayDropFrom(tile: number): boolean {
    return (!this.limitDrops) || (this.standingSpots[tile] === 1) || (this.standingSerials[tile] === this.serial)
  }

  /**
   * Whether a move from a tile the walk reached can change anything: it
   * steps onto the next tile, or walks into a wall where it enters a portal.
   * Counts the moves it rules out.
   * @param tile - The tile's number
   * @param directionIndex - The way, as an index in DIRECTIONS
   * @returns True when the rules' step has to tell
   * @throws Error before begin
   */
  mayMove(tile: number, directionIndex: number): boolean {
    if ((this.steps[(tile * DIRECTIONS.length) + directionIndex] ?? NO_WALK) !== NO_WALK) {
      return true
    }

    const direction = DIRECTIONS[directionIndex]

    if (direction !== undefined) {
      const x = this.index.tileX(tile)
      const y = this.index.tileY(tile)
      const wallX = x + DELTAS[direction].dx
      const wallY = y + DELTAS[direction].dy
      const state = this.expanded

      if (allowsWay(state, x, y, direction) && state.chamber.isWall(wallX, wallY) && (portalEntrance(state, wallX, wallY, direction) !== null)) {
        return true
      }
    }

    this.skippedMoveCount++

    return false
  }

  /**
   * Marks the places, in this expansion, that depend on the state: where
   * the carried box may land, its start, and where the subject may put it
   * down from, the tiles next to every other box and the tile in front of
   * each portal while both are open.
   * @param state - The state expanded, carrying a box
   */
  private markDropSpots(state: RulesState): void {
    const index = this.index
    const start = index.chamber.boxStarts[state.carriedBox]

    if (start !== undefined) {
      this.markTile(this.landingSerials, start.x, start.y)
    }

    for (let box = 0; box < index.chamber.boxStarts.length; box++) {
      if (box !== state.carriedBox) {
        for (const direction of DIRECTIONS) {
          this.markTile(this.standingSerials, state.boxX(box) + DELTAS[direction].dx, state.boxY(box) + DELTAS[direction].dy)
        }
      }
    }

    if (PORTAL_COLORS.every((color) => state.isPortalOpen(color))) {
      for (const color of PORTAL_COLORS) {
        const side = state.portalSide(color)

        if (side !== null) {
          this.markTile(this.standingSerials, state.portalX(color) + DELTAS[side].dx, state.portalY(color) + DELTAS[side].dy)
        }
      }
    }
  }

  /**
   * Marks a tile as a place, in this expansion, for the carried box to land
   * or to put it down from.
   * @param serials - The expansion in which each tile became such a place
   * @param x - Column
   * @param y - Row
   */
  private markTile(serials: Uint32Array, x: number, y: number): void {
    const tile = this.index.tileNumber(x, y)

    if (tile !== NO_NUMBER) {
      serials[tile] = this.serial
    }
  }

  /**
   * Writes a value on a tile and on each tile next to it.
   * @param marks - Each tile's mark
   * @param tile - The tile's number
   * @param value - The value to write
   */
  private markAround(marks: Uint8Array | Uint32Array, tile: number, value: number): void {
    const x = this.index.tileX(tile)
    const y = this.index.tileY(tile)

    marks[tile] = value

    for (const direction of DIRECTIONS) {
      const neighbour = this.index.tileNumber(x + DELTAS[direction].dx, y + DELTAS[direction].dy)

      if (neighbour !== NO_NUMBER) {
        marks[neighbour] = value
      }
    }
  }

  /**
   * The state expanded.
   * @returns The state
   * @throws Error before begin
   */
  private get expanded(): RulesState {
    if (this.state === null) {
      throw new Error('no expansion begun')
    }

    return this.state
  }

  /**
   * The moves for a state's blocked flags: for each tile, four entries in
   * DIRECTIONS order, each the tile a move that way steps onto, or NO_WALK.
   * Unlike walk edges, these include moves onto event tiles.
   * @param state - A state with these flags
   * @param flags - Its blocked flags, as one number, the cache key
   * @returns The moves
   */
  private stepsFor(state: RulesState, flags: number): Int32Array {
    const cached = this.stepsByFlags.get(flags)

    if (cached !== undefined) {
      return cached
    }

    const index = this.index
    const steps = new Int32Array(index.tileCount * DIRECTIONS.length).fill(NO_WALK)

    for (let tile = 0; tile < index.tileCount; tile++) {
      const x = index.tileX(tile)
      const y = index.tileY(tile)

      DIRECTIONS.forEach((direction, directionIndex) => {
        const targetX = x + DELTAS[direction].dx
        const targetY = y + DELTAS[direction].dy
        const target = index.tileNumber(targetX, targetY)

        if ((target !== NO_NUMBER) && allowsWay(state, x, y, direction) && canEnter(state, targetX, targetY, direction)) {
          steps[(tile * DIRECTIONS.length) + directionIndex] = target
        }
      })
    }

    this.stepsByFlags.set(flags, steps)

    return steps
  }
}
