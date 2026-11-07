import {readFileSync} from 'node:fs'
import {Action, ACTIONS} from '@/game/rules/action'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {loadChamber} from '@/game/rules/load_chamber'
import {runRulesReplay} from '@/game/rules/replay_runner'
import type {RulesState} from '@/game/rules/rules_state'
import {startChamber, step} from '@/game/rules/step'
import {Objective, searchBaseline} from '@/solver/baseline_search'
import {ChamberIndex} from '@/solver/chamber_index'
import {MAX_KEY_BITS, measureKey, StateKeyCodec} from '@/solver/state_key_codec'
import {NO_ACTION, NO_ENTRY, StateSet} from '@/solver/state_set'
import {CHAMBER_FILES, CHAMBERS_DIRECTORY, listChamberFiles} from '@scripts/chamber_files'
import {createRandom} from '@scripts/seeded_random'
import {parseSolutionData} from '@scripts/solution_file'
import {SOLVER_FIXTURES, type SolverFixture, type SolverRoute} from '@scripts/solver_fixtures/solver_fixtures'

// Checks the solver (stage 02) with the rules under Node. The state key: on
// every chamber, every state along its recorded solution and along a seeded
// random walk packs into a key and unpacks to exactly the same state, and a
// chamber too large for the key is refused. The reference search: on every
// solver fixture (scripts/solver_fixtures/), it finds both hand-counted pars,
// its routes replay to the same counts, and every state it found survives
// the key and is told apart by it. Prints one line per chamber and per
// fixture, and exits non-zero on any failure

/** Random steps per chamber whose states must survive the key */
const RANDOM_STEPS = 100_000

/** The random walk's seed */
const SEED = 1

/** The most states the reference search keeps on a solver fixture */
const MAX_SEARCH_STATES = 1_000_000

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
 * Checks the state key on a catalogue chamber, along its recorded solution
 * and a random walk.
 * @param file - The chamber's file name
 * @param data - The chamber JSON
 * @returns A short summary
 * @throws Error naming the state that doesn't survive the key
 */
function checkChamberKey(file: string, data: unknown): string {
  const chamber = compileChamber(data)
  const codec = new StateKeyCodec(new ChamberIndex(chamber))
  const words = new Uint32Array(2)
  const solutionUrl = new URL(file.replace(/\.json$/, '.solution.json'), CHAMBERS_DIRECTORY)
  const solution = parseSolutionData(JSON.parse(readFileSync(solutionUrl, 'utf8')))
  const solutionStates = runRulesReplay(chamber, solution.actions).states

  for (const state of solutionStates) {
    checkRoundTrip(codec, state, words)
  }

  const walked = walkStates(chamber, (state) => checkRoundTrip(codec, state, words))

  return `key ${codec.widths.total} bits, ${solutionStates.length + walked} states survive it`
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
 * Checks the reference search, the key and the state set on a solver
 * fixture.
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

  return `${fewestMoves.summary}; ${fewestPortals.summary}; key ${codec.widths.total} bits`
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
