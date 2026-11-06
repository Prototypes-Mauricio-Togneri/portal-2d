import type {ChamberData} from '@/game/chamber_data'
import {Chamber} from '@/game/classic/chamber'
import {State} from '@/game/classic/state'
import {getStateHash} from '@/game/classic/state_snapshot'
import {Subject} from '@/game/classic/subject'
import {CHAMBER_FILES, listChamberFiles} from '@scripts/chamber_files'

// Loads every chamber with today's rules under Node and runs empty frames on
// it, proving the rules need no browser. Prints one line per chamber, with
// the hash of its starting state, and exits non-zero on any failure

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
      console.log(`${file} OK, start hash ${startHash}`)
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
