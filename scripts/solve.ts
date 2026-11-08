import {readFileSync} from 'node:fs'
import {basename} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseArgs} from 'node:util'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {loadChamber} from '@/game/rules/load_chamber'
import {runRulesReplay} from '@/game/rules/replay_runner'
import {Objective, searchBaseline} from '@/solver/baseline_search'
import {ChamberIndex} from '@/solver/chamber_index'
import {MacroSearch, SearchMode} from '@/solver/macro_search'
import {StateKeyCodec} from '@/solver/state_key_codec'
import {CHAMBERS_DIRECTORY, listChamberFiles} from '@scripts/chamber_files'
import {readNumberOption} from '@scripts/number_option'

// The solver's command (stage 02). For each chamber file given, or every
// chamber in src/chambers when none is, prints the chamber's size: its tiles,
// the wall sides a portal can open on, the blocked flags, boxes and buttons
// the state holds, the rough upper bound on its states, and its state key's
// width. With --baseline, also runs the reference search for both pars
// (fewest moves, fewest portals); with --solvable, the macro search for any
// route; with --par, the macro search for both pars. Each search prints what
// it found, its states and effort, time and peak memory, and the route found,
// which a macro search also replays through the rules. Exits non-zero when a
// chamber fails to load, its key doesn't fit, or a route doesn't replay.
// Options: --baseline, --solvable, --par, --max-states=<number> for each
// search (default 1000000), --max-seconds=<number> for each macro search
// (default 300)

/** States a search keeps unless --max-states says otherwise */
const DEFAULT_MAX_STATES = 1_000_000

/** Seconds a macro search runs unless --max-seconds says otherwise */
const DEFAULT_MAX_SECONDS = 300

/** Bytes in a mebibyte, for the report */
const MEBIBYTE = 1024 * 1024

/**
 * The rough upper bound on a chamber's states, as a power of ten: every
 * tile and facing, both portals on any wall side or closed, every box on
 * any tile or carried, and every flag either way.
 * @param index - The chamber's numbered tiles and wall sides
 * @returns The bound's exponent
 */
function upperBoundExponent(index: ChamberIndex): number {
  const layout = index.chamber.stateLayout

  return Math.log10(index.tileCount * 4) + (2 * Math.log10(index.sideCount + 1)) + (layout.boxCount * Math.log10(index.tileCount + 1)) + (layout.flagCount * Math.log10(2))
}

/**
 * Describes a chamber's size.
 * @param index - The chamber's numbered tiles and wall sides
 * @param codec - The chamber's state key
 * @returns One line
 */
function describeSize(index: ChamberIndex, codec: StateKeyCodec): string {
  const chamber = index.chamber
  const layout = chamber.stateLayout

  return [
    `${chamber.width}×${chamber.height}`,
    `${index.tileCount} tiles`,
    `${index.sideCount} portal wall sides`,
    `${layout.flagCount} flags`,
    `${layout.boxCount} boxes`,
    `${layout.buttonCount} buttons`,
    `${layout.length} state values`,
    `upper bound ~10^${upperBoundExponent(index).toFixed(1)}`,
    `key ${codec.widths.total} bits`,
  ].join(', ')
}

/**
 * Runs the reference search for one objective and describes what it found.
 * @param chamber - The chamber
 * @param objective - What to make as few as possible
 * @param maxStates - The most states to keep
 * @returns One line, then the route as JSON when it found one
 */
function describeSearch(chamber: CompiledChamber, objective: Objective, maxStates: number): string {
  const startTime = performance.now()
  const result = searchBaseline(chamber, objective, maxStates)
  const seconds = ((performance.now() - startTime) / 1000).toFixed(2)
  const effort = `${result.states.length} states, ${result.expanded} expanded, ${seconds} s`
  const label = (objective === Objective.MOVES) ? 'fewest moves' : 'fewest portals'

  if (result.solved) {
    return `  ${label}: ${result.moves} moves, ${result.portals} portals (${effort})\n    ${JSON.stringify(result.actions)}`
  }

  return `  ${label}: ${result.gaveUp ? 'gave up' : 'unsolvable'} (${effort})`
}

