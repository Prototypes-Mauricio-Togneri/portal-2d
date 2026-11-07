import {parseArgs} from 'node:util'
import type {ChamberData} from '@/game/chamber_data'
import {Chamber} from '@/game/classic/chamber'
import {State} from '@/game/classic/state'
import {getSnapshotHash, getStateHash, restoreSnapshot, type StateSnapshot, takeSnapshot} from '@/game/classic/state_snapshot'
import {stepClassic} from '@/game/classic/step_classic'
import {Subject} from '@/game/classic/subject'
import {FRAME_KEYS, type FrameInput, type FrameKey} from '@/game/frame_input'
import {Action, ACTIONS} from '@/game/rules/action'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {loadChamber} from '@/game/rules/load_chamber'
import {startChamber, step as stepV2} from '@/game/rules/step'
import {formatHash} from '@/game/text_hash'
import {CHAMBER_FILES, listChamberFiles} from '@scripts/chamber_files'
import {readNumberOption} from '@scripts/number_option'
import {createRandom} from '@scripts/seeded_random'

// Plays seeded random inputs on every chamber with today's rules as a step
// function under Node. Every step must settle within the cap and nothing may
// throw. Every RESTORE_CHECK_INTERVAL steps it also checks that a snapshot
// restores the state exactly, as undo relies on. Then it plays seeded random
// actions on the v2 rules, where every step must settle within its pass cap.
// Reports steps per second for both, the speed baseline for the solver
// (stage 02), leaving out the time the restore checks take, and the size of
// a v2 state. Prints one line per chamber and rules, and exits non-zero on
// any failure.
// Options: --seed=<number> (default 1), --steps=<number> per chamber (default 100000)

/** Steps per chamber unless --steps says otherwise */
const DEFAULT_STEPS = 100_000

/** Seed unless --seed says otherwise */
const DEFAULT_SEED = 1

/** How often a step presses a second key in the same frame, which live play also allows */
const SECOND_KEY_CHANCE = 0.1

/** How often the turn key is held during a step */
const TURN_HELD_CHANCE = 0.2

/** Steps between the starts of two restore checks */
const RESTORE_CHECK_INTERVAL = 1_000

/** Steps a restore check walks on before going back to its snapshot */
const RESTORE_CHECK_LENGTH = 50

/**
 * A restore check under way: the state when it began and the inputs walked
 * since.
 */
type RestoreCheck = {
  readonly snapshot: StateSnapshot // The state when the check began
  readonly inputs: FrameInput[] // The inputs walked since, in order
}

/**
 * How a walk went.
 */
type WalkResult = {
  readonly milliseconds: number // Time spent walking, restore checks left out
  readonly restoreChecks: number // Restore checks that ran and passed
}

/**
 * How a walk on the v2 rules went.
 */
type V2WalkResult = {
  readonly milliseconds: number // Time spent walking
  readonly stateBytes: number // Size of the chamber's state
  readonly completions: number // Times the walk completed the chamber and started over
}

/**
 * Picks one of the keys the rules read as pressed.
 * @param random - The source of random numbers
 * @returns The key
 */
function randomKey(random: () => number): FrameKey {
  const key = FRAME_KEYS[Math.floor(random() * FRAME_KEYS.length)]

  // The index is always inside the list; the fallback only satisfies the type checker
  return key ?? FRAME_KEYS[0] ?? 'up'
}

/**
 * Builds a random frame input: mostly one key, sometimes two.
 * @param random - The source of random numbers
 * @returns The input
 */
function randomInput(random: () => number): FrameInput {
  const pressed = new Set<FrameKey>([randomKey(random)])

  if (random() < SECOND_KEY_CHANCE) {
    pressed.add(randomKey(random))
  }

  return {
    keys: FRAME_KEYS.filter((key) => pressed.has(key)),
    turnHeld: random() < TURN_HELD_CHANCE,
  }
}

/**
 * Builds a chamber with today's rules.
 * @param data - The chamber JSON
 * @returns The state at the start
 */
function createState(data: ChamberData): State {
  return new State(new Chamber(data), new Subject(data.subject))
}

/**
 * Goes back to a restore check's snapshot and walks its inputs again: the
 * restored state must hash as the snapshot does, and must end where the walk
 * did. The state is left where the walk was, so the walk carries on unchanged.
 * @param state - The rules, where the walk now is
 * @param check - The snapshot and the inputs walked since
 * @throws Error saying which hash differs
 */
