import {Action} from '@/game/rules/action'
import type {CompiledChamber} from '@/game/rules/compiled_chamber'
import type {RulesState} from '@/game/rules/rules_state'
import {DIRECTIONS} from '@/game/rules/state_layout'
import {startChamber, step} from '@/game/rules/step'
import {countPortalsOpened, countsAsMove} from '@/game/rules/step_counts'
import {costOf, Objective} from '@/solver/baseline_search'
import {ChamberIndex} from '@/solver/chamber_index'
import {CostHeap} from '@/solver/cost_heap'
import {MAX_MACRO_TILES, MOVE_ACTIONS, packMacro} from '@/solver/macro_action'
import {encodeCanonical, expandRoute, foldSubject, type MacroStep} from '@/solver/macro_route'
import {SHOT_ACTIONS, ShotLines} from '@/solver/shot_lines'
import {StateKeyCodec} from '@/solver/state_key_codec'
import {NO_ACTION, NO_ENTRY, StateSet} from '@/solver/state_set'
import {NO_WALK, WalkGraph} from '@/solver/walk_graph'

/**
 * What a macro search looks for: any route (whether the chamber can be
 * completed), or the fewest moves, or the fewest portals.
 */
export type SearchMode = 'solvable' | Objective

/**
 * Named values of SearchMode.
 */
export const SearchMode = {
  SOLVABLE: 'solvable',
  MOVES: Objective.MOVES,
  PORTALS: Objective.PORTALS,
} as const

/**
 * Why a search stopped before it found a route or saw every state.
 */
export type GiveUpReason = 'states' | 'time'

/**
 * What a macro search found.
 */
export type MacroSearchResult = {
  readonly solved: boolean // Whether it found a route to the completed chamber
  readonly gaveUp: GiveUpReason | null // Why it stopped early, or null when it didn't
  readonly moves: number // The route's moves, when solved
  readonly portals: number // The route's portals opened, when solved
  readonly actions: readonly Action[] // The route, when solved
  readonly states: number // Distinct states kept
  readonly expanded: number // States whose macro actions it tried
  readonly steps: number // Calls to the rules' step
  readonly shots: number // Shots taken through the rules' step
  readonly shotsReused: number // Shots reused from another tile on their line instead
  readonly interacts: number // Interacts tried
  readonly moveTries: number // Moves tried that a walk doesn't cover: onto or off an event tile, into a wall or a portal
}

/** Expanded states between two looks at the clock */
const CLOCK_INTERVAL = 64

/** Expanded states between two progress calls */
export const PROGRESS_INTERVAL = 4096

/**
 * The solver's macro search (stage 02, steps A7 and A8). A state is a
 * settled state of the rules with the subject turned to its tile's canonical
 * facing, since turning is free. From each state it walks, without the
 * rules' step, to every tile walk edges reach (WalkGraph), then tries there
 * each action whose effect a walk can't have, through the rules' step:
 * interact, both shots each way the subject may face, and each move a walk
 * doesn't cover (onto or off an event tile, into a wall, which crosses a
 * portal there). Each shot line takes its shots through the rules' step once
 * per state, and its other tiles reuse them (ShotLines). A macro action
 * costs the walk's moves plus what the step counts. States are kept as
 * 64-bit keys in a StateSet, with their costs and macro actions in typed
 * arrays. In the solvable mode it stores the subject on its region's tile
 * (foldSubject), since states that differ only in where the subject stands
 * inside a region reach the same states, searches breadth first and stops
 * at the first completed state; the route's counts are then those of the
 * actions it expands to. In the moves and portals modes it keeps the
 * subject's tile and takes the cheapest state first (Dijkstra's algorithm),
 * so the first completed state taken off the queue ends an optimal route.
 */
export class MacroSearch {
  private readonly chamber: CompiledChamber // The chamber
  private readonly codec: StateKeyCodec // The chamber's state key
  private readonly graph: WalkGraph // Where the subject can walk
  private readonly lines: ShotLines // The shots, taken once per line
  private readonly mode: SearchMode // What the search looks for
  private readonly folded: boolean // Whether states keep the subject on its region's tile, in the solvable mode
  private readonly set: StateSet // Every state found, as keys, with its parent
  private readonly moves: Uint32Array // Each state's moves on the cheapest known way to it
  private readonly portals: Uint32Array // Each state's portals opened on that way
  private readonly macros: Uint32Array // The packed macro action that reached each state
  private readonly queue = new CostHeap() // The states left to expand, cheapest first (moves and portals modes)
  private readonly words = new Uint32Array(2) // Room for one key
  private solvedEntry = NO_ENTRY // The completed state that ends the route found, or NO_ENTRY
  private gaveUp: GiveUpReason | null = null // Why the search stopped early, or null
  private expanded = 0 // States whose macro actions were tried
  private steps = 0 // Calls to the rules' step
  private interacts = 0 // Interacts tried
  private moveTries = 0 // Moves tried that a walk doesn't cover

