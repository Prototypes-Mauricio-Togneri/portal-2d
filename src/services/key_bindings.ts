/**
 * The keys the player has bound to each game key, kept in localStorage and
 * handed to the game when a chamber opens. One key per game key, never shared;
 * whatever can't be read falls back to the defaults.
 */
import {computed, shallowRef} from 'vue'
import {GameKey} from '@/game/game_key'
import {type BoundKey, DEFAULT_KEY_BINDINGS, isBindableKey, type KeyBindings} from '@/game/key_bindings'

const KEY_BINDINGS_STORAGE_KEY = 'portal-2d.key-bindings'

/** Every game key, in the order bindings are checked */
const GAME_KEYS: readonly GameKey[] = Object.values(GameKey)

/**
 * Whether a parsed JSON value is an object of named values (not an array).
 * @param value - The parsed value
 * @returns True for an object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Reads stored bindings, keeping what is well formed. Game keys are checked in
 * order: a stored key is kept when it can be bound and no earlier game key
 * holds it; otherwise the game key gets its default. When a default is then
 * already taken, every game key goes back to its default.
 * @param value - The parsed stored value
 * @returns Bindings with one key per game key, none shared
 */
function readBindings(value: unknown): KeyBindings {
  if (!isPlainObject(value)) {
    return DEFAULT_KEY_BINDINGS
  }
  const bindings: Record<GameKey, BoundKey> = {
    ...DEFAULT_KEY_BINDINGS,
  }
  const kept = new Set<GameKey>()
  const usedKeys = new Set<BoundKey>()
  for (const gameKey of GAME_KEYS) {
    const key = value[gameKey]
    if (typeof key === 'string' && isBindableKey(key) && !usedKeys.has(key)) {
      bindings[gameKey] = key
      kept.add(gameKey)
      usedKeys.add(key)
    }
  }
  for (const gameKey of GAME_KEYS) {
    if (kept.has(gameKey)) {
      continue
    }
    const fallback = DEFAULT_KEY_BINDINGS[gameKey]
    if (usedKeys.has(fallback)) {
      return DEFAULT_KEY_BINDINGS
    }
    usedKeys.add(fallback)
  }
  return bindings
}

/**
 * Loads the stored bindings.
 * @returns The bindings, or the defaults when nothing usable is stored
 */
function loadBindings(): KeyBindings {
  try {
    const text = localStorage.getItem(KEY_BINDINGS_STORAGE_KEY)
    if (text === null) {
      return DEFAULT_KEY_BINDINGS
    }
    const value: unknown = JSON.parse(text)
    return readBindings(value)
  } catch (_error) {
    // Storage blocked or the text is not JSON
    return DEFAULT_KEY_BINDINGS
  }
}

/**
 * Stores bindings, or forgets them so the defaults apply.
 * @param bindings - The bindings to store, or null to go back to the defaults
 */
function saveBindings(bindings: KeyBindings | null): void {
  try {
    if (bindings === null) {
      localStorage.removeItem(KEY_BINDINGS_STORAGE_KEY)
    } else {
      localStorage.setItem(KEY_BINDINGS_STORAGE_KEY, JSON.stringify(bindings))
    }
  } catch (_error) {
    // Storage blocked: the bindings last for this visit only
  }
}

const bindings = shallowRef<KeyBindings>(loadBindings())

/**
 * The bound keys, read-only: a new plain object after every change, never
 * made reactive itself, so it can be handed to the game as it is.
 */
export const keyBindings = computed(() => bindings.value)

/**
 * Binds a key to a game key. A key already bound to another game key is
 * swapped: that game key takes this one's previous key.
 * @param gameKey - The game key to rebind
 * @param key - The key to bind it to, which must be bindable
 */
export function bindKey(gameKey: GameKey, key: BoundKey): void {
  const current = bindings.value
  const previousKey = current[gameKey]
  if (previousKey === key) {
    return
  }
  const updated: Record<GameKey, BoundKey> = {
    ...current,
  }
  const holder = GAME_KEYS.find((otherKey) => current[otherKey] === key)
  if (holder !== undefined) {
    updated[holder] = previousKey
  }
  updated[gameKey] = key
  bindings.value = updated
  saveBindings(updated)
}

/**
 * Puts every game key back on its default key.
 */
export function resetKeyBindings(): void {
  bindings.value = DEFAULT_KEY_BINDINGS
  saveBindings(null)
}