function checkRestore(state: State, check: RestoreCheck): void {
  const walkedHash = getStateHash(state)

  restoreSnapshot(state, check.snapshot)

  const restoredHash = getStateHash(state)
  const snapshotHash = formatHash(getSnapshotHash(check.snapshot))

  if (restoredHash !== snapshotHash) {
    throw new Error(`the restored state hashes ${restoredHash}, its snapshot ${snapshotHash}`)
  }

  for (const input of check.inputs) {
    stepClassic(state, input)
  }

  const replayedHash = getStateHash(state)

  if (replayedHash !== walkedHash) {
    throw new Error(`walking the ${check.inputs.length} inputs again from the restored state ends at ${replayedHash}, the walk at ${walkedHash}`)
  }
}

/**
 * Walks a chamber with random inputs, starting over whenever it is
 * completed, as live play stops at the exit. Restore checks run alongside,
 * without changing the walk.
 * @param data - The chamber JSON
 * @param steps - How many steps to take
 * @param seed - The seed for the inputs
 * @returns How long the walk took and how many restore checks ran
 * @throws Error naming the step that failed
 */
function walkChamber(data: ChamberData, steps: number, seed: number): WalkResult {
  const random = createRandom(seed)
  const startTime = performance.now()
  let checkMilliseconds = 0
  let restoreChecks = 0
  let check: RestoreCheck | null = null
  let state = createState(data)

  for (let step = 1; step <= steps; step++) {
    const input = randomInput(random)

    try {
      stepClassic(state, input)
      check?.inputs.push(input)

      if (state.chamberCompleted) {
        state = createState(data)
        // The walk started over, so the check has nothing to go back to
        check = null
      }

      const checkStart = performance.now()

      if ((check !== null) && (check.inputs.length === RESTORE_CHECK_LENGTH)) {
        checkRestore(state, check)
        restoreChecks++
        check = null
      }

      if ((step % RESTORE_CHECK_INTERVAL) === 0) {
        check = {
          snapshot: takeSnapshot(state),
          inputs: [],
        }
      }

      checkMilliseconds += performance.now() - checkStart
    } catch (error) {
      throw new Error(`step ${step}: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      })
    }
  }

  return {
    milliseconds: performance.now() - startTime - checkMilliseconds,
    restoreChecks: restoreChecks,
  }
}

/**
 * Walks a chamber on the v2 rules with random actions, starting over
 * whenever it is completed.
 * @param data - The chamber JSON
 * @param steps - How many steps to take
 * @param seed - The seed for the actions
 * @returns How long the walk took, the state's size and the completions
 * @throws Error when the chamber doesn't load, or naming the step that failed
 */
function walkChamberV2(data: ChamberData, steps: number, seed: number): V2WalkResult {
  const loaded = loadChamber(data)

  if (loaded.chamber === null) {
    throw new Error(`the v2 rules can't load it: ${loaded.problems.map((problem) => problem.message).join('; ')}`)
  }

  const chamber = new CompiledChamber(loaded.chamber)
  const random = createRandom(seed)
  const startTime = performance.now()
  const start = startChamber(chamber).state
  let state = start
  let completions = 0

  for (let step = 1; step <= steps; step++) {
    // The index is always inside the list; the fallback only satisfies the type checker
    const action = ACTIONS[Math.floor(random() * ACTIONS.length)] ?? Action.UP

    try {
      state = stepV2(chamber, state, action).state

      if (state.completed) {
        state = start
        completions++
      }
    } catch (error) {
      throw new Error(`v2 step ${step} (${action}): ${error instanceof Error ? error.message : String(error)}`, {
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
 * Walks every chamber file in src/chambers and reports each one.
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
      const result = walkChamber(data, steps, seed)
      const perSecond = Math.round(steps / (result.milliseconds / 1000))
      console.log(`${file} OK: ${steps} steps in ${(result.milliseconds / 1000).toFixed(2)} s, ${perSecond} steps per second, ${result.restoreChecks} restore checks`)
    } catch (error) {
      console.error(`${file} FAILED: ${error instanceof Error ? error.message : String(error)}`)
      passed = false
    }

    try {
      const result = walkChamberV2(data, steps, seed)
      const perSecond = Math.round(steps / (result.milliseconds / 1000))
      console.log(`${file} v2 OK: ${steps} steps in ${(result.milliseconds / 1000).toFixed(2)} s, ${perSecond} steps per second, state ${result.stateBytes} bytes, ${result.completions} completions`)
    } catch (error) {
      console.error(`${file} v2 FAILED: ${error instanceof Error ? error.message : String(error)}`)
      passed = false
    }
  }

  return passed
}

if (!runAll()) {
  process.exitCode = 1
}
