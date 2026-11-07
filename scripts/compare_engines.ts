import {existsSync, readFileSync} from 'node:fs'
import {parseArgs} from 'node:util'
import type {ChamberData} from '@/game/chamber_data'
import {CHAMBER_FILES, CHAMBERS_DIRECTORY, listChamberFiles} from '@scripts/chamber_files'
import {ChamberTiles} from '@scripts/engine_comparison/chamber_tiles'
import {startClassicRun} from '@scripts/engine_comparison/classic_run'
import {type ComparedAction, COMPARED_ACTIONS, readAction} from '@scripts/engine_comparison/compared_action'
import {type ComparedEngine, type ComparedOutcome, type ComparedRun, playStep} from '@scripts/engine_comparison/compared_run'
import {findIntendedDifference} from '@scripts/engine_comparison/intended_differences'
import {describeOutcomeDifferences} from '@scripts/engine_comparison/outcome_differences'
import {checkRecognisedFixture, RECOGNISED_FIXTURES} from '@scripts/engine_comparison/self_test'
import {readNumberOption} from '@scripts/number_option'
import {createRandom} from '@scripts/seeded_random'

// Plays every chamber on today's rules (src/game/classic/) and on the v2
// rules, one action at a time, and compares the state and the events after
// every step. A difference that docs/elements.md lists under "Changes from
// the original rules" is counted under its id, and the run carries on from
// v2's state; any other difference fails. First a self-test checks that each
// behaviour fixture playing one key at a time is recognised as its own
// intended difference; then, per chamber, its recorded solution and a seeded
// random walk are compared. Prints one line per fixture and per chamber, and
// exits non-zero on any failure.
// Options: --seed=<number> (default 1), --steps=<number> per chamber (default 100000)

/** Steps per chamber unless --steps says otherwise */
const DEFAULT_STEPS = 100_000

/** Seed unless --seed says otherwise */
const DEFAULT_SEED = 1

/** The v2 rules; today's rules stand in for them until stage 01 builds them (E8), so every run agrees */
const V2_ENGINE: ComparedEngine = startClassicRun

/**
 * A chamber played on both engines, in step with each other.
 */
type Comparison = {
  readonly data: ChamberData // The chamber JSON
  readonly tiles: ChamberTiles // What the chamber file puts on each tile
  readonly differences: Map<string, number> // Intended differences seen so far, by id
  classic: ComparedRun // The chamber on today's rules
  v2: ComparedRun // The chamber on the v2 rules
}

/**
 * Whether two outcomes of a step agree in everything compared. Cheaper than
 * listing the differences, which only a disagreement needs.
 * @param classic - What today's rules did
 * @param v2 - What the v2 rules did
 * @returns True when the error, the events and the state are the same
 */
function outcomesAgree(classic: ComparedOutcome, v2: ComparedOutcome): boolean {
  return (classic.error === v2.error) &&
    (classic.events.join() === v2.events.join()) &&
    (JSON.stringify(classic.view) === JSON.stringify(v2.view))
}

/**
 * Starts the chamber on both engines, which must agree on the settled start.
 * @param comparison - The chamber; both runs are replaced
 * @throws Error listing the differences when they disagree
 */
function startBoth(comparison: Comparison): void {
  comparison.classic = startClassicRun(comparison.data)
  comparison.v2 = V2_ENGINE(comparison.data)

  const differences = describeOutcomeDifferences({
    view: comparison.classic.view,
    events: comparison.classic.startEvents,
    error: null,
  }, {
    view: comparison.v2.view,
    events: comparison.v2.startEvents,
    error: null,
  })

  if (differences.length > 0) {
    throw new Error(`the start differs: ${differences.join('; ')}`)
  }
}

/**
 * Builds a comparison of a chamber, started on both engines.
 * @param data - The chamber JSON
 * @param differences - Where intended differences are counted
 * @returns The comparison
 * @throws Error when the engines disagree on the start
 */
