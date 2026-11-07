import type {ChamberData} from '@/game/chamber_data'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {loadChamber} from '@/game/rules/load_chamber'
import {startChamber} from '@/game/rules/step'
import {CHAMBER_FILES, listChamberFiles} from '@scripts/chamber_files'

// Loads every chamber with the rules under Node and settles its start,
// proving the rules need no browser. Prints one line per chamber, with the
// size and hash of its settled start, and exits non-zero on any failure

/**
 * Loads a chamber and settles its start.
 * @param data - The chamber JSON
 * @returns The size and hash of the settled start
 * @throws Error when the chamber doesn't load
 */
function startChamberFile(data: ChamberData): string {
  const loaded = loadChamber(data)

  if (loaded.chamber === null) {
    throw new Error(`the rules can't load it: ${loaded.problems.map((problem) => problem.message).join('; ')}`)
  }

  const start = startChamber(new CompiledChamber(loaded.chamber)).state

  return `start ${start.byteSize} bytes, hash ${start.hash}`
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
      console.log(`${file} OK, ${startChamberFile(data)}`)
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
