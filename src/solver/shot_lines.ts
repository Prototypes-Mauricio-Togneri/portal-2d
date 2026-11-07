import {Action} from '@/game/rules/action'
import {NO_ELEMENT, type PlacedKind} from '@/game/rules/compiled_chamber'
import {ELEMENT_REGISTRY} from '@/game/rules/element_registry'
import type {RulesState} from '@/game/rules/rules_state'
import {DIRECTIONS} from '@/game/rules/state_layout'
import {shotStop, step} from '@/game/rules/step'
import {countPortalsOpened} from '@/game/rules/step_counts'
import {encodeCanonical} from '@/solver/macro_route'
import type {StateKeyCodec} from '@/solver/state_key_codec'
import {isPlacedKind, type WalkGraph} from '@/solver/walk_graph'

/** The element types that can keep the subject from shooting while it stands on them (fizzlers) */
const SHOOTING_STOPPERS: readonly PlacedKind[] = ELEMENT_REGISTRY
  .filter((definition) => definition.stopsShootingFrom !== 'never')
  .map((definition) => definition.kind)
  .filter(isPlacedKind)

/** The two shots, in the order a slot of the memo lists them */
export const SHOT_ACTIONS: readonly Action[] = [
  Action.BLUE,
  Action.ORANGE,
]

/**
 * The shots of the solver's macro search, taken once per line. A shot never
 * moves the subject, and where it stops depends only on the blocked flags
 * (the rules' shotStop), so every tile whose shot a way stops at the same
 * tile gets the same result, but for the subject's tile: the portals it
 * opens are the same. In one expansion, where the portals and flags don't
 * change, the first tile on a line takes each shot through the rules' step,
 * and the other tiles on it reuse the result with the subject's tile
 * rewritten in the key. Tiles where something can keep the subject from
 * shooting (fizzlers) always take the rules' step. The solver check compares
 * every shot this gives with the rules' step.
 */
export class ShotLines {
  private readonly codec: StateKeyCodec // The chamber's state key
  private readonly graph: WalkGraph // Where the subject can walk, and each tile's canonical facing
  private readonly shares: Uint8Array // 1 on each tile whose shots may be reused
  private readonly stopsByFlags = new Map<number, Int32Array>() // Each tile's shot stops, by the blocked flags they were found for
  private readonly paddedWidth: number // The chamber's width with a column of outside on each side, for numbering stops
  private readonly slotSerials: Uint32Array // The expansion each memo slot was filled in
  private readonly slotChanged: Uint8Array // 1 when the slot's shot changed the state
  private readonly slotLows: Uint32Array // The low word of the slot's result key, with the canonical facing
  private readonly slotHighs: Uint32Array // The high word of that key
  private readonly slotPortals: Uint8Array // The portals the slot's shot opened
  private readonly slotStates: (RulesState | null)[] // The slot's result state, with the first tile's subject
  private readonly slotTiles: Int32Array // The tile that took the slot's shot through the rules' step
  private readonly words = new Uint32Array(2) // Room for one key
  private stops: Int32Array = new Int32Array(0) // The current flags' shot stops, four per tile in DIRECTIONS order
  private serial = 0 // The current expansion's number
  private shotChanged = false // Whether the last shot changed the state
  private shotLow = 0 // The low word of the last shot's result key, with the canonical facing
  private shotHigh = 0 // The high word of that key
  private shotPortals = 0 // The portals the last shot opened
  private shotState: RulesState | null = null // The last shot's result state, with its line's first subject tile
  private shotTile = 0 // The tile that took the last shot through the rules' step: the tile itself, or the first on its line
  private stepCount = 0 // Shots taken through the rules' step
  private reusedCount = 0 // Shots reused from another tile on the line

  /**
   * @param codec - The chamber's state key
   * @param graph - The chamber's walk graph
   */
  constructor(codec: StateKeyCodec, graph: WalkGraph) {
    const index = codec.index
    const chamber = index.chamber
    const slotCount = (chamber.width + 2) * (chamber.height + 2) * DIRECTIONS.length * SHOT_ACTIONS.length

    this.codec = codec
    this.graph = graph
    this.shares = new Uint8Array(index.tileCount)
    this.paddedWidth = chamber.width + 2
    this.slotSerials = new Uint32Array(slotCount)
    this.slotChanged = new Uint8Array(slotCount)
    this.slotLows = new Uint32Array(slotCount)
    this.slotHighs = new Uint32Array(slotCount)
    this.slotPortals = new Uint8Array(slotCount)
    this.slotStates = new Array<RulesState | null>(slotCount).fill(null)
    this.slotTiles = new Int32Array(slotCount)

    for (let tile = 0; tile < index.tileCount; tile++) {
      const x = index.tileX(tile)
      const y = index.tileY(tile)

      this.shares[tile] = SHOOTING_STOPPERS.some((kind) => chamber.elementAt(kind, x, y) !== NO_ELEMENT) ? 0 : 1
    }
  }

  /**
   * Shots taken through the rules' step so far.
   * @returns The count
   */
  get steps(): number {
    return this.stepCount
  }

  /**
   * Shots reused from another tile on their line so far.
   * @returns The count
   */
  get reused(): number {
    return this.reusedCount
  }

