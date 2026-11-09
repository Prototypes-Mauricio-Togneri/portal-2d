/**
 * The chamber opened most recently during this visit, so the home screen can
 * pick it out again on the way back. Kept in memory only: a reload forgets it.
 */

let lastChamberNumber: number | null = null // None until a chamber opens

/**
 * Records the chamber that has just opened.
 * @param chamberNumber - Chamber number, counted from 0
 */
export function rememberChamber(chamberNumber: number): void {
  lastChamberNumber = chamberNumber
}

/**
 * Reads the chamber opened most recently during this visit.
 * @returns Its number, counted from 0, or null when no chamber has opened yet
 */
export function lastChamber(): number | null {
  return lastChamberNumber
}
