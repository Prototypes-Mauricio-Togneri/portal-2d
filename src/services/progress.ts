/**
 * The player's progress in each chamber: whether it is completed, its best
 * time and how many attempts it has had. Kept in localStorage under one
 * versioned key, by the chamber's permanent id, so records follow a chamber
 * when the list is reordered.
 */
import {ref} from 'vue'
import type {ChamberEntry} from '@/services/chamber_catalogue'

const PROGRESS_STORAGE_KEY = 'portal-2d.progress'
const PROGRESS_VERSION = 2 // Format of the stored record; a record of any other version is ignored

/** What is stored for one chamber. */
type ChamberRecord = {
  completed: boolean // Whether the subject has reached the exit at least once
  bestTime: number | null // Fastest finished run, in whole hundredths of a second; null when there is none
  attempts: number // Runs started: each opening, Restart chamber and Play again
}

/** Everything stored, as written to localStorage. */
type ProgressRecord = {
  version: typeof PROGRESS_VERSION // Format of the record
  chambers: Record<string, ChamberRecord> // By permanent chamber id
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
 * @returns The progress; none when the key is missing, blocked or malformed
 */
function readStoredProgress(): ProgressRecord {
  const progress = emptyProgress()
  let stored: unknown = null
  try {
    stored = parseJson(localStorage.getItem(PROGRESS_STORAGE_KEY))
  } catch (_error) {
    // Storage blocked (private browsing): start with no progress
  }
  if (isPlainObject(stored) && stored.version === PROGRESS_VERSION && isPlainObject(stored.chambers)) {
    for (const [
      key,
      value,
    ] of Object.entries(stored.chambers)) {
      const chamberId = Number(key)
      const record = parseChamberRecord(value)
      // The key must be the id as saves write it, so a malformed key such as '' or '00' can't pass as id 0
      if (Number.isInteger(chamberId) && chamberId >= 0 && String(chamberId) === key && record !== null) {
        progress.chambers[String(chamberId)] = record
      }
    }
  }
  return progress
}

/**
 * Stores a progress record under the progress key.
 * @param record - The record to store
 */
function writeProgress(record: ProgressRecord): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(record))
  } catch (_error) {
    // Storage blocked or full: the progress lasts for this visit only
  }
}

const progress = ref<ProgressRecord>(readStoredProgress())

// Another tab saved its progress (or reset it): take that over, so the next
// save from this tab, which writes the whole record, can't erase it
window.addEventListener('storage', (event) => {
  if (event.key !== PROGRESS_STORAGE_KEY && event.key !== null) {
    return
  }
  progress.value = readStoredProgress()
})

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
  writeProgress(progress.value)
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
 * Forgets every chamber's completion, best time and attempts, storing an
 * empty record.
 */
export function resetProgress(): void {
  progress.value = emptyProgress()
  writeProgress(progress.value)
}
