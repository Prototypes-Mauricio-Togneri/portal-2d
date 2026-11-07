import {parseReplayStep, type ReplayExpectation, type ReplayStep, type SolutionData} from '@/game/replay_data'

// Reads a recorded solution file (src/chambers/chamber_N.solution.json),
// checking every field, for the scripts that replay solutions

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
export function parseSolutionData(value: unknown): SolutionData {
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
