import {readdirSync} from 'node:fs'
import chamber1 from '@/chambers/chamber_1.json'
import chamber2 from '@/chambers/chamber_2.json'
import chamber3 from '@/chambers/chamber_3.json'
import type {ChamberData} from '@/game/chamber_data'
import {Chamber} from '@/game/classic/chamber'
import {State} from '@/game/classic/state'
import {getSnapshotHash, takeSnapshot} from '@/game/classic/state_snapshot'
import {Subject} from '@/game/classic/subject'

// Loads every chamber with today's rules under Node and runs empty frames on
// it, proving the rules need no browser. Prints one line per chamber, with
// the hash of its starting state, and exits non-zero on any failure

/** Every chamber file, by file name; a chamber file missing here fails the check */
const CHAMBERS: Readonly<Record<string, ChamberData>> = {
  'chamber_1.json': chamber1,
  'chamber_2.json': chamber2,
  'chamber_3.json': chamber3,
}

/** Frames run on each chamber */
const FRAMES = 100

/** A chamber layout's file name, as opposed to other JSON next to it */
const CHAMBER_FILE = /^chamber_\d+\.json$/

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
function runChamber(data: ChamberData): number {
  const state = new State(new Chamber(data), new Subject(data.subject))
  const startHash = getSnapshotHash(takeSnapshot(state))

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
  const files = readdirSync(new URL('../src/chambers/', import.meta.url))
    .filter((name) => CHAMBER_FILE.test(name))
    .sort((first, second) => first.localeCompare(second, 'en', {
      numeric: true,
    }))
  let passed = true

  for (const file of files) {
    const data = CHAMBERS[file]

    if (data === undefined) {
      console.error(`${file} FAILED: not listed in scripts/smoke_engine.ts`)
      passed = false
      continue
    }

    try {
      const startHash = runChamber(data)
      console.log(`${file} OK, start hash ${startHash.toString(16).padStart(8, '0')}`)
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
