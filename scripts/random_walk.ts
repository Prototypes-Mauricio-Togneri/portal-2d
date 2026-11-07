import {parseArgs} from 'node:util'
import {Action, ACTIONS} from '@/game/rules/action'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {type ChamberLoadResult, loadChamber, readChamber} from '@/game/rules/load_chamber'
import {startChamber, step} from '@/game/rules/step'
import {CHAMBER_FILES, listChamberFiles} from '@scripts/chamber_files'
import {listFixtureChambers} from '@scripts/fixtures/fixtures'
import {readNumberOption} from '@scripts/number_option'
import {createRandom} from '@scripts/seeded_random'

// Plays seeded random actions on every chamber with the rules under Node,
// then on every fixture chamber (scripts/fixtures/), which are made to reach
// the rules' edge cases, read without the layout checks so the one open at
// the edge still plays. Every step must settle within the rules' pass cap
// and nothing may throw. Reports steps per second, the speed baseline for
// the solver (stage 02), and the size of a chamber's state. Prints one line
// per chamber, and exits non-zero on any failure.
// Options: --seed=<number> (default 1), --steps=<number> per chamber (default 100000)

/** Steps per chamber unless --steps says otherwise */
const DEFAULT_STEPS = 100_000

/** Seed unless --seed says otherwise */
const DEFAULT_SEED = 1

/**
 * How a walk went.
 */
type WalkResult = {
  readonly milliseconds: number // Time spent walking
  readonly stateBytes: number // Size of the chamber's state
  readonly completions: number // Times the walk completed the chamber and started over
}

/**
 * Compiles a chamber that was loaded or read.
 * @param loaded - What loading or reading its file gave
 * @returns The compiled chamber
 * @throws Error when the file had an error
 */
function compileChamber(loaded: ChamberLoadResult): CompiledChamber {
  if (loaded.chamber === null) {
    throw new Error(`the rules can't load it: ${loaded.problems.map((problem) => problem.message).join('; ')}`)
  }

  return new CompiledChamber(loaded.chamber)
}

/**
 * Walks a chamber with random actions, starting over whenever it is
 * completed.
 * @param chamber - The compiled chamber
 * @param steps - How many steps to take
 * @param seed - The seed for the actions
 * @returns How long the walk took, the state's size and the completions
 * @throws Error naming the step that failed
 */
function walkChamber(chamber: CompiledChamber, steps: number, seed: number): WalkResult {
  const random = createRandom(seed)
  const startTime = performance.now()
  const start = startChamber(chamber).state
  let state = start
  let completions = 0

  for (let stepNumber = 1; stepNumber <= steps; stepNumber++) {
    // The index is always inside the list; the fallback only satisfies the type checker
    const action = ACTIONS[Math.floor(random() * ACTIONS.length)] ?? Action.UP

    try {
      state = step(chamber, state, action).state

      if (state.completed) {
        state = start
        completions++
      }
    } catch (error) {
      throw new Error(`step ${stepNumber} (${action}): ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      })
    }
  }

  return {
    milliseconds: performance.now() - startTime,
    stateBytes: start.byteSize,
    completions: completions,
  }
}

/**
 * Describes how a walk went.
 * @param result - The walk
 * @param steps - How many steps it took
 * @returns Its time, speed, state size and completions
 */
function describeWalk(result: WalkResult, steps: number): string {
  const perSecond = Math.round(steps / (result.milliseconds / 1000))

  return `${steps} steps in ${(result.milliseconds / 1000).toFixed(2)} s, ${perSecond} steps per second, state ${result.stateBytes} bytes, ${result.completions} completions`
}

/**
 * Walks every chamber file in src/chambers and every fixture chamber, and
 * reports each one.
 * @returns Whether every walk finished
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

  console.log(`Seed ${seed}, ${steps} steps per chamber`)

  for (const file of listChamberFiles()) {
    const data = CHAMBER_FILES[file]

    if (data === undefined) {
      console.error(`${file} FAILED: not listed in scripts/chamber_files.ts`)
      passed = false
      continue
    }

    try {
      const result = walkChamber(compileChamber(loadChamber(data)), steps, seed)
      console.log(`${file} OK: ${describeWalk(result, steps)}`)
    } catch (error) {
      console.error(`${file} FAILED: ${error instanceof Error ? error.message : String(error)}`)
      passed = false
    }
  }

  for (const fixtureChamber of listFixtureChambers()) {
    const label = `fixture chamber of ${fixtureChamber.name}`

    try {
      const result = walkChamber(compileChamber(readChamber(fixtureChamber.chamber)), steps, seed)
      console.log(`${label} OK: ${describeWalk(result, steps)}`)
    } catch (error) {
      console.error(`${label} FAILED: ${error instanceof Error ? error.message : String(error)}`)
      passed = false
    }
  }

  return passed
}

if (!runAll()) {
  process.exitCode = 1
}
