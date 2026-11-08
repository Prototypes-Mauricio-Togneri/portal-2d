import {NO_ELEMENT, type PlacedKind} from '@/game/rules/compiled_chamber'
import type {ElementDefinition, ElementHooks} from '@/game/rules/element_definition'
import {ELEMENT_REGISTRY} from '@/game/rules/element_registry'
import {PORTAL_COLORS} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {DIRECTIONS} from '@/game/rules/state_layout'
import {allowsWay, canEnter, canInteract, DELTAS, portalEntrance} from '@/game/rules/step'
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

/** The element types the subject needs free hands for (switches, which refuse while it carries a box) or that destroy a carried box (fizzlers): a box may be put down next to them */
const DROP_NEXT_TO_KINDS = [
  ...kindsWithHook('interact'),
  ...kindsWithHook('subjectInside'),
]

/**
 * Picks out, for the solver's macro search, the interacts and moves that
 * can't change anything but where the subject faces, so the search skips
 * them instead of calling the rules' step. With limited drops (A9), it also
 * skips putting a carried box down anywhere but where that is likely to
 * matter: on a tile whose element judges what lies on it (a button), at the
 * box's start,
 * on or next to another box (to pick that one up), next to an element the
 * subject needs free hands for or that destroys a carried box (a switch, a
 * fizzler), and in front of either portal while both are open (the step
 * before coming out on such a tile). That is a guess that can, in an
 * unusual layout, miss every route or the cheapest one, so only the search
 * for any route uses it. Every other answer comes from the rules' own
 * checks: canInteract for the interact key, and for a move allowsWay and
 * canEnter (built once per set of blocked flags) and portalEntrance for a
 * wall ahead. In one expansion only the subject's tile changes, and a
 * carried box goes with it, so the expanded state answers for every tile
 * its walk reaches. The solver check compares every interact and move
 * skipped without limited drops with the rules' step; the drops limited
 * drops leave out are not checked.
 */
export class ActionFilter {
  private readonly index: ChamberIndex // The chamber's tile numbers
  private readonly limitDrops: boolean // Whether a carried box is put down only where that can matter
  private readonly dropSpots: Uint8Array // 1 on each tile where a carried box may always be put down
  private readonly dropSerials: Uint32Array // The expansion in which each tile became a place to put the carried box down
  private readonly stepsByFlags = new Map<number, Int32Array>() // The tiles a move reaches, by the blocked flags they were found for
  private steps: Int32Array = new Int32Array(0) // The current flags' moves, four per tile in DIRECTIONS order: the tile stepped onto, or NO_WALK
  private state: RulesState | null = null // The state expanded
  private skippedInteractCount = 0 // Interacts skipped so far
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
    this.dropSpots = new Uint8Array(index.tileCount)
    this.dropSerials = new Uint32Array(index.tileCount)

    for (let tile = 0; tile < index.tileCount; tile++) {
      const x = index.tileX(tile)
      const y = index.tileY(tile)

      if (DROP_ON_KINDS.some((kind) => chamber.elementAt(kind, x, y) !== NO_ELEMENT)) {
        this.dropSpots[tile] = 1
      }

      if (DROP_NEXT_TO_KINDS.some((kind) => chamber.elementAt(kind, x, y) !== NO_ELEMENT)) {
        this.markAround(this.dropSpots, tile, 1)
      }
    }
  }

  /**
   * Interacts skipped so far.
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
   * on the state where the box may be put down.
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
   * Whether the interact key can change anything on a tile the walk reached.
   * Counts the interacts it rules out.
   * @param tile - The tile's number
   * @returns True when the rules' step has to tell
   * @throws Error before begin
   */
  mayInteract(tile: number): boolean {
    const state = this.expanded

    if (!canInteract(state, this.index.tileX(tile), this.index.tileY(tile))) {
      this.skippedInteractCount++

      return false
    }

    // While carrying, interact puts the box down (or a switch refuses)
    if (this.limitDrops && state.isCarrying && (this.dropSpots[tile] !== 1) && (this.dropSerials[tile] !== this.serial)) {
      this.skippedDropCount++

      return false
    }

    return true
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
   * Marks the places, in this expansion, where the carried box may be put
   * down that depend on the state: the box's start, every other box's tile
   * and the tiles next to it, and the tile in front of each portal while
   * both are open.
   * @param state - The state expanded, carrying a box
   */
  private markDropSpots(state: RulesState): void {
    const index = this.index
    const start = index.chamber.boxStarts[state.carriedBox]

    if (start !== undefined) {
      this.markTile(start.x, start.y)
    }

    for (let box = 0; box < index.chamber.boxStarts.length; box++) {
      if (box !== state.carriedBox) {
        const tile = index.tileNumber(state.boxX(box), state.boxY(box))

        if (tile !== NO_NUMBER) {
          this.markAround(this.dropSerials, tile, this.serial)
        }
      }
    }

    if (PORTAL_COLORS.every((color) => state.isPortalOpen(color))) {
      for (const color of PORTAL_COLORS) {
        const side = state.portalSide(color)

        if (side !== null) {
          this.markTile(state.portalX(color) + DELTAS[side].dx, state.portalY(color) + DELTAS[side].dy)
        }
      }
    }
  }

  /**
   * Marks a tile as a place to put the carried box down in this expansion.
   * @param x - Column
   * @param y - Row
   */
  private markTile(x: number, y: number): void {
    const tile = this.index.tileNumber(x, y)

    if (tile !== NO_NUMBER) {
      this.dropSerials[tile] = this.serial
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
