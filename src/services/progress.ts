/**
 * The player's progress in each chamber: whether it is completed, its best
 * time and how many attempts it has had. Kept in localStorage under one
 * versioned key, by the chamber's permanent id, so records follow a chamber
 * when the list is reordered. Progress stored by chamber number (version 1)
 * is moved over on the first load that finds it.
 */
import {ref} from 'vue'
import type {ChamberEntry} from '@/services/chamber_catalogue'

const PROGRESS_STORAGE_KEY = 'portal-2d.progress'
const PROGRESS_VERSION = 2 // Version 1 was the two keys by chamber number below

// Version 1: the completed chamber numbers, and the best times by chamber number
const LEGACY_COMPLETED_STORAGE_KEY = 'portal-2d.completed-chambers'
const LEGACY_BEST_TIMES_STORAGE_KEY = 'portal-2d.best-times'

// The chamber id each number stood for while version 1 was stored. Frozen on
// purpose, never read from the catalogue: a player who returns after the
// chambers were reordered must still get the chambers they completed
const LEGACY_CHAMBER_IDS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
}

/** What is stored for one chamber. */
type ChamberRecord = {
  completed: boolean // Whether the subject has reached the exit at least once
  bestTime: number | null // Fastest finished run, in whole hundredths of a second; null when there is none
  attempts: number // Runs started: each opening, Reset chamber and Play again
}

/** Everything stored, as written to localStorage. */
type ProgressRecord = {
  version: typeof PROGRESS_VERSION // Format of the record
  chambers: Record<string, ChamberRecord> // By permanent chamber id
}

/** The progress found in storage when the game loads. */
type StoredProgress = {
  progress: ProgressRecord // What could be read; empty when nothing could
  newer: boolean // Whether the key holds a later version this build can't read, which must not be overwritten
}

const EMPTY_CHAMBER: ChamberRecord = {
  completed: false,
  bestTime: null,
  attempts: 0,
}

/**
 * Makes a record with no progress in any chamber.
 * @returns The empty record
 */
function emptyProgress(): ProgressRecord {
  return {
    version: PROGRESS_VERSION,
    chambers: {},
  }
}

/**
 * Parses stored JSON text.
 * @param text - The stored text, or null when nothing is stored
 * @returns The parsed value, or null when nothing is stored or the text is not valid JSON
 */
function parseJson(text: string | null): unknown {
  if (text === null) {
    return null
  }
  try {
    const value: unknown = JSON.parse(text)
    return value
  } catch (_error) {
    return null
  }
}

/**
 * Whether a parsed JSON value is an object of named values (not an array).
 * @param value - The parsed value
 * @returns True for an object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Whether a parsed JSON value is a whole number of zero or more.
 * @param value - The parsed value
 * @returns True for a whole number of zero or more
 */
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

/**
 * Reads one chamber's stored record, keeping only the values that are well formed.
 * @param value - The parsed value stored for the chamber
 * @returns The record, or null when the value is not an object
 */
function parseChamberRecord(value: unknown): ChamberRecord | null {
  if (!isPlainObject(value)) {
    return null
  }
  return {
    completed: value.completed === true,
    bestTime: isCount(value.bestTime) ? value.bestTime : null,
    attempts: isCount(value.attempts) ? value.attempts : 0,
  }
}

/**
 * Reads the progress key, ignoring anything malformed.
 * @returns What was found; no progress when the key is missing, blocked or malformed
 */
function readStoredProgress(): StoredProgress {
  const progress = emptyProgress()
  let stored: unknown = null
  try {
    stored = parseJson(localStorage.getItem(PROGRESS_STORAGE_KEY))
  } catch (_error) {
    // Storage blocked (private browsing): start with no progress
  }
  if (!isPlainObject(stored)) {
    return {
      progress: progress,
      newer: false,
    }
  }
  if (typeof stored.version === 'number' && stored.version > PROGRESS_VERSION) {
    return {
      progress: progress,
      newer: true,
    }
  }
  if (stored.version === PROGRESS_VERSION && isPlainObject(stored.chambers)) {
    for (const [
      key,
      value,
    ] of Object.entries(stored.chambers)) {
      const chamberId = Number(key)
      const record = parseChamberRecord(value)
      if (Number.isInteger(chamberId) && chamberId > 0 && record !== null) {
        progress.chambers[String(chamberId)] = record
      }
    }
  }
  return {
    progress: progress,
    newer: false,
  }
}

