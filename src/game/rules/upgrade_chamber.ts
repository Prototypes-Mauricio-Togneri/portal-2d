import {type ChamberProblem, chamberError} from '@/game/rules/chamber_problem'
import {isJsonObject, type JsonObject} from '@/game/rules/json_object'

/** The chamber format this game plays */
export const CHAMBER_FORMAT_VERSION = 2

/**
 * Turns a chamber file of one format version into the next one.
 */
type UpgradeStep = (data: JsonObject) => JsonObject

/**
 * What upgrading a chamber file gave.
 */
export type UpgradeResult = {
  readonly data: JsonObject | null // The file in the current format, fields not yet checked, or null when it can't be upgraded
  readonly problems: readonly ChamberProblem[] // Why it can't be upgraded, otherwise empty
}

/** The lists of format 1 whose entries can carry an id */
const LISTS_WITH_IDS = [
  'barriers',
  'ditches',
  'boxes',
  'fizzlers',
  'doors',
  'lasers',
] as const

/**
 * Removes an id of 0, which format 1 read as no id.
 * @param entry - A list entry, or the exit
 * @returns The entry without that id, or as it was
 */
function withoutZeroId(entry: unknown): unknown {
  if ((!isJsonObject(entry)) || (entry.id !== 0)) {
    return entry
  }

  return Object.fromEntries(Object.entries(entry).filter((field) => field[0] !== 'id'))
}

/**
 * Format 1 (no version field) to format 2, which adds the version and lets
 * lists be left out. Format 1 read an id of 0 as no id, so it is removed.
 * @param data - A format 1 file
 * @returns The same chamber in format 2
 */
function upgradeFrom1(data: JsonObject): JsonObject {
  const result: Record<string, unknown> = {
    ...data,
  }

  for (const list of LISTS_WITH_IDS) {
    const entries = data[list]

    if (Array.isArray(entries)) {
      const items: readonly unknown[] = entries
      result[list] = items.map(withoutZeroId)
    }
  }

  result.exit = withoutZeroId(data.exit)
  result.version = 2

  return result
}

/** The step that upgrades each format version to the next, by the version it reads */
const UPGRADE_STEPS: Readonly<Record<number, UpgradeStep>> = {
  1: upgradeFrom1,
}

/**
 * The result of a file that can't be upgraded.
 * @param field - Where the problem is
 * @param message - What is wrong
 * @returns The result
 */
function failUpgrade(field: string, message: string): UpgradeResult {
  return {
    data: null,
    problems: [chamberError(field, null, message)],
  }
}

/**
 * Brings a chamber file to the current format, one version at a time. A file
 * without a version is format 1. Only the version is checked here; the rest
 * of the file is checked once it is in the current format.
 * @param data - The parsed JSON of a chamber file
 * @returns The file in the current format, or why it can't be upgraded
 */
export function upgradeChamber(data: unknown): UpgradeResult {
  if (!isJsonObject(data)) {
    return failUpgrade('', 'the file is not a JSON object')
  }

  const declared = data.version

  if ((declared !== undefined) && ((typeof declared !== 'number') || (!Number.isInteger(declared)) || (declared < 1))) {
    return failUpgrade('version', 'is not a whole number of 1 or more')
  }

  let version = declared ?? 1

  if (version > CHAMBER_FORMAT_VERSION) {
    return failUpgrade('version', `format ${version} is newer than this game plays (${CHAMBER_FORMAT_VERSION})`)
  }

  let current = data

  while (version < CHAMBER_FORMAT_VERSION) {
    const step = UPGRADE_STEPS[version]

    if (step === undefined) {
      return failUpgrade('version', `there is no upgrade from format ${version}`)
    }

    current = step(current)
    version++
  }

  return {
    data: current,
    problems: [],
  }
}
