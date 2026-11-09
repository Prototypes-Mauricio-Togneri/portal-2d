import type {ChamberData} from '@/game/chamber_data'
import {parseChamber} from '@/game/rules/chamber_parser'
import {chamberError, type ChamberProblem, ChamberProblemLevel} from '@/game/rules/chamber_problem'
import {isJsonObject} from '@/game/rules/json_object'
import {validateChamber} from '@/game/rules/validate_chamber'

/**
 * What loading a chamber file gave.
 */
export type ChamberLoadResult = {
  readonly chamber: ChamberData | null // The chamber, or null when it has an error
  readonly problems: readonly ChamberProblem[] // Every error and warning found
}

/**
 * Reads a chamber file without checking how its parts fit together: reads
 * every field of a JSON object, and refuses anything else.
 * @param data - The parsed JSON of a chamber file, from the game's own files or from anywhere else
 * @returns The chamber, or null when it has an error, with every problem found
 */
export function readChamber(data: unknown): ChamberLoadResult {
  if (!isJsonObject(data)) {
    return {
      chamber: null,
      problems: [chamberError('', null, 'the file is not a JSON object')],
    }
  }

  return parseChamber(data)
}

/**
 * Loads a chamber file: reads every field, then checks how the parts fit
 * together. The check only runs when the reading found no error, since it
 * needs what the reading produced.
 * @param data - The parsed JSON of a chamber file, from the game's own files or from anywhere else
 * @returns The chamber, or null when it has an error, with every problem found
 */
export function loadChamber(data: unknown): ChamberLoadResult {
  const read = readChamber(data)

  if (read.chamber === null) {
    return read
  }

  const problems = validateChamber(read.chamber)
  const hasError = problems.some((problem) => problem.level === ChamberProblemLevel.ERROR)

  return {
    chamber: hasError ? null : read.chamber,
    problems: problems,
  }
}