  /**
   * Whether the last shot changed the state.
   * @returns True when it did
   */
  get changed(): boolean {
    return this.shotChanged
  }

  /**
   * The low word of the last shot's result key, with the subject on the tile
   * it shot from, facing that tile's canonical way.
   * @returns The word
   */
  get childLow(): number {
    return this.shotLow
  }

  /**
   * The high word of the last shot's result key.
   * @returns The word
   */
  get childHigh(): number {
    return this.shotHigh
  }

  /**
   * The portals the last shot opened.
   * @returns The count
   */
  get portalsOpened(): number {
    return this.shotPortals
  }

  /**
   * The tile that took the last shot through the rules' step: the tile shot
   * from, or when the shot was reused, the first tile on its line.
   * @returns The tile's number
   */
  get lineTile(): number {
    return this.shotTile
  }

  /**
   * The last shot's result state, with the subject on the first tile of its
   * line; its flags, portals and completion are those of every tile on it.
   * @returns The state
   * @throws Error before any shot
   */
  get resultState(): RulesState {
    if (this.shotState === null) {
      throw new Error('no shot taken yet')
    }

    return this.shotState
  }

  /**
   * Starts an expansion: forgets the shots taken so far, since the portals
   * may differ, and takes the shot stops for the state's flags.
   * @param state - The state expanded
   * @param flags - Its blocked flags, as one number
   */
  begin(state: RulesState, flags: number): void {
    this.serial++
    this.stops = this.stopsFor(state, flags)
  }

  /**
   * Takes a shot from a tile, or reuses the shot of an earlier tile on its
   * line in this expansion. Read what it gave from changed, childLow,
   * childHigh, portalsOpened, resultState and lineTile.
   * @param low - The low word of the expanded state's key
   * @param high - The high word of that key
   * @param tile - The tile the subject shoots from, one the walk reached
   * @param directionIndex - The way it faces, one it may move from the tile
   * @param action - The shot, blue or orange
   * @returns Whether the shot changed the state
   */
  shoot(low: number, high: number, tile: number, directionIndex: number, action: Action): boolean {
    const shares = this.shares[tile] === 1
    const stop = this.stops[(tile * DIRECTIONS.length) + directionIndex] ?? 0
    const slot = (((stop * DIRECTIONS.length) + directionIndex) * SHOT_ACTIONS.length) + SHOT_ACTIONS.indexOf(action)

    if (shares && (this.slotSerials[slot] === this.serial)) {
      this.reusedCount++
      this.shotChanged = this.slotChanged[slot] === 1
      this.shotLow = this.codec.placeSubject(this.slotLows[slot] ?? 0, tile, this.graph.facingOf(tile))
      this.shotHigh = this.slotHighs[slot] ?? 0
      this.shotPortals = this.slotPortals[slot] ?? 0
      this.shotState = this.slotStates[slot] ?? null
      this.shotTile = this.slotTiles[slot] ?? tile

      return this.shotChanged
    }

    this.words[0] = this.codec.placeSubject(low, tile, directionIndex)
    this.words[1] = high

    const aimed = this.codec.decode(this.words, 0)
    const result = step(this.codec.index.chamber, aimed, action)

    encodeCanonical(this.codec, this.graph, result.state, this.words)
    this.stepCount++
    this.shotChanged = result.state !== aimed
    this.shotLow = this.words[0] ?? 0
    this.shotHigh = this.words[1] ?? 0
    this.shotPortals = countPortalsOpened(result.events)
    this.shotState = result.state
    this.shotTile = tile

    if (shares) {
      this.slotSerials[slot] = this.serial
      this.slotChanged[slot] = this.shotChanged ? 1 : 0
      this.slotLows[slot] = this.shotLow
      this.slotHighs[slot] = this.shotHigh
      this.slotPortals[slot] = this.shotPortals
      this.slotStates[slot] = this.shotState
      this.slotTiles[slot] = tile
    }

    return this.shotChanged
  }

  /**
   * The shot stops for a state's blocked flags: for each tile, four numbers
   * in DIRECTIONS order, each the tile where a shot that way stops, numbered
   * on the chamber with a row and column of outside around it.
   * @param state - A state with these flags
   * @param flags - Its blocked flags, as one number, the cache key
   * @returns The stops
   * @throws Error when a shot stops further outside the chamber than its edge
   */
  private stopsFor(state: RulesState, flags: number): Int32Array {
    const cached = this.stopsByFlags.get(flags)

    if (cached !== undefined) {
      return cached
    }

    const index = this.codec.index
    const chamber = index.chamber
    const stops = new Int32Array(index.tileCount * DIRECTIONS.length)

    for (let tile = 0; tile < index.tileCount; tile++) {
      DIRECTIONS.forEach((direction, directionIndex) => {
        const stop = shotStop(state, index.tileX(tile), index.tileY(tile), direction)

        if ((stop.x < -1) || (stop.y < -1) || (stop.x > chamber.width) || (stop.y > chamber.height)) {
          throw new Error(`a shot from tile ${tile} stops at ${stop.x},${stop.y}, beyond the chamber's edge`)
        }

        stops[(tile * DIRECTIONS.length) + directionIndex] = ((stop.y + 1) * this.paddedWidth) + stop.x + 1
      })
    }

    this.stopsByFlags.set(flags, stops)

    return stops
  }
}