  /**
   * @param chamber - The chamber
   * @param mode - What to look for
   * @param maxStates - The most states to keep
   * @throws Error when the chamber's key doesn't fit 64 bits, or it has too many tiles to pack
   */
  constructor(chamber: CompiledChamber, mode: SearchMode, maxStates: number) {
    const index = new ChamberIndex(chamber)

    if (index.tileCount > MAX_MACRO_TILES) {
      throw new Error(`The chamber has ${index.tileCount} tiles, more than a macro action can name`)
    }

    this.chamber = chamber
    this.codec = new StateKeyCodec(index)
    this.graph = new WalkGraph(index, startChamber(chamber).state)
    this.lines = new ShotLines(this.codec, this.graph)
    this.mode = mode
    this.folded = mode === SearchMode.SOLVABLE
    this.set = new StateSet(maxStates)
    this.moves = new Uint32Array(maxStates)
    this.portals = new Uint32Array(maxStates)
    this.macros = new Uint32Array(maxStates)
  }

  /**
   * Runs the search from the chamber's settled start.
   * @param maxMillis - The longest to run, in milliseconds
   * @param onProgress - Called every PROGRESS_INTERVAL expanded states, with the states kept
   * @returns What it found
   * @throws Error when the rules throw, or a route found doesn't replay to the states stored
   */
  run(maxMillis: number, onProgress?: (states: number) => void): MacroSearchResult {
    const startTime = Date.now()
    const start = startChamber(this.chamber)

    this.encodeKey(start.state)
    this.set.addIfAbsent(this.words[0] ?? 0, this.words[1] ?? 0, NO_ENTRY, NO_ACTION)
    this.portals[0] = countPortalsOpened(start.events)

    /**
     * Whether the search should stop: it found its route or gave up, or its
     * time ran out, checked every CLOCK_INTERVAL expanded states.
     * @returns True to stop
     */
    const shouldStop = (): boolean => {
      if ((this.solvedEntry !== NO_ENTRY) || (this.gaveUp !== null)) {
        return true
      }

      if ((this.expanded % CLOCK_INTERVAL) === 0) {
        if ((Date.now() - startTime) > maxMillis) {
          this.gaveUp = 'time'

          return true
        }

        if ((this.expanded % PROGRESS_INTERVAL) === 0) {
          onProgress?.(this.set.size)
        }
      }

      return false
    }

    if (this.mode === SearchMode.SOLVABLE) {
      // The set numbers states in the order found, so it is the breadth-first queue
      for (let entry = 0; (entry < this.set.size) && (!shouldStop()); entry++) {
        this.expand(entry, this.decodeEntry(entry))
      }
    } else {
      this.queue.push(this.costOf(0), 0)

      while ((this.queue.size > 0) && (!shouldStop())) {
        const cost = this.queue.lowestCost
        const entry = this.queue.pop()

        // A state queued again at a lower cost leaves its older entries behind
        if (cost !== this.costOf(entry)) {
          continue
        }

        const state = this.decodeEntry(entry)

        if (state.completed) {
          this.solvedEntry = entry
          break
        }

        this.expand(entry, state)
      }
    }

    return this.buildResult()
  }

  /**
   * A state's cost in the moves or portals mode.
   * @param entry - The state's entry
   * @returns The cost
   */
  private costOf(entry: number): number {
    return costOf((this.mode === SearchMode.PORTALS) ? Objective.PORTALS : Objective.MOVES, this.moves[entry] ?? 0, this.portals[entry] ?? 0)
  }

  /**
   * Packs a state into the words as the search stores it: with the
   * canonical facing, and in the solvable mode on its region's tile.
   * @param state - The state
   */
  private encodeKey(state: RulesState): void {
    encodeCanonical(this.codec, this.graph, state, this.words)

    if (this.folded) {
      foldSubject(this.codec, this.graph, state, this.words)
    }
  }

  /**
   * The low word of a key with the subject moved to a tile, as the search
   * stores it: facing the tile's canonical way, and in the solvable mode on
   * the tile's region instead.
   * @param low - The key's low word
   * @param tile - The subject's tile
   * @param regions - Each tile's region for the key's flags, or null outside the solvable mode
   * @returns The low word
   */
  private placeStored(low: number, tile: number, regions: Int32Array | null): number {
    const place = (regions === null) ? tile : (regions[tile] ?? tile)

    return this.codec.placeSubject(low, place, this.graph.facingOf(place))
  }

