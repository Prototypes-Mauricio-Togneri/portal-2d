import type {RulesState} from '@/game/rules/rules_state'
import {DIRECTIONS} from '@/game/rules/state_layout'
import {allowsWay, canEnter, canInteract, DELTAS, portalEntrance} from '@/game/rules/step'
import {type ChamberIndex, NO_NUMBER} from '@/solver/chamber_index'
import {NO_WALK} from '@/solver/walk_graph'

/**
 * Picks out, for the solver's macro search, the interacts and moves that
 * can't change anything but where the subject faces, so the search skips
 * them instead of calling the rules' step. Every answer comes from the
 * rules' own checks: canInteract for the interact key, and for a move
 * allowsWay and canEnter (built once per set of blocked flags) and
 * portalEntrance for a wall ahead. In one expansion only the subject's tile
 * changes, and a carried box goes with it, so the expanded state answers
 * for every tile its walk reaches. The solver check compares every skipped
 * action with the rules' step.
 */
export class ActionFilter {
  private readonly index: ChamberIndex // The chamber's tile numbers
  private readonly stepsByFlags = new Map<number, Int32Array>() // The tiles a move reaches, by the blocked flags they were found for
  private steps: Int32Array = new Int32Array(0) // The current flags' moves, four per tile in DIRECTIONS order: the tile stepped onto, or NO_WALK
  private state: RulesState | null = null // The state expanded
  private skippedInteractCount = 0 // Interacts skipped so far
  private skippedMoveCount = 0 // Moves skipped so far

  /**
   * @param index - The chamber's tile numbers
   */
  constructor(index: ChamberIndex) {
    this.index = index
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
   * Starts an expansion: takes the state expanded, and the moves for its
   * flags.
   * @param state - The state expanded
   * @param flags - Its blocked flags, as one number
   */
  begin(state: RulesState, flags: number): void {
    this.state = state
    this.steps = this.stepsFor(state, flags)
  }

  /**
   * Whether the interact key can change anything on a tile the walk reached.
   * Counts the interacts it rules out.
   * @param tile - The tile's number
   * @returns True when the rules' step has to tell
   * @throws Error before begin
   */
  mayInteract(tile: number): boolean {
    if (canInteract(this.expanded, this.index.tileX(tile), this.index.tileY(tile))) {
      return true
    }

    this.skippedInteractCount++

    return false
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
