import type {ChamberData} from '@/game/chamber_data'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {loadChamber} from '@/game/rules/load_chamber'
import {startChamber} from '@/game/rules/step'
import {CHAMBER_FILES, listChamberFiles, PLAYGROUND_DATA, PLAYGROUND_FILE} from '@scripts/chamber_files'

// Loads every chamber, and the playground, with the rules under Node and
// settles its start, proving the rules need no browser. Prints one line per
// chamber, with the size and hash of its settled start, and exits non-zero
// on any failure

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
 * Settles one chamber's start and reports it.
 * @param file - Its file name
 * @param data - The chamber JSON
 * @returns Whether it settled
 */
function runChamber(file: string, data: ChamberData): boolean {
  try {
    console.log(`${file} OK, ${startChamberFile(data)}`)

    return true
  } catch (error) {
    console.error(`${file} FAILED: ${String(error)}`)

    return false
  }
}

/**
 * Runs every chamber file in src/chambers, then the playground, and reports each one.
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

    passed = runChamber(file, data) && passed
  }

  return runChamber(PLAYGROUND_FILE, PLAYGROUND_DATA) && passed
}

if (!runAll()) {
  process.exitCode = 1
}