/**
 * Finds the chamber a version 1 chamber number stood for.
 * @param chamberNumber - The stored chamber number
 * @returns The chamber's id as a record key, or null when the number is malformed or not in the frozen table
 */
function legacyChamberKey(chamberNumber: unknown): string | null {
  if (typeof chamberNumber !== 'number' || !Number.isInteger(chamberNumber)) {
    return null
  }
  const chamberId = LEGACY_CHAMBER_IDS[chamberNumber]
  return chamberId === undefined ? null : String(chamberId)
}

/**
 * Reads the progress stored by chamber number (version 1), mapped to chamber
 * ids through the frozen table. Malformed values and numbers missing from the
 * table are dropped.
 * @returns The progress by chamber id, or null when neither version 1 key exists
 */
function readLegacyProgress(): Record<string, ChamberRecord> | null {
  let completedText: string | null
  let bestTimesText: string | null
  try {
    completedText = localStorage.getItem(LEGACY_COMPLETED_STORAGE_KEY)
    bestTimesText = localStorage.getItem(LEGACY_BEST_TIMES_STORAGE_KEY)
  } catch (_error) {
    // Storage blocked: there is nothing to move over
    return null
  }
  if (completedText === null && bestTimesText === null) {
    return null
  }

  const chambers: Record<string, ChamberRecord> = {}
  const completed = parseJson(completedText)
  if (Array.isArray(completed)) {
    const chamberNumbers: unknown[] = completed
    for (const chamberNumber of chamberNumbers) {
      const key = legacyChamberKey(chamberNumber)
      if (key !== null) {
        chambers[key] = {
          ...(chambers[key] ?? EMPTY_CHAMBER),
          completed: true,
        }
      }
    }
  }
  // A completion may have no time; it stays completed without one
  const bestTimes = parseJson(bestTimesText)
  if (isPlainObject(bestTimes)) {
    for (const [
      chamberNumber,
      time,
    ] of Object.entries(bestTimes)) {
      const key = legacyChamberKey(Number(chamberNumber))
      if (key !== null && isCount(time)) {
        chambers[key] = {
          ...(chambers[key] ?? EMPTY_CHAMBER),
          bestTime: time,
        }
      }
    }
  }
  return chambers
}

/**
 * Picks the faster of two best times.
 * @param first - A best time in hundredths, or null for none
 * @param second - Another best time in hundredths, or null for none
 * @returns The smaller time, or null when neither exists
 */
function fasterTime(first: number | null, second: number | null): number | null {
  if (first === null) {
    return second
  }
  if (second === null) {
    return first
  }
  return Math.min(first, second)
}

/**
 * Combines two records of one chamber, keeping the most progress from each.
 * @param first - One record
 * @param second - The other record
 * @returns Completed if either is, the faster best time and the higher attempt count
 */
function mergeChamberRecords(first: ChamberRecord, second: ChamberRecord): ChamberRecord {
  return {
    completed: first.completed || second.completed,
    bestTime: fasterTime(first.bestTime, second.bestTime),
    attempts: Math.max(first.attempts, second.attempts),
  }
}

/**
 * Stores a progress record under the progress key.
 * @param record - The record to store
 * @returns Whether it was stored
 */
function writeProgress(record: ProgressRecord): boolean {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(record))
    return true
  } catch (_error) {
    // Storage blocked or full: the progress lasts for this visit only
    return false
  }
}

/**
 * Removes the version 1 keys.
 */
function removeLegacyKeys(): void {
  try {
    localStorage.removeItem(LEGACY_COMPLETED_STORAGE_KEY)
    localStorage.removeItem(LEGACY_BEST_TIMES_STORAGE_KEY)
  } catch (_error) {
    // Storage blocked: whatever is left is moved over again on the next load
  }
}

/**
 * Reads the stored progress, first moving over any progress still stored by
 * chamber number. The move merges into what is already stored, so running it
 * again (after a tab left open from before this version wrote the old keys
 * again, or after removing them failed) loses nothing.
 * @returns The progress, and whether storage holds a later version that must be left alone
 */
