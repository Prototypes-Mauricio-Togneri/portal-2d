import {readFileSync} from 'node:fs'
import {basename} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseArgs} from 'node:util'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {loadChamber} from '@/game/rules/load_chamber'
import {Objective, searchBaseline} from '@/solver/baseline_search'
import {ChamberIndex} from '@/solver/chamber_index'
import {StateKeyCodec} from '@/solver/state_key_codec'
import {CHAMBERS_DIRECTORY, listChamberFiles} from '@scripts/chamber_files'
import {readNumberOption} from '@scripts/number_option'

// The solver's command (stage 02). For each chamber file given, or every
// chamber in src/chambers when none is, prints the chamber's size: its tiles,
// the wall sides a portal can open on, the blocked flags, boxes and buttons
// the state holds, the rough upper bound on its states, and its state key's
// width. With --baseline, also runs the reference search for both pars
// (fewest moves, fewest portals) and prints each route. Exits non-zero when
// a chamber fails to load or its key doesn't fit.
// Options: --baseline, --max-states=<number> for the search (default 1000000)

/** States the reference search keeps unless --max-states says otherwise */
const DEFAULT_MAX_STATES = 1_000_000

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
    },
  })
  const maxStates = readNumberOption(parsed.values['max-states'], DEFAULT_MAX_STATES, 'max-states')
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
