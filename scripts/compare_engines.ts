import {existsSync, readFileSync} from 'node:fs'
import {parseArgs} from 'node:util'
import type {ChamberData} from '@/game/chamber_data'
import {Action, ACTIONS} from '@/game/rules/action'
import {CHAMBER_FILES, CHAMBERS_DIRECTORY, listChamberFiles} from '@scripts/chamber_files'
import {checkCompiledLookups} from '@scripts/engine_comparison/compiled_lookups'
import {readSolutionAction} from '@scripts/engine_comparison/compared_action'
import {type Comparison, compareStep, createComparison, startBoth} from '@scripts/engine_comparison/comparison'
import {checkPinnedFixture, findUnpinnedFixtures, PINNED_FIXTURES} from '@scripts/engine_comparison/fixture_comparison'
import {FIXTURES} from '@scripts/fixtures/fixtures'
import {readNumberOption} from '@scripts/number_option'
import {createRandom} from '@scripts/seeded_random'

// Plays every chamber on today's rules (src/game/classic/) and on the v2
// rules, one action at a time, and compares the state and the events after
// every step. A difference that docs/elements.md lists under "Changes from
// the original rules" is counted under its id, and the run carries on from
// v2's state; any other difference fails. First every chamber file and
// fixture chamber is compiled for the v2 rules, and each lookup of the
// compiled chamber must agree with today's rules on every tile. Then each
// behaviour fixture without undo or redo is played on both engines, one
// settled step per key frame, and must show exactly the intended difference
// it pins, at its step (or none, for those pinning a key pressed before a
// late effect lands); then, per chamber, its recorded solution and a seeded
// random walk are compared, then a seeded random walk on each fixture
// chamber. Prints one line per compiled chamber, per fixture and per
// chamber, and exits non-zero on any failure.
// Options: --seed=<number> (default 1), --steps=<number> per chamber and per fixture chamber (default 100000)

/** Steps per chamber unless --steps says otherwise */
const DEFAULT_STEPS = 100_000

/** Seed unless --seed says otherwise */
const DEFAULT_SEED = 1

/**
 * Reads the presses of a chamber's recorded solution. The replay check
 * validates the rest of the file.
 * @param file - The chamber's file name
 * @returns The presses, in their text form
 * @throws Error when there is no solution or it has no list of actions
 */
function readSolutionActions(file: string): string[] {
  const solutionFile = file.replace(/\.json$/, '.solution.json')
  const solutionUrl = new URL(solutionFile, CHAMBERS_DIRECTORY)

  if (!existsSync(solutionUrl)) {
    throw new Error(`no solution recorded in src/chambers/${solutionFile}`)
  }

  const parsed: unknown = JSON.parse(readFileSync(solutionUrl, 'utf8'))
  const actions: unknown = ((typeof parsed === 'object') && (parsed !== null) && ('actions' in parsed)) ? parsed.actions : null

  if (!Array.isArray(actions)) {
    throw new Error(`${solutionFile} has no list of actions`)
  }

  const actionValues: readonly unknown[] = actions

  return actionValues.map((action) => String(action))
}

/**
 * Plays a chamber's recorded solution on both engines, one press per step.
 * @param comparison - The chamber on both engines, at its start
 * @param file - The chamber's file name
 * @returns A short summary
 * @throws Error naming the step that failed
 */
function compareSolution(comparison: Comparison, file: string): string {
  const actions = readSolutionActions(file)

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i] ?? ''

    try {
      compareStep(comparison, readSolutionAction(action))
    } catch (error) {
      throw new Error(`solution step ${i + 1} (${action}): ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      })
    }
  }

  return `solution ${actions.length} steps (${comparison.v2.view.chamberCompleted ? 'completed' : 'not completed'})`
}

/**
 * Walks a chamber on both engines with seeded random actions, starting over
 * whenever it is completed, as live play stops at the exit.
 * @param comparison - The chamber on both engines
 * @param steps - How many steps to take
 * @param seed - The seed for the actions
 * @returns A short summary
 * @throws Error naming the step that failed
 */
function compareWalk(comparison: Comparison, steps: number, seed: number): string {
  const random = createRandom(seed)
  let restarts = 0

  startBoth(comparison)

  for (let step = 1; step <= steps; step++) {
    // The index is always inside the list; the fallback only satisfies the type checker
    const action = ACTIONS[Math.floor(random() * ACTIONS.length)] ?? Action.UP

    try {
      compareStep(comparison, action)

      if (comparison.v2.view.chamberCompleted) {
        startBoth(comparison)
        restarts++
      }
    } catch (error) {
      throw new Error(`walk step ${step} (${action}): ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      })
    }
  }

  return `walk ${steps} steps, ${restarts} completions`
}

