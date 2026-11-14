/**
 * The chamber opened most recently during this visit, or the playground in
 * development, so the home screen can pick it out again on the way back.
 * Kept in memory only: a reload forgets it.
 */

let lastChamberNumber: number | null = null // None until a chamber opens
let playgroundLast = false // Development only: whether the playground opened after the last chamber

/**
 * Records the chamber that has just opened.
 * @param chamberNumber - Chamber number, counted from 0
 */
export function rememberChamber(chamberNumber: number): void {
  lastChamberNumber = chamberNumber
  playgroundLast = false
}

/**
 * Development only: records that the playground has just opened. The last
 * chamber is kept, for when Play is opened again.
 */
export function rememberPlayground(): void {
  playgroundLast = true
}

/**
 * Development only: tells whether the playground opened after the last chamber.
 * @returns True when the playground was the last opened
 */
export function playgroundOpenedLast(): boolean {
  return playgroundLast
}

/**
 * Reads the chamber opened most recently during this visit.
 * @returns Its number, counted from 0, or null when no chamber has opened yet
 */
export function lastChamber(): number | null {
  return lastChamberNumber
}
