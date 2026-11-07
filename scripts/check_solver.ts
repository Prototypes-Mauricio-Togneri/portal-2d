import {readFileSync} from 'node:fs'
import {Action, ACTIONS} from '@/game/rules/action'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {loadChamber} from '@/game/rules/load_chamber'
import {runRulesReplay} from '@/game/rules/replay_runner'
import type {RulesState} from '@/game/rules/rules_state'
import {DIRECTIONS} from '@/game/rules/state_layout'
import {DELTAS, startChamber, step} from '@/game/rules/step'
import {countPortalsOpened} from '@/game/rules/step_counts'
import {Objective, searchBaseline} from '@/solver/baseline_search'
import {ChamberIndex, NO_NUMBER} from '@/solver/chamber_index'
import {MOVE_ACTIONS, TURN_ACTIONS} from '@/solver/macro_action'
import {encodeCanonical} from '@/solver/macro_route'
import {MacroSearch, SearchMode} from '@/solver/macro_search'
import {SHOT_ACTIONS, ShotLines} from '@/solver/shot_lines'
import {MAX_KEY_BITS, measureKey, StateKeyCodec} from '@/solver/state_key_codec'
import {NO_ACTION, NO_ENTRY, StateSet} from '@/solver/state_set'
import {NO_WALK, UNREACHED, WalkGraph} from '@/solver/walk_graph'
import {CHAMBER_FILES, CHAMBERS_DIRECTORY, listChamberFiles} from '@scripts/chamber_files'
import {createRandom} from '@scripts/seeded_random'
import {parseSolutionData} from '@scripts/solution_file'
import {SOLVER_FIXTURES, type SolverFixture, type SolverRoute} from '@scripts/solver_fixtures/solver_fixtures'

// Checks the solver (stage 02) with the rules under Node. The state key: on
// every chamber, every state along its recorded solution and along a seeded
// random walk packs into a key and unpacks to exactly the same state, and a
// chamber too large for the key is refused. The walk graph: from every state
// along each recorded solution and every state the reference search finds on
// the solver fixtures, each walk it allows gives through the rules' step the
// state the solver builds, no move it leaves out walks onto a plain tile, and
// turning gives the state the solver builds for that facing; each shot from
// each tile a walk reaches, each way and colour, gives through the rules'
// step the state the solver builds from the shot it shares with its line;
// and a tile a walk reaches shares the start's region exactly when a walk
// from it gets back to the start. The searches:
// on every solver fixture (scripts/solver_fixtures/), the reference search
// and the macro search find both hand-counted pars, the macro search also
// finds a route in its solvable mode, every route replays to the counts
// found, and every state the reference search found survives the key and is
// told apart by it. Prints one line per chamber and per fixture, and exits
// non-zero on any failure

/** Random steps per chamber whose states must survive the key */
const RANDOM_STEPS = 100_000

/** The random walk's seed */
const SEED = 1

/** The most states a search keeps on a solver fixture */
const MAX_SEARCH_STATES = 1_000_000

/** The longest the macro search runs on a solver fixture, in milliseconds */
const MAX_MACRO_MILLIS = 60_000

/**
 * Loads a chamber file, with the layout checks, and compiles it.
 * @param data - The chamber JSON
 * @returns The compiled chamber
 * @throws Error when the chamber has an error
 */
function compileChamber(data: unknown): CompiledChamber {
  const loaded = loadChamber(data)

  if (loaded.chamber === null) {
    throw new Error(`the rules can't load it: ${loaded.problems.map((problem) => problem.message).join('; ')}`)
  }

  return new CompiledChamber(loaded.chamber)
}

/**
 * Packs a state into a key, unpacks it, and checks nothing changed.
 * @param codec - The chamber's state key
 * @param state - The state
 * @param words - Room for one key
 * @throws Error when the state comes back different
 */
function checkRoundTrip(codec: StateKeyCodec, state: RulesState, words: Uint32Array): void {
  codec.encode(state, words, 0)

  const decoded = codec.decode(words, 0)

  if (decoded.key !== state.key) {
    throw new Error(`state ${state.hash} comes back from its key as ${decoded.hash}`)
  }
}

/**
 * Walks a chamber with seeded random actions, starting over whenever it is
 * completed, and hands over every state on the way.
 * @param chamber - The chamber
 * @param visit - Called with the start and each state after a step
 * @returns How many states it handed over
 */