function loadProgress(): StoredProgress {
  const stored = readStoredProgress()
  if (stored.newer) {
    // Written by a later version of the game: leave it and the old keys untouched
    return stored
  }
  const legacy = readLegacyProgress()
  if (legacy === null) {
    return stored
  }
  const chambers = {
    ...stored.progress.chambers,
  }
  for (const [
    key,
    record,
  ] of Object.entries(legacy)) {
    const current = chambers[key]
    chambers[key] = current === undefined ? record : mergeChamberRecords(current, record)
  }
  const progress: ProgressRecord = {
    version: PROGRESS_VERSION,
    chambers: chambers,
  }
  // The new key marks the move as done, so the old keys go only once it is stored
  if (writeProgress(progress)) {
    removeLegacyKeys()
  }
  return {
    progress: progress,
    newer: false,
  }
}

const loaded = loadProgress()
let savingAllowed = !loaded.newer // False while storage holds a later version: progress then lasts for this visit only
const progress = ref<ProgressRecord>(loaded.progress)

// Another tab saved its progress (or reset it): take that over, so the next
// save from this tab, which writes the whole record, can't erase it
window.addEventListener('storage', (event) => {
  if (event.key !== PROGRESS_STORAGE_KEY && event.key !== null) {
    return
  }
  const stored = readStoredProgress()
  savingAllowed = !stored.newer
  progress.value = stored.progress
})

/**
 * Stores the current progress, unless storage holds a later version.
 */
function saveProgress(): void {
  if (savingAllowed) {
    writeProgress(progress.value)
  }
}

/**
 * Reads what is recorded for a chamber.
 * @param chamber - The chamber
 * @returns Its record, empty when nothing is recorded
 */
function chamberRecord(chamber: ChamberEntry): ChamberRecord {
  return progress.value.chambers[String(chamber.id)] ?? EMPTY_CHAMBER
}

/**
 * Changes what is recorded for a chamber and persists it.
 * @param chamber - The chamber
 * @param changes - The values to replace
 */
function updateChamber(chamber: ChamberEntry, changes: Partial<ChamberRecord>): void {
  progress.value = {
    version: PROGRESS_VERSION,
    chambers: {
      ...progress.value.chambers,
      [String(chamber.id)]: {
        ...chamberRecord(chamber),
        ...changes,
      },
    },
  }
  saveProgress()
}

/**
 * Whether the player has completed a chamber. Reactive: reading it in a
 * template updates the template when the progress changes.
 * @param chamber - The chamber
 * @returns True once the subject has reached its exit
 */
export function isCompleted(chamber: ChamberEntry): boolean {
  return chamberRecord(chamber).completed
}

/**
 * The best time in a chamber. Reactive, like isCompleted().
 * @param chamber - The chamber
 * @returns The fastest finished run in whole hundredths of a second, or null when there is none
 */
export function bestTime(chamber: ChamberEntry): number | null {
  return chamberRecord(chamber).bestTime
}

/**
 * Records a chamber as completed and persists it.
 * @param chamber - The chamber
 */
export function markChamberCompleted(chamber: ChamberEntry): void {
  if (isCompleted(chamber)) {
    return
  }
  updateChamber(chamber, {
    completed: true,
  })
}

/**
 * Keeps a finished run's time when it beats the chamber's best, and persists it.
 * @param chamber - The chamber
 * @param hundredths - The run's time in whole hundredths of a second
 * @returns Whether the time is the chamber's new best, which a first completion always is
 */
export function recordTime(chamber: ChamberEntry, hundredths: number): boolean {
  const best = bestTime(chamber)
  if (best !== null && hundredths >= best) {
    return false
  }
  updateChamber(chamber, {
    bestTime: hundredths,
  })
  return true
}

/**
 * Counts a new attempt at a chamber and persists it.
 * @param chamber - The chamber
 * @returns The attempt's number: 1 for the first since progress was last reset
 */
export function startAttempt(chamber: ChamberEntry): number {
  const attempt = chamberRecord(chamber).attempts + 1
  updateChamber(chamber, {
    attempts: attempt,
  })
  return attempt
}

/**
 * Forgets every chamber's completion, best time and attempts. Stores an empty
 * record rather than removing the key, and removes the version 1 keys, so
 * nothing is moved over again on the next load.
 */
export function resetProgress(): void {
  progress.value = emptyProgress()
  // Starting over is the player's choice, so it also replaces progress from a later version
  savingAllowed = true
  writeProgress(progress.value)
  removeLegacyKeys()
}