/**
 * Runs the macro search in one mode and describes what it found, replaying
 * the route through the rules.
 * @param chamber - The chamber
 * @param mode - What to look for
 * @param maxStates - The most states to keep
 * @param maxSeconds - The longest to run
 * @returns One line, then the route as JSON when it found one
 * @throws Error when the route found doesn't replay to the counts found
 */
function describeMacro(chamber: CompiledChamber, mode: SearchMode, maxStates: number, maxSeconds: number): string {
  const startTime = performance.now()
  let peakRss = process.memoryUsage().rss

  const result = new MacroSearch(chamber, mode, maxStates).run(maxSeconds * 1000, () => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss)
  })

  peakRss = Math.max(peakRss, process.memoryUsage().rss)

  const seconds = ((performance.now() - startTime) / 1000).toFixed(1)
  const effort = `${result.states} states, ${result.expanded} expanded, ${result.steps} steps (${result.shots} shots, ${result.interacts} interacts, ${result.moveTries} other moves), ${result.shotsReused} shots reused, ${result.interactsSkipped} interacts, ${result.movesSkipped} other moves and ${result.dropsSkipped} drops skipped, ${seconds} s, peak rss ${(peakRss / MEBIBYTE).toFixed(0)} MiB`

  if (!result.solved) {
    return `  macro ${mode}: ${(result.gaveUp === null) ? 'unsolvable' : `gave up (${result.gaveUp})`} (${effort})`
  }

  const replay = runRulesReplay(chamber, result.actions)

  if ((!replay.completed) || (replay.moves !== result.moves) || (replay.portals !== result.portals)) {
    throw new Error(`the macro ${mode} route doesn't replay to ${result.moves} moves and ${result.portals} portals`)
  }

  return `  macro ${mode}: ${result.moves} moves, ${result.portals} portals (${effort})\n    ${JSON.stringify(result.actions)}`
}

/**
 * Lists the chamber files to solve.
 * @param positionals - The paths given on the command line
 * @returns Each file's path
 */
function listPaths(positionals: readonly string[]): string[] {
  if (positionals.length > 0) {
    return [...positionals]
  }

  return listChamberFiles().map((file) => fileURLToPath(new URL(file, CHAMBERS_DIRECTORY)))
}

/**
 * Solves every chamber file asked for and reports each one.
 * @returns Whether every chamber loaded and its key fit
 */
function runAll(): boolean {
  const parsed = parseArgs({
    allowPositionals: true,
    options: {
      'baseline': {
        type: 'boolean',
      },
      'max-states': {
        type: 'string',
      },
      'max-seconds': {
        type: 'string',
      },
      'par': {
        type: 'boolean',
      },
      'solvable': {
        type: 'boolean',
      },
    },
  })
  const maxStates = readNumberOption(parsed.values['max-states'], DEFAULT_MAX_STATES, 'max-states')
  const maxSeconds = readNumberOption(parsed.values['max-seconds'], DEFAULT_MAX_SECONDS, 'max-seconds')
  let passed = true

  for (const path of listPaths(parsed.positionals)) {
    const name = basename(path)

    try {
      const loaded = loadChamber(JSON.parse(readFileSync(path, 'utf8')))

      if (loaded.chamber === null) {
        throw new Error(`the rules can't load it: ${loaded.problems.map((problem) => problem.message).join('; ')}`)
      }

      const chamber = new CompiledChamber(loaded.chamber)
      const index = new ChamberIndex(chamber)

      console.log(`${name}: ${describeSize(index, new StateKeyCodec(index))}`)

      if (parsed.values.baseline === true) {
        console.log(describeSearch(chamber, Objective.MOVES, maxStates))
        console.log(describeSearch(chamber, Objective.PORTALS, maxStates))
      }

      if (parsed.values.solvable === true) {
        console.log(describeMacro(chamber, SearchMode.SOLVABLE, maxStates, maxSeconds))
      }

      if (parsed.values.par === true) {
        console.log(describeMacro(chamber, SearchMode.MOVES, maxStates, maxSeconds))
        console.log(describeMacro(chamber, SearchMode.PORTALS, maxStates, maxSeconds))
      }
    } catch (error) {
      console.error(`${name} FAILED: ${error instanceof Error ? error.message : String(error)}`)
      passed = false
    }
  }

  return passed
}

if (!runAll()) {
  process.exitCode = 1
}
