import {existsSync, readFileSync} from 'node:fs'
import type {ChamberData} from '@/game/chamber_data'
import {getChamberHash, parseReplayStep, type ReplayExpectation, type ReplayStep, type SolutionData} from '@/game/replay_data'
import {ACTIONS} from '@/game/rules/action'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {loadChamber, readChamber} from '@/game/rules/load_chamber'
import {runRulesReplay, type RulesReplayResult} from '@/game/rules/replay_runner'
import type {RulesState} from '@/game/rules/rules_state'
import {step} from '@/game/rules/step'
import {CHAMBER_FILES, CHAMBERS_DIRECTORY, listChamberFiles} from '@scripts/chamber_files'
import {type Fixture, FIXTURES} from '@scripts/fixtures/fixtures'

// Replays every chamber's recorded solution (src/chambers/chamber_N.solution.json)
// with the rules under Node, compares it with what it must give, and checks
// that no action changes the completed chamber; then every behaviour fixture
// (scripts/fixtures/fixtures.ts), compared with how it must end. Prints
// one line per chamber and per fixture, and exits non-zero on any failure

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

  if (value.format !== 2) {
    throw new Error('format is not 2')
  }

  if (value.ruleset !== 'v2') {
    throw new Error('ruleset is not "v2"')
  }

  if ((typeof value.chamberId !== 'number') || (!Number.isInteger(value.chamberId)) || (value.chamberId < 1)) {
    throw new Error('chamberId is not a positive whole number')
  }

  if (!Array.isArray(value.actions)) {
    throw new Error('actions is not a list')
  }

  const actionValues: readonly unknown[] = value.actions
  const actions: ReplayStep[] = []

  for (const action of actionValues) {
    if (typeof action !== 'string') {
      throw new Error('actions holds something other than text')
    }

    actions.push(parseReplayStep(action))
  }

  return {
    format: value.format,
    ruleset: value.ruleset,
    chamberId: value.chamberId,
    chamberHash: readHash(value.chamberHash, 'chamberHash'),
    actions: actions,
    expected: readExpectation(value.expected),
  }
}

/**
 * Compares a replay's result with what it must give.
 * @param result - What the replay gave
 * @param expected - What it must give
 * @returns Every difference, in words, or null when there is none
 */
function describeDifferences(result: ReplayExpectation, expected: ReplayExpectation): string | null {
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
 * What a replay gave, in the terms of an expectation.
 * @param result - What the replay gave
 * @returns Its completion, counters and final hash
 */
function toExpectation(result: RulesReplayResult): ReplayExpectation {
  return {
    completed: result.completed,
    moves: result.moves,
    portals: result.portals,
    finalHash: result.finalState.hash,
  }
}

/**
 * Checks that no action changes a completed chamber or reports anything.
 * @param chamber - The chamber
 * @param state - A completed state of it
 * @throws Error naming the first action that did
 */
function checkCompletedIsFinal(chamber: CompiledChamber, state: RulesState): void {
  for (const action of ACTIONS) {
    const result = step(chamber, state, action)

    if ((result.state !== state) || (result.events.length > 0)) {
      throw new Error(`${action} after completion changed the state or reported [${result.events.join(', ')}]`)
    }
  }
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

  const loaded = loadChamber(data)

  if (loaded.chamber === null) {
    throw new Error(`the rules can't load the chamber: ${loaded.problems.map((problem) => problem.message).join('; ')}`)
  }

  if (solution.chamberHash !== getChamberHash(loaded.chamber)) {
    throw new Error(`the chamber changed since ${solutionFile} was recorded; record it again`)
  }

  const chamber = new CompiledChamber(loaded.chamber)
  const result = runRulesReplay(chamber, solution.actions)

  if (!result.completed) {
    throw new Error(`${solutionFile} does not complete the chamber`)
  }

  const differences = describeDifferences(toExpectation(result), solution.expected)

  if (differences !== null) {
    throw new Error(`${solutionFile}: ${differences}`)
  }

  checkCompletedIsFinal(chamber, result.finalState)

  return `chamber id ${solution.chamberId}, ${result.moves} moves, ${result.portals} portals`
}

/**
 * Replays a behaviour fixture and checks it ends as pinned.
 * @param fixture - The fixture
 * @throws Error saying how it ended differently
 */
function checkFixture(fixture: Fixture): void {
  const read = readChamber(fixture.chamber)

  if (read.chamber === null) {
    throw new Error(`the rules can't read the chamber: ${read.problems.map((problem) => problem.message).join('; ')}`)
  }

  const result = runRulesReplay(new CompiledChamber(read.chamber), fixture.actions)
  const differences = describeDifferences(toExpectation(result), fixture.expected)

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