function walkStates(chamber: CompiledChamber, visit: (state: RulesState) => void): number {
  const random = createRandom(SEED)
  const start = startChamber(chamber).state
  let state = start

  visit(start)

  for (let stepNumber = 1; stepNumber <= RANDOM_STEPS; stepNumber++) {
    // The index is always inside the list; the fallback only satisfies the type checker
    const action = ACTIONS[Math.floor(random() * ACTIONS.length)] ?? Action.UP

    state = step(chamber, state, action).state
    visit(state)

    if (state.completed) {
      state = start
    }
  }

  return RANDOM_STEPS + 1
}

/**
 * Checks the walk graph and the canonical facing against the rules' step
 * from each of a list of states: walking each walk edge with the move action
 * gives the state the solver builds by rewriting the key; no move the graph
 * leaves out lands on the plain tile next to it; and turning each way gives
 * the state the solver builds for that facing, or changes nothing where the
 * subject may not move that way.
 * @param codec - The chamber's state key
 * @param graph - The chamber's walk graph
 * @param states - The states to walk from
 * @returns How many moves and turns it checked
 * @throws Error naming the first that disagrees
 */
function checkWalks(codec: StateKeyCodec, graph: WalkGraph, states: readonly RulesState[]): number {
  const chamber = codec.index.chamber
  const index = codec.index
  const words = new Uint32Array(2)
  let checked = 0

  for (const state of states.filter((candidate) => !candidate.completed)) {
    encodeCanonical(codec, graph, state, words)

    const low = words[0] ?? 0
    const high = words[1] ?? 0
    const from = codec.subjectTileOf(low)
    const edges = graph.edgesFor(state, codec.flagsOf(low, high))
    const reachedCount = graph.walk(edges, from)
    const walkedTo = new Map<number, RulesState>()

    walkedTo.set(from, state)

    for (let position = 0; position < reachedCount; position++) {
      const tile = graph.reachedTile(position)
      const standing = walkedTo.get(tile)

      if (standing === undefined) {
        throw new Error(`the walk graph reaches tile ${tile} before the rules do (state ${state.hash})`)
      }

      DIRECTIONS.forEach((direction, directionIndex) => {
        const moved = step(chamber, standing, MOVE_ACTIONS[directionIndex] ?? Action.UP).state
        const target = edges[(tile * DIRECTIONS.length) + directionIndex] ?? NO_WALK

        checked++

        if ((target !== NO_WALK) && (!graph.isEventTile(tile))) {
          encodeCanonical(codec, graph, moved, words)

          if ((words[0] !== codec.placeSubject(low, target, graph.facingOf(target))) || (words[1] !== high)) {
            throw new Error(`walking ${direction} from tile ${tile} gives another state than the solver builds (state ${state.hash})`)
          }

          if (!walkedTo.has(target)) {
            walkedTo.set(target, moved)
          }
        } else if (!graph.isEventTile(tile)) {
          const neighbour = index.tileNumber(index.tileX(tile) + DELTAS[direction].dx, index.tileY(tile) + DELTAS[direction].dy)

          if ((neighbour !== NO_NUMBER) && (!graph.isEventTile(neighbour)) && (index.tileNumber(moved.subjectX, moved.subjectY) === neighbour)) {
            throw new Error(`walking ${direction} from tile ${tile} reaches a plain tile the walk graph leaves out (state ${state.hash})`)
          }
        }

        const turned = (standing.facing === direction) ? standing : step(chamber, standing, TURN_ACTIONS[directionIndex] ?? Action.TURN_UP).state

        checked++
        words[0] = codec.placeSubject(low, tile, directionIndex)
        words[1] = high

        if (graph.allowsWayFrom(tile, directionIndex) ? (turned.key !== codec.decode(words, 0).key) : (turned.key !== standing.key)) {
          throw new Error(`turning ${direction} on tile ${tile} gives another state than the solver builds (state ${state.hash})`)
        }
      })
    }
  }

  return checked
}

/**
 * What checking the shot lines gave.
 */
type ShotCheck = {
  readonly checked: number // Shots compared with the rules' step
  readonly reused: number // Of those, the shots the solver reused from another tile on their line
}