/**
 * Lists the intended differences seen, by id.
 * @param differences - Counts by id
 * @returns The list, or a note that there were none
 */
function describeCounts(differences: ReadonlyMap<string, number>): string {
  if (differences.size === 0) {
    return 'no intended differences'
  }

  const counts: string[] = []

  differences.forEach((count, id) => {
    counts.push(`${id} ${count}`)
  })

  return `intended differences: ${counts.join(', ')}`
}

/**
 * Checks a chamber's compiled lookups against today's rules, and reports it.
 * @param name - The chamber, as the report names it
 * @param data - The chamber JSON
 * @returns Whether every lookup agreed
 */
function checkLookups(name: string, data: ChamberData): boolean {
  try {
    console.log(`lookups ${name} OK: ${checkCompiledLookups(data)}`)

    return true
  } catch (error) {
    console.error(`lookups ${name} FAILED: ${error instanceof Error ? error.message : String(error)}`)

    return false
  }
}

/**
 * Checks the compiled lookups of every chamber file in src/chambers and of
 * every fixture chamber, runs the self-test, then compares every chamber
 * file, and reports each.
 * @returns Whether everything passed
 */
function runAll(): boolean {
  const options = parseArgs({
    options: {
      seed: {
        type: 'string',
      },
      steps: {
        type: 'string',
      },
    },
  }).values
  const seed = readNumberOption(options.seed, DEFAULT_SEED, 'seed')
  const steps = readNumberOption(options.steps, DEFAULT_STEPS, 'steps')
  let passed = true

  for (const file of listChamberFiles()) {
    const data = CHAMBER_FILES[file]

    // A file missing from the list fails below, with the comparison
    if (data !== undefined) {
      passed = checkLookups(file, data) && passed
    }
  }

  const fixtureChambers = new Set<ChamberData>()

  for (const fixture of FIXTURES) {
    if (!fixtureChambers.has(fixture.chamber)) {
      fixtureChambers.add(fixture.chamber)
      passed = checkLookups(`of fixture ${fixture.name}`, fixture.chamber) && passed
    }
  }

  for (const name of findUnpinnedFixtures()) {
    console.error(`fixture ${name} FAILED: not listed in scripts/engine_comparison/fixture_comparison.ts`)
    passed = false
  }

  for (const pinned of PINNED_FIXTURES) {
    try {
      console.log(`fixture ${pinned.fixture} OK: ${checkPinnedFixture(pinned)}`)
    } catch (error) {
      console.error(`fixture ${pinned.fixture} FAILED: ${error instanceof Error ? error.message : String(error)}`)
      passed = false
    }
  }

  console.log(`Seed ${seed}, ${steps} steps per chamber`)

  for (const file of listChamberFiles()) {
    const data = CHAMBER_FILES[file]

    if (data === undefined) {
      console.error(`${file} FAILED: not listed in scripts/chamber_files.ts`)
      passed = false
      continue
    }

    try {
      const comparison = createComparison(data)
      const solution = compareSolution(comparison, file)
      const walk = compareWalk(comparison, steps, seed)

      console.log(`${file} OK: ${solution}, ${walk}; ${describeCounts(comparison.differences)}`)
    } catch (error) {
      console.error(`${file} FAILED: ${error instanceof Error ? error.message : String(error)}`)
      passed = false
    }
  }

  // The fixture chambers are made to reach the situations where the rules
  // differ, so random walks on them meet those far more often
  for (const fixture of FIXTURES) {
    if (!fixtureChambers.delete(fixture.chamber)) {
      continue
    }

    try {
      const comparison = createComparison(fixture.chamber)
      const walk = compareWalk(comparison, steps, seed)

      console.log(`fixture chamber of ${fixture.name} OK: ${walk}; ${describeCounts(comparison.differences)}`)
    } catch (error) {
      console.error(`fixture chamber of ${fixture.name} FAILED: ${error instanceof Error ? error.message : String(error)}`)
      passed = false
    }
  }

  return passed
}

if (!runAll()) {
  process.exitCode = 1
}
