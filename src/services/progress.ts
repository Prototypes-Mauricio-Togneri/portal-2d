/**
 * Which chambers the player has completed, kept in localStorage.
 */
import {ref} from 'vue'

const COMPLETED_STORAGE_KEY = 'portal-2d.completed-chambers'

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

export const completedChambers = ref<number[]>(readCompletedChambers())

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
 * Marks every chamber as not completed again and forgets the stored progress.
 */
export function resetProgress(): void {
  completedChambers.value = []
  try {
    localStorage.removeItem(COMPLETED_STORAGE_KEY)
  } catch (_error) {
    // Storage blocked: nothing was stored to forget
  }
}