/**
 * Checks the shots the solver takes once per line (ShotLines) against the
 * rules' step from each of a list of states: from every tile a walk
 * reaches, turned each way the subject may move there, each shot through
 * the rules' step gives the state, and opens the portals, that the solver
 * builds from the first shot along its line.
 * @param codec - The chamber's state key
 * @param graph - The chamber's walk graph
 * @param states - The states to walk from
 * @returns How many shots it checked, and how many of them the solver reused
 * @throws Error naming the first that disagrees
 */
function checkShots(codec: StateKeyCodec, graph: WalkGraph, states: readonly RulesState[]): ShotCheck {
  const chamber = codec.index.chamber
  const lines = new ShotLines(codec, graph)
  const words = new Uint32Array(2)
  let checked = 0

  for (const state of states.filter((candidate) => !candidate.completed)) {
    encodeCanonical(codec, graph, state, words)

    const low = words[0] ?? 0
    const high = words[1] ?? 0
    const flags = codec.flagsOf(low, high)
    const reachedCount = graph.walk(graph.edgesFor(state, flags), codec.subjectTileOf(low))

    lines.begin(state, flags)

    for (let position = 0; position < reachedCount; position++) {
      const tile = graph.reachedTile(position)

      words[0] = codec.placeSubject(low, tile, graph.facingOf(tile))
      words[1] = high

      // checkWalks proves this is the state walking there gives
      const standing = codec.decode(words, 0)

      DIRECTIONS.forEach((direction, directionIndex) => {
        if (!graph.allowsWayFrom(tile, directionIndex)) {
          return
        }

        const turned = (standing.facing === direction) ? standing : step(chamber, standing, TURN_ACTIONS[directionIndex] ?? Action.TURN_UP).state

        for (const action of SHOT_ACTIONS) {
          const real = step(chamber, turned, action)
          const changed = lines.shoot(low, high, tile, directionIndex, action)

          checked++

          if (!changed) {
            if (real.state.key !== turned.key) {
              throw new Error(`${action} facing ${direction} from tile ${tile} changes the state, but the solver's shot changes nothing (state ${state.hash})`)
            }

            continue
          }

          encodeCanonical(codec, graph, real.state, words)

          if ((words[0] !== lines.childLow) || (words[1] !== lines.childHigh) || (real.state.completed !== lines.resultState.completed) || (countPortalsOpened(real.events) !== lines.portalsOpened)) {
            throw new Error(`${action} facing ${direction} from tile ${tile} gives another state than the solver builds (state ${state.hash})`)
          }
        }
      })
    }
  }

  return {
    checked: checked,
    reused: lines.reused,
  }
}

/**
 * Checks the regions against walks from each of a list of states: a tile
 * the walk from the subject's tile reaches has the same region exactly when
 * a walk from it reaches the subject's tile back, and no tile of that region
 * is smaller than the region's own number.
 * @param codec - The chamber's state key
 * @param graph - The chamber's walk graph
 * @param states - The states to walk from
 * @returns How many tiles it checked
 * @throws Error naming the first tile that disagrees
 */
function checkRegions(codec: StateKeyCodec, graph: WalkGraph, states: readonly RulesState[]): number {
  const words = new Uint32Array(2)
  let checked = 0

  for (const state of states.filter((candidate) => !candidate.completed)) {
    codec.encode(state, words, 0)

    const low = words[0] ?? 0
    const flags = codec.flagsOf(low, words[1] ?? 0)
    const edges = graph.edgesFor(state, flags)
    const regions = graph.regionsFor(state, flags)
    const from = codec.subjectTileOf(low)
    const reachedCount = graph.walk(edges, from)
    const reached: number[] = []

    for (let position = 0; position < reachedCount; position++) {
      reached.push(graph.reachedTile(position))
    }

    for (const tile of reached) {
      graph.walk(edges, tile)

      const walksBack = graph.distanceTo(from) !== UNREACHED
      const sameRegion = regions[tile] === regions[from]

      checked++

      if (sameRegion !== walksBack) {
        throw new Error(`tile ${tile} is ${sameRegion ? '' : 'not '}in the region of tile ${from}, but a walk from it ${walksBack ? 'gets' : 'doesn\'t get'} back (state ${state.hash})`)
      }

      if (sameRegion && (tile < (regions[from] ?? tile))) {
        throw new Error(`tile ${tile} is in region ${regions[from] ?? from}, a larger number (state ${state.hash})`)
      }
    }
  }

  return checked
}

