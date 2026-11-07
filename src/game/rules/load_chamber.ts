import type {ChamberDataV2} from '@/game/chamber_data_v2'
import {parseChamber} from '@/game/rules/chamber_parser'
import {type ChamberProblem, ChamberProblemLevel} from '@/game/rules/chamber_problem'
import {upgradeChamber} from '@/game/rules/upgrade_chamber'
import {validateChamber} from '@/game/rules/validate_chamber'

/**
 * What loading a chamber file gave.
 */
export type ChamberLoadResult = {
  readonly chamber: ChamberDataV2 | null // The chamber in the current format, or null when it has an error
  readonly problems: readonly ChamberProblem[] // Every error and warning found
}

/**
 * Reads a chamber file of any format this game knows without checking how
 * its parts fit together: upgrades it to the current format, then reads
 * every field. The upgrade only runs the reading when it found no error.
 * @param data - The parsed JSON of a chamber file, from the game's own files or from anywhere else
 * @returns The chamber, or null when it has an error, with every problem found
 */
export function readChamber(data: unknown): ChamberLoadResult {
  const upgraded = upgradeChamber(data)

  if (upgraded.data === null) {
    return {
      chamber: null,
      problems: upgraded.problems,
    }
  }

  return parseChamber(upgraded.data)
}

/**
 * Loads a chamber file of any format this game knows: upgrades it to the
 * current format, reads every field, then checks how the parts fit together.
 * A step only runs when the one before it found no error, since it needs
 * what that step produced.
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
