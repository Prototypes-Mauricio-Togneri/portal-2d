import {existsSync, readFileSync} from 'node:fs'
import type {ChamberData} from '@/game/chamber_data'
import {runReplay, type ReplayResult} from '@/game/classic/replay_runner'
import {getChamberHash, type ReplayExpectation, type SolutionData} from '@/game/replay_data'
import {CHAMBER_FILES, CHAMBERS_DIRECTORY, listChamberFiles} from '@scripts/chamber_files'
import {type Fixture, FIXTURES} from '@scripts/fixtures/fixtures'

// Replays every chamber's recorded solution (src/chambers/chamber_N.solution.json)
// and every behaviour fixture (scripts/fixtures/) with today's rules under
// Node, and compares each with what it must give. Prints one line per chamber
// and per fixture, and exits non-zero on any failure

/** Eight lowercase hexadecimal digits, as hashes are written */
const HASH_PATTERN = /^[0-9a-f]{8}$/

/**
 * Whether a parsed JSON value is an object, as opposed to an array, a
 * primitive or null.
 * @param value - The value to test
 * @returns True for a plain object
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return (typeof value === 'object') && (value !== null) && (!Array.isArray(value))
}

/**
 * Reads a hash field.
 * @param value - The field's value
 * @param field - The field's name, for the error
 * @returns The hash
 * @throws Error when it is not eight lowercase hexadecimal digits
 */
function readHash(value: unknown, field: string): string {
  if ((typeof value !== 'string') || (!HASH_PATTERN.test(value))) {
    throw new Error(`${field} is not a hash of eight hexadecimal digits`)
  }

  return value
}

/**
 * Reads a counter field.
 * @param value - The field's value
 * @param field - The field's name, for the error
 * @returns The count
 * @throws Error when it is not a whole number of zero or more
 */
function readCount(value: unknown, field: string): number {
  if ((typeof value !== 'number') || (!Number.isInteger(value)) || (value < 0)) {
    throw new Error(`${field} is not a whole number of zero or more`)
  }

  return value
}

/**
 * Reads what a replay must give.
 * @param value - The expected field of a solution
 * @returns The expectation
 * @throws Error when a field is missing or has the wrong type
 */
function readExpectation(value: unknown): ReplayExpectation {
  if (!isRecord(value)) {
    throw new Error('expected is not an object')
  }

  if (typeof value.completed !== 'boolean') {
    throw new Error('expected.completed is not true or false')
  }

  return {
    completed: value.completed,
    moves: readCount(value.moves, 'expected.moves'),
    portals: readCount(value.portals, 'expected.portals'),
    finalHash: readHash(value.finalHash, 'expected.finalHash'),
  }
}

/**
 * Reads a solution file's parsed JSON, checking every field.
 * @param value - The parsed JSON
 * @returns The solution
 * @throws Error naming the first field that is missing or wrong
 */
function parseSolutionData(value: unknown): SolutionData {
  if (!isRecord(value)) {
    throw new Error('the solution is not an object')
  }

  if (value.format !== 1) {
    throw new Error('format is not 1')
  }

  if (value.ruleset !== 'classic') {
    throw new Error('ruleset is not "classic"')
  }

  if ((typeof value.chamberId !== 'number') || (!Number.isInteger(value.chamberId)) || (value.chamberId < 1)) {
    throw new Error('chamberId is not a positive whole number')
  }

  if (!Array.isArray(value.frames)) {
    throw new Error('frames is not a list')
  }

  const frameValues: readonly unknown[] = value.frames
  const frames: string[] = []

  for (const frame of frameValues) {
    if (typeof frame !== 'string') {
      throw new Error('frames holds something other than text')
    }

    frames.push(frame)
  }

  return {
    format: value.format,
    ruleset: value.ruleset,
    chamberId: value.chamberId,
    chamberHash: readHash(value.chamberHash, 'chamberHash'),
    frames: frames,
    expected: readExpectation(value.expected),
  }
}

/**
 * Compares a replay's result with what it must give.
 * @param result - What the replay gave
 * @param expected - What it must give
 * @returns Every difference, in words, or null when there is none
 */
function describeDifferences(result: ReplayResult, expected: ReplayExpectation): string | null {
  const differences: string[] = []

  if (result.completed !== expected.completed) {
    differences.push(result.completed ? 'completes but should not' : 'does not complete but should')
  }

  if (result.moves !== expected.moves) {
    differences.push(`${result.moves} moves instead of ${expected.moves}`)
  }

  if (result.portals !== expected.portals) {
    differences.push(`${result.portals} portals instead of ${expected.portals}`)
  }

  if (result.finalHash !== expected.finalHash) {
    differences.push(`final hash ${result.finalHash} instead of ${expected.finalHash}`)
  }

  return (differences.length > 0) ? differences.join(', ') : null
}

/**
 * Replays a chamber's recorded solution and checks it.
 * @param file - The chamber's file name
 * @param data - The chamber JSON
 * @returns A short summary of the solution
 * @throws Error saying why the solution fails
 */
function checkSolution(file: string, data: ChamberData): string {
  const solutionFile = file.replace(/\.json$/, '.solution.json')
  const solutionUrl = new URL(solutionFile, CHAMBERS_DIRECTORY)

  if (!existsSync(solutionUrl)) {
    throw new Error(`no solution recorded; save one as src/chambers/${solutionFile} with Download solution in the completion dialog (development only)`)
  }

  const parsed: unknown = JSON.parse(readFileSync(solutionUrl, 'utf8'))
  const solution = parseSolutionData(parsed)

  if (solution.chamberHash !== getChamberHash(data)) {
    throw new Error(`the chamber changed since ${solutionFile} was recorded; record it again`)
  }

  const result = runReplay(data, solution.frames)

  if (!result.completed) {
    throw new Error(`${solutionFile} does not complete the chamber`)
  }

  const differences = describeDifferences(result, solution.expected)

  if (differences !== null) {
    throw new Error(`${solutionFile}: ${differences}`)
  }

  return `chamber id ${solution.chamberId}, ${result.moves} moves, ${result.portals} portals`
}

/**
 * Replays a fixture and checks it ends as pinned.
 * @param fixture - The fixture
 * @throws Error saying how it ended differently
 */
function checkFixture(fixture: Fixture): void {
  const expected = fixture.expected

  if ('error' in expected) {
    try {
      runReplay(fixture.chamber, fixture.frames)
    } catch (error) {
      if ((error instanceof Error) && (error.message === expected.error)) {
        return
      }

      throw new Error(`threw "${String(error)}" instead of "${expected.error}"`, {
        cause: error,
      })
    }

    throw new Error(`ran without throwing "${expected.error}"`)
  }

  const differences = describeDifferences(runReplay(fixture.chamber, fixture.frames), expected)

  if (differences !== null) {
    throw new Error(differences)
  }
}

/**
 * Checks every chamber's solution and every fixture, and reports each one.
 * @returns Whether all of them passed
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
      console.log(`${file} OK: ${checkSolution(file, data)}`)
    } catch (error) {
      console.error(`${file} FAILED: ${error instanceof Error ? error.message : String(error)}`)
      passed = false
    }
  }

  for (const fixture of FIXTURES) {
    try {
      checkFixture(fixture)
      console.log(`fixture ${fixture.name} OK`)
    } catch (error) {
      console.error(`fixture ${fixture.name} FAILED: ${error instanceof Error ? error.message : String(error)}`)
      passed = false
    }
  }

  return passed
}

if (!runAll()) {
  process.exitCode = 1
}