function createComparison(data: ChamberData, differences: Map<string, number>): Comparison {
  const comparison: Comparison = {
    data: data,
    tiles: new ChamberTiles(data),
    differences: differences,
    classic: startClassicRun(data),
    v2: V2_ENGINE(data),
  }

  startBoth(comparison)

  return comparison
}

/**
 * Plays one action on both engines and compares them. An intended
 * difference is counted, and today's rules then take over v2's state.
 * @param comparison - The chamber on both engines
 * @param action - The step's action
 * @throws Error when v2 throws, or listing the differences when no intended difference explains them
 */
function compareStep(comparison: Comparison, action: ComparedAction): void {
  const before = comparison.classic.view
  const classic = playStep(comparison.classic, action)
  const v2 = playStep(comparison.v2, action)

  if (v2.error !== null) {
    throw new Error(`v2 threw "${v2.error}"`)
  }

  if (outcomesAgree(classic, v2)) {
    return
  }

  const difference = findIntendedDifference({
    tiles: comparison.tiles,
    action: action,
    before: before,
    classic: classic,
    v2: v2,
  })

  if (difference === null) {
    throw new Error(`no intended difference explains: ${describeOutcomeDifferences(classic, v2).join('; ')}`)
  }

  comparison.differences.set(difference.id, (comparison.differences.get(difference.id) ?? 0) + 1)
  comparison.classic.takeOver(v2.view)
}

/**
 * Reads the key frames of a chamber's recorded solution. The replay check
 * validates the rest of the file.
 * @param file - The chamber's file name
 * @returns The frames, in their text form
 * @throws Error when there is no solution or it has no list of frames
 */
function readSolutionFrames(file: string): string[] {
  const solutionFile = file.replace(/\.json$/, '.solution.json')
  const solutionUrl = new URL(solutionFile, CHAMBERS_DIRECTORY)

  if (!existsSync(solutionUrl)) {
    throw new Error(`no solution recorded in src/chambers/${solutionFile}`)
  }

  const parsed: unknown = JSON.parse(readFileSync(solutionUrl, 'utf8'))
  const frames: unknown = ((typeof parsed === 'object') && (parsed !== null) && ('frames' in parsed)) ? parsed.frames : null

  if (!Array.isArray(frames)) {
    throw new Error(`${solutionFile} has no list of frames`)
  }

  const frameValues: readonly unknown[] = frames

  return frameValues.map((frame) => String(frame))
}

/**
 * Plays a chamber's recorded solution on both engines, one key frame per step.
 * @param comparison - The chamber on both engines, at its start
 * @param file - The chamber's file name
 * @returns A short summary
 * @throws Error naming the step that failed
 */
function compareSolution(comparison: Comparison, file: string): string {
  const frames = readSolutionFrames(file)

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i] ?? ''

    try {
      compareStep(comparison, readAction(frame))
    } catch (error) {
      throw new Error(`solution step ${i + 1} (${frame}): ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      })
    }
  }

  return `solution ${frames.length} steps (${comparison.v2.view.chamberCompleted ? 'completed' : 'not completed'})`
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
    const action = COMPARED_ACTIONS[Math.floor(random() * COMPARED_ACTIONS.length)] ?? 'up'

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
 * Runs the self-test, then compares every chamber file in src/chambers, and
 * reports each.
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

  for (const expected of RECOGNISED_FIXTURES) {
    try {
      checkRecognisedFixture(expected)
      console.log(`fixture ${expected.fixture} OK: ${expected.difference} at step ${expected.step}`)
    } catch (error) {
      console.error(`fixture ${expected.fixture} FAILED: ${error instanceof Error ? error.message : String(error)}`)
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
      const comparison = createComparison(data, new Map())
      const solution = compareSolution(comparison, file)
      const walk = compareWalk(comparison, steps, seed)

      console.log(`${file} OK: ${solution}, ${walk}; ${describeCounts(comparison.differences)}`)
    } catch (error) {
      console.error(`${file} FAILED: ${error instanceof Error ? error.message : String(error)}`)
      passed = false
    }
  }

  return passed
}

if (!runAll()) {
  process.exitCode = 1
}