  /**
   * Unpacks a key.
   * @param low - The key's low word
   * @param high - The key's high word
   * @returns The state
   */
  private decodeKey(low: number, high: number): RulesState {
    this.words[0] = low
    this.words[1] = high

    return this.codec.decode(this.words, 0)
  }

  /**
   * Unpacks a stored state.
   * @param entry - The state's entry
   * @returns The state
   */
  private decodeEntry(entry: number): RulesState {
    return this.decodeKey(this.set.keyLow(entry), this.set.keyHigh(entry))
  }

  /**
   * Tries every macro action from a state.
   * @param entry - The state's entry
   * @param state - The state, unpacked
   */
  private expand(entry: number, state: RulesState): void {
    const low = this.set.keyLow(entry)
    const high = this.set.keyHigh(entry)
    const flags = this.codec.flagsOf(low, high)
    const edges = this.graph.edgesFor(state, flags)
    const regions = this.folded ? this.graph.regionsFor(state, flags) : null
    const from = this.codec.subjectTileOf(low)
    const reachedCount = this.graph.walk(edges, from)

    this.expanded++
    this.lines.begin(state, flags)

    for (let position = 0; position < reachedCount; position++) {
      const tile = this.graph.reachedTile(position)
      const distance = this.graph.distanceTo(tile)
      const walkedLow = this.codec.placeSubject(low, tile, this.graph.facingOf(tile))
      const standing = (tile === from) ? state : this.decodeKey(walkedLow, high)
      const standingLow = this.placeStored(low, tile, regions)

      this.interacts++
      this.tryAction(entry, standing, standingLow, high, Action.INTERACT, tile, distance)

      for (let directionIndex = 0; directionIndex < DIRECTIONS.length; directionIndex++) {
        // A walk covers a walk edge, except off an event tile, where leaving can change the state
        if (this.graph.isEventTile(tile) || (edges[(tile * DIRECTIONS.length) + directionIndex] === NO_WALK)) {
          this.moveTries++
          this.tryAction(entry, standing, standingLow, high, MOVE_ACTIONS[directionIndex] ?? Action.UP, tile, distance)
        }
      }

      for (let directionIndex = 0; directionIndex < DIRECTIONS.length; directionIndex++) {
        if (this.graph.allowsWayFrom(tile, directionIndex)) {
          for (const action of SHOT_ACTIONS) {
            this.tryShot(entry, low, high, standingLow, regions, action, tile, directionIndex, distance)
          }
        }
      }

      if ((this.solvedEntry !== NO_ENTRY) || (this.gaveUp !== null)) {
        return
      }
    }
  }

  /**
   * Takes one action through the rules' step and keeps the state it leads
   * to, unless nothing changed but where the subject faces, or in the
   * solvable mode where it stands inside its region.
   * @param parent - The entry of the state the macro action starts from
   * @param from - The state the action is taken in: the subject on the tile walked to
   * @param standingLow - The low word of that state's key as the search stores it
   * @param high - The high word of that key
   * @param action - The action
   * @param tile - The tile walked to
   * @param distance - The moves walked to the tile
   */
  private tryAction(parent: number, from: RulesState, standingLow: number, high: number, action: Action, tile: number, distance: number): void {
    if ((this.solvedEntry !== NO_ENTRY) || (this.gaveUp !== null)) {
      return
    }

    const result = step(this.chamber, from, action)

    this.steps++

    if (result.state === from) {
      return
    }

    this.encodeKey(result.state)

    const childLow = this.words[0] ?? 0
    const childHigh = this.words[1] ?? 0

    if ((childLow === standingLow) && (childHigh === high)) {
      return
    }

    this.keep(parent, childLow, childHigh, distance + (countsAsMove(from, result.state) ? 1 : 0), countPortalsOpened(result.events), packMacro(tile, 0, action), result.state.completed)
  }