/**
 * Checks the state key on a catalogue chamber, along its recorded solution
 * and a random walk, and the walk graph from every state along the solution.
 * @param file - The chamber's file name
 * @param data - The chamber JSON
 * @returns A short summary
 * @throws Error naming the state that doesn't survive the key, or the walk that disagrees with the rules
 */
function checkChamberKey(file: string, data: unknown): string {
  const chamber = compileChamber(data)
  const codec = new StateKeyCodec(new ChamberIndex(chamber))
  const graph = new WalkGraph(codec.index, startChamber(chamber).state)
  const words = new Uint32Array(2)
  const solutionUrl = new URL(file.replace(/\.json$/, '.solution.json'), CHAMBERS_DIRECTORY)
  const solution = parseSolutionData(JSON.parse(readFileSync(solutionUrl, 'utf8')))
  const solutionStates = runRulesReplay(chamber, solution.actions).states

  for (const state of solutionStates) {
    checkRoundTrip(codec, state, words)
  }

  const walked = walkStates(chamber, (state) => checkRoundTrip(codec, state, words))
  const walks = checkWalks(codec, graph, solutionStates)
  const shots = checkShots(codec, graph, solutionStates)
  const regions = checkRegions(codec, graph, solutionStates)

  return `key ${codec.widths.total} bits, ${solutionStates.length + walked} states survive it; ${walks} moves and turns agree with the walk graph; ${shots.checked} shots agree with the shot lines (${shots.reused} reused); ${regions} tiles agree with the regions`
}

/**
 * Checks that a chamber too large for the key is refused.
 * @returns A short summary
 * @throws Error when it is accepted, or refused for another reason
 */
function checkOversizedKey(): string {
  try {
    measureKey({
      tiles: 2 ** 20,
      sides: 2 ** 20,
      boxes: 2,
      flags: 0,
    })
  } catch (error) {
    if ((error instanceof Error) && error.message.endsWith(`at most ${MAX_KEY_BITS}`)) {
      return `refused: ${error.message}`
    }

    throw error
  }

  throw new Error('a key of over 64 bits was accepted')
}

/**
 * What checking one par gave.
 */
type ParCheck = {
  readonly states: readonly RulesState[] // Every distinct state the search found
  readonly summary: string // The par found, in words
}

/**
 * Runs the reference search for one par of a solver fixture and checks it
 * against the hand count, then replays the route it found.
 * @param chamber - The fixture's chamber
 * @param objective - Which par
 * @param route - The hand-written route for that par
 * @returns The states the search found, and a short summary
 * @throws Error when the search disagrees with the hand count, or its route doesn't replay to its counts
 */
function checkPar(chamber: CompiledChamber, objective: Objective, route: SolverRoute): ParCheck {
  const label = (objective === Objective.MOVES) ? 'fewest moves' : 'fewest portals'
  const result = searchBaseline(chamber, objective, MAX_SEARCH_STATES)

  if (!result.solved) {
    throw new Error(`${label}: the search ${result.gaveUp ? `gave up after ${result.states.length} states` : 'finds no route'}`)
  }

  if ((result.moves !== route.expected.moves) || (result.portals !== route.expected.portals)) {
    throw new Error(`${label}: the search finds ${result.moves} moves and ${result.portals} portals, the hand count is ${route.expected.moves} moves and ${route.expected.portals} portals`)
  }

  const replay = runRulesReplay(chamber, result.actions)

  if ((!replay.completed) || (replay.moves !== result.moves) || (replay.portals !== result.portals)) {
    throw new Error(`${label}: the route found doesn't replay to ${result.moves} moves and ${result.portals} portals`)
  }

  return {
    states: result.states,
    summary: `${label} ${result.moves} moves, ${result.portals} portals (${result.states.length} states)`,
  }
}

/**
 * Runs the macro search in one mode on a solver fixture and checks it: it
 * must find a route, a par mode the hand count, and the route must replay
 * through the rules to the counts it reports.
 * @param chamber - The fixture's chamber
 * @param mode - What the search looks for
 * @param route - The hand-written route for a par mode, or null for the solvable mode
 * @returns A short summary
 * @throws Error when it finds no route, disagrees with the hand count, or its route doesn't replay to its counts
 */
