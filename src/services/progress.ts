/**
 * Which chambers the player has completed and their best times, kept in localStorage.
 */
import {ref} from 'vue'

const COMPLETED_STORAGE_KEY = 'portal-2d.completed-chambers'
const BEST_TIMES_STORAGE_KEY = 'portal-2d.best-times'

/** Best time per chamber, in whole hundredths of a second, by chamber number. */
type BestTimes = Record<number, number>

/**
 * Reads the completed chamber numbers, ignoring anything malformed.
 * @returns Completed chamber numbers
 */
function readCompletedChambers(): number[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(COMPLETED_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(stored)) {
      return []
    }
    return stored.filter((value): value is number => Number.isInteger(value))
  } catch (_error) {
    // Storage blocked (private browsing) or corrupted: start with no progress
    return []
  }
}

/**
 * Reads the stored best times, ignoring anything malformed.
 * @returns Best time in hundredths of a second, by chamber number
 */
function readBestTimes(): BestTimes {
  const bestTimes: BestTimes = {}
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(BEST_TIMES_STORAGE_KEY) ?? '{}')
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
      return bestTimes
    }
    for (const [
      key,
      value,
    ] of Object.entries(stored)) {
      const chamberNumber = Number(key)
      if (Number.isInteger(chamberNumber) && Number.isInteger(value) && value >= 0) {
        bestTimes[chamberNumber] = value
      }
    }
  } catch (_error) {
    // Storage blocked (private browsing) or corrupted: start with no times
  }
  return bestTimes
}

export const completedChambers = ref<number[]>(readCompletedChambers())
export const bestTimes = ref<BestTimes>(readBestTimes())

/**
 * Records a chamber as completed and persists it.
 * @param chamberNumber - 1-based chamber number
 */
export function markChamberCompleted(chamberNumber: number): void {
  if (completedChambers.value.includes(chamberNumber)) {
    return
  }
  completedChambers.value = [
    ...completedChambers.value,
    chamberNumber,
  ]
  try {
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completedChambers.value))
  } catch (_error) {
    // Storage blocked: progress lasts for this visit only
  }
}

/**
 * Keeps a finished run's time when it beats the chamber's best, and persists it.
 * @param chamberNumber - 1-based chamber number
 * @param hundredths - The run's time in whole hundredths of a second
 * @returns Whether the time is the chamber's new best, which a first completion always is
 */
export function recordTime(chamberNumber: number, hundredths: number): boolean {
  const best = bestTimes.value[chamberNumber]
  if (best !== undefined && hundredths >= best) {
    return false
  }
  bestTimes.value = {
    ...bestTimes.value,
    [chamberNumber]: hundredths,
  }
  try {
    localStorage.setItem(BEST_TIMES_STORAGE_KEY, JSON.stringify(bestTimes.value))
  } catch (_error) {
    // Storage blocked: the time lasts for this visit only
  }
  return true
}

/**
 * Marks every chamber as not completed again and forgets the stored progress and best times.
 */
export function resetProgress(): void {
  completedChambers.value = []
  bestTimes.value = {}
  try {
    localStorage.removeItem(BEST_TIMES_STORAGE_KEY)
    localStorage.removeItem(COMPLETED_STORAGE_KEY)
  } catch (_error) {
    // Storage blocked: nothing was stored to forget
  }
}