  /**
   * Takes one shot, through the rules' step once per line (ShotLines), and
   * keeps the state it leads to, unless nothing changed but where the
   * subject faces. In the solvable mode a line gives one state per region
   * it crosses: a tile in the region of the tile that took the line's shot
   * would give that tile's state again, so it is skipped.
   * @param parent - The entry of the state the macro action starts from
   * @param low - The low word of that state's key
   * @param high - The high word of that key
   * @param standingLow - The low word of the key, as the search stores it, with the subject on the tile walked to
   * @param regions - Each tile's region for the state's flags, or null outside the solvable mode
   * @param action - The shot, blue or orange
   * @param tile - The tile walked to
   * @param directionIndex - The way faced before the shot
   * @param distance - The moves walked to the tile
   */
  private tryShot(parent: number, low: number, high: number, standingLow: number, regions: Int32Array | null, action: Action, tile: number, directionIndex: number, distance: number): void {
    if ((this.solvedEntry !== NO_ENTRY) || (this.gaveUp !== null) || (!this.lines.shoot(low, high, tile, directionIndex, action))) {
      return
    }

    const lineTile = this.lines.lineTile

    if ((regions !== null) && (lineTile !== tile) && (regions[lineTile] === regions[tile])) {
      return
    }

    this.words[0] = this.lines.childLow
    this.words[1] = this.lines.childHigh

    if (this.folded) {
      foldSubject(this.codec, this.graph, this.lines.resultState, this.words)
    }

    const childLow = this.words[0] ?? 0
    const childHigh = this.words[1] ?? 0

    if ((childLow === standingLow) && (childHigh === high)) {
      return
    }

    // A shot never moves the subject, which the solver check confirms
    this.keep(parent, childLow, childHigh, distance, this.lines.portalsOpened, packMacro(tile, directionIndex, action), this.lines.resultState.completed)
  }

  /**
   * Keeps the state a macro action leads to: adds it when it is new, or in
   * the moves and portals modes lowers its cost when this way is cheaper.
   * @param parent - The entry of the state the macro action starts from
   * @param childLow - The low word of the key of the state it leads to
   * @param childHigh - The high word of that key
   * @param movesTaken - The moves the macro action takes, its walk included
   * @param portalsOpened - The portals it opens
   * @param macro - The packed macro action
   * @param completed - Whether the state it leads to is completed
   */
  private keep(parent: number, childLow: number, childHigh: number, movesTaken: number, portalsOpened: number, macro: number, completed: boolean): void {
    const moves = (this.moves[parent] ?? 0) + movesTaken
    const portals = (this.portals[parent] ?? 0) + portalsOpened
    const known = this.set.find(childLow, childHigh)

    if (known === NO_ENTRY) {
      if (this.set.size >= this.set.capacity) {
        this.gaveUp = 'states'

        return
      }

      const child = this.set.addIfAbsent(childLow, childHigh, parent, NO_ACTION)

      this.moves[child] = moves
      this.portals[child] = portals
      this.macros[child] = macro

      if (this.mode === SearchMode.SOLVABLE) {
        if (completed) {
          this.solvedEntry = child
        }
      } else {
        this.queue.push(this.costOf(child), child)
      }

      return
    }

    if ((this.mode !== SearchMode.SOLVABLE) && (costOf((this.mode === SearchMode.PORTALS) ? Objective.PORTALS : Objective.MOVES, moves, portals) < this.costOf(known))) {
      this.moves[known] = moves
      this.portals[known] = portals
      this.macros[known] = macro
      this.set.setParent(known, parent, NO_ACTION)
      this.queue.push(this.costOf(known), known)
    }
  }

  /**
   * What the search gives: the route found, turned back into actions.
   * @returns The result
   */
  private buildResult(): MacroSearchResult {
    const solved = this.solvedEntry !== NO_ENTRY
    const route: MacroStep[] = []

    for (let entry = this.solvedEntry; (entry !== NO_ENTRY) && (entry !== 0); entry = this.set.parentOf(entry)) {
      route.push({
        macro: this.macros[entry] ?? 0,
        low: this.set.keyLow(entry),
        high: this.set.keyHigh(entry),
      })
    }

    const expandedRoute = solved ? expandRoute(this.codec, this.graph, route.reverse(), this.folded) : null

    // A folded state's costs count the walk from its region's tile, not from where the subject stood
    return {
      solved: solved,
      gaveUp: solved ? null : this.gaveUp,
      moves: (expandedRoute === null) ? 0 : (this.folded ? expandedRoute.moves : (this.moves[this.solvedEntry] ?? 0)),
      portals: (expandedRoute === null) ? 0 : (this.folded ? expandedRoute.portals : (this.portals[this.solvedEntry] ?? 0)),
      actions: (expandedRoute === null) ? [] : expandedRoute.actions,
      states: this.set.size,
      expanded: this.expanded,
      steps: this.steps + this.lines.steps,
      shots: this.lines.steps,
      shotsReused: this.lines.reused,
      interacts: this.interacts,
      moveTries: this.moveTries,
    }
  }
}