function checkMacro(chamber: CompiledChamber, mode: SearchMode, route: SolverRoute | null): string {
  const result = new MacroSearch(chamber, mode, MAX_SEARCH_STATES).run(MAX_MACRO_MILLIS)

  if (!result.solved) {
    throw new Error(`macro ${mode}: the search ${(result.gaveUp === null) ? 'finds no route' : `gave up (${result.gaveUp})`}`)
  }

  if ((route !== null) && ((result.moves !== route.expected.moves) || (result.portals !== route.expected.portals))) {
    throw new Error(`macro ${mode}: the search finds ${result.moves} moves and ${result.portals} portals, the hand count is ${route.expected.moves} moves and ${route.expected.portals} portals`)
  }

  const replay = runRulesReplay(chamber, result.actions)

  if ((!replay.completed) || (replay.moves !== result.moves) || (replay.portals !== result.portals)) {
    throw new Error(`macro ${mode}: the route found doesn't replay to ${result.moves} moves and ${result.portals} portals`)
  }

  return `${mode} ${result.moves} moves, ${result.portals} portals (${result.states} states)`
}

/**
 * Checks the reference search, the key and the state set on a solver
 * fixture, then the walk graph from every state the reference search found,
 * then the macro search in each mode.
 * @param fixture - The fixture
 * @returns A short summary
 * @throws Error saying what disagrees
 */
function checkSolverFixture(fixture: SolverFixture): string {
  const chamber = compileChamber(fixture.chamber)
  const codec = new StateKeyCodec(new ChamberIndex(chamber))
  const fewestMoves = checkPar(chamber, Objective.MOVES, fixture.fewestMoves)
  const fewestPortals = checkPar(chamber, Objective.PORTALS, fixture.fewestPortals)
  const states = (fewestMoves.states.length >= fewestPortals.states.length) ? fewestMoves.states : fewestPortals.states
  const words = new Uint32Array(2)
  const set = new StateSet(states.length)

  // Distinct states must get distinct keys, so the set ends as large as the list
  for (const state of states) {
    checkRoundTrip(codec, state, words)
    set.addIfAbsent(words[0] ?? 0, words[1] ?? 0, NO_ENTRY, NO_ACTION)
  }

  if (set.size !== states.length) {
    throw new Error(`${states.length} distinct states share ${set.size} keys`)
  }

  const graph = new WalkGraph(codec.index, startChamber(chamber).state)
  const walks = checkWalks(codec, graph, states)
  const shots = checkShots(codec, graph, states)
  const regions = checkRegions(codec, graph, states)
  const macro = [
    checkMacro(chamber, SearchMode.SOLVABLE, null),
    checkMacro(chamber, SearchMode.MOVES, fixture.fewestMoves),
    checkMacro(chamber, SearchMode.PORTALS, fixture.fewestPortals),
  ]

  return `reference ${fewestMoves.summary}; ${fewestPortals.summary}; key ${codec.widths.total} bits; ${walks} moves and turns agree with the walk graph; ${shots.checked} shots agree with the shot lines (${shots.reused} reused); ${regions} tiles agree with the regions; macro ${macro.join('; ')}`
}

/**
 * Runs every check and reports each one.
 * @returns Whether all of them passed
 */
function runAll(): boolean {
  let passed = true

  for (const file of listChamberFiles()) {
    const data = CHAMBER_FILES[file]

    if (data === undefined) {
      console.error(`${file} FAILED: not listed in scripts/chamber_files.ts`)
      passed = false
      continue
    }

    try {
      console.log(`${file} OK: ${checkChamberKey(file, data)}`)
    } catch (error) {
      console.error(`${file} FAILED: ${error instanceof Error ? error.message : String(error)}`)
      passed = false
    }
  }

  try {
    console.log(`oversized key OK: ${checkOversizedKey()}`)
  } catch (error) {
    console.error(`oversized key FAILED: ${error instanceof Error ? error.message : String(error)}`)
    passed = false
  }

  if (SOLVER_FIXTURES.length === 0) {
    console.error('solver fixtures FAILED: scripts/solver_fixtures/solver_fixtures.ts lists none')
    passed = false
  }

  for (const fixture of SOLVER_FIXTURES) {
    try {
      console.log(`solver fixture ${fixture.name} OK: ${checkSolverFixture(fixture)}`)
    } catch (error) {
      console.error(`solver fixture ${fixture.name} FAILED: ${error instanceof Error ? error.message : String(error)}`)
      passed = false
    }
  }

  return passed
}

if (!runAll()) {
  process.exitCode = 1
}
