import type {ChamberData} from '@/game/chamber_data'
import {Chamber} from '@/game/classic/chamber'
import {State} from '@/game/classic/state'
import {getStateHash} from '@/game/classic/state_snapshot'
import {Subject} from '@/game/classic/subject'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {loadChamber} from '@/game/rules/load_chamber'
import {startChamber} from '@/game/rules/step'
import {CHAMBER_FILES, listChamberFiles} from '@scripts/chamber_files'

// Loads every chamber with today's rules under Node and runs empty frames on
// it, then loads it for the v2 rules and settles its start, proving both need
// no browser. Prints one line per chamber, with the hash of today's starting
// state and the size and hash of v2's settled start, and exits non-zero on
// any failure

/** Frames run on each chamber */
const FRAMES = 100

/** The keyboard with no key pressed or held */
const NO_KEYS = {
  isPressed: (): boolean => false,
  isPressing: (): boolean => false,
}

/**
 * Builds a chamber with today's rules and runs empty frames on it.
 * @param data - The chamber JSON
 * @returns The hash of the starting state, before any frame runs
 */
function runChamber(data: ChamberData): string {
  const state = new State(new Chamber(data), new Subject(data.subject))
  const startHash = getStateHash(state)

  for (let i = 0; i < FRAMES; i++) {
    state.update(0, NO_KEYS)
  }

  return startHash
}

/**
 * Loads a chamber for the v2 rules and settles its start.
 * @param data - The chamber JSON
 * @returns The size and hash of the settled start
 * @throws Error when the chamber doesn't load
 */
function startV2(data: ChamberData): string {
  const loaded = loadChamber(data)

  if (loaded.chamber === null) {
    throw new Error(`the v2 rules can't load it: ${loaded.problems.map((problem) => problem.message).join('; ')}`)
  }

  const start = startChamber(new CompiledChamber(loaded.chamber)).state

  return `v2 start ${start.byteSize} bytes, hash ${start.hash}`
}

/**
 * Runs every chamber file in src/chambers and reports each one.
 * @returns Whether every chamber ran
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
      const startHash = runChamber(data)
      console.log(`${file} OK, start hash ${startHash}, ${startV2(data)}`)
    } catch (error) {
      console.error(`${file} FAILED: ${String(error)}`)
      passed = false
    }
  }

  return passed
}

if (!runAll()) {
  process.exitCode = 1
}
