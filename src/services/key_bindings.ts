/**
 * The player's controls: one of two fixed layouts, Arrow keys (the default)
 * and WASD and mouse, or their own Custom keys, kept apart so picking a layout
 * never loses them. Stored in localStorage and handed to the game when a
 * chamber opens. One key or mouse button per game key, never shared; whatever
 * can't be read falls back to Arrow keys.
 */
import {computed, shallowRef} from 'vue'
import {GameKey} from '@/game/game_key'
import {ARROW_KEY_BINDINGS, type BoundKey, isBindableKey, type KeyBindings, WASD_MOUSE_BINDINGS} from '@/game/key_bindings'

/** A set of controls the player can pick. */
export type ControlLayout = 'arrow-keys' | 'wasd-mouse' | 'custom'

/**
 * Named values of ControlLayout.
 */
export const ControlLayout = {
  ARROW_KEYS: 'arrow-keys',
  WASD_MOUSE: 'wasd-mouse',
  CUSTOM: 'custom',
} as const

/** What is stored: the layout picked, and the Custom keys once there are any. */
type StoredControls = {
  layout: ControlLayout // The layout in use
  custom: KeyBindings | null // The Custom keys, kept while another layout is in use; null until Custom is first picked
}

const KEY_BINDINGS_STORAGE_KEY = 'portal-2d.key-bindings'

/** Every game key, in the order bindings are checked */
const GAME_KEYS: readonly GameKey[] = Object.values(GameKey)

/** The keys of each fixed layout */
const FIXED_LAYOUTS: Readonly<Record<Exclude<ControlLayout, typeof ControlLayout.CUSTOM>, KeyBindings>> = {
  [ControlLayout.ARROW_KEYS]: ARROW_KEY_BINDINGS,
  [ControlLayout.WASD_MOUSE]: WASD_MOUSE_BINDINGS,
}

/** Every layout, for reading a stored one */
const LAYOUTS: ReadonlySet<string> = new Set(Object.values(ControlLayout))

/** What applies when nothing usable is stored */
const DEFAULT_CONTROLS: StoredControls = {
  layout: ControlLayout.ARROW_KEYS,
  custom: null,
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
 * Whether a stored value names a layout.
 * @param value - The stored value
 * @returns True for a layout
 */
function isControlLayout(value: unknown): value is ControlLayout {
  return typeof value === 'string' && LAYOUTS.has(value)
}

/**
 * Reads stored Custom keys, keeping what is well formed. Game keys are checked
 * in order: a stored key is kept when it can be bound and no earlier game key
 * holds it; otherwise the game key gets its Arrow keys key. When that key is
 * then already taken, every game key goes back to Arrow keys.
 * @param value - The parsed stored value
 * @returns Bindings with one key per game key, none shared
 */
function readBindings(value: unknown): KeyBindings {
  if (!isPlainObject(value)) {
    return ARROW_KEY_BINDINGS
  }
  const bindings: Record<GameKey, BoundKey> = {
    ...ARROW_KEY_BINDINGS,
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
    const fallback = ARROW_KEY_BINDINGS[gameKey]
    if (usedKeys.has(fallback)) {
      return ARROW_KEY_BINDINGS
    }
    usedKeys.add(fallback)
  }
  return bindings
}

/**
 * Reads the stored controls. A layout that isn't one, or Custom with no keys
 * stored, falls back to Arrow keys.
 * @param value - The parsed stored value
 * @returns The controls
 */
function readControls(value: unknown): StoredControls {
  if (!isPlainObject(value)) {
    return DEFAULT_CONTROLS
  }
  const custom = (value.custom === undefined || value.custom === null) ? null : readBindings(value.custom)
  const layout = isControlLayout(value.layout) ? value.layout : ControlLayout.ARROW_KEYS
  return {
    layout: (layout === ControlLayout.CUSTOM && custom === null) ? ControlLayout.ARROW_KEYS : layout,
    custom: custom,
  }
}

/**
 * Loads the stored controls.
 * @returns The controls, or Arrow keys when nothing usable is stored
 */
function loadControls(): StoredControls {
  try {
    const text = localStorage.getItem(KEY_BINDINGS_STORAGE_KEY)
    if (text === null) {
      return DEFAULT_CONTROLS
    }
    const value: unknown = JSON.parse(text)
    return readControls(value)
  } catch (_error) {
    // Storage blocked or the text is not JSON
    return DEFAULT_CONTROLS
  }
}

/**
 * Stores the controls.
 * @param controls - The controls to store
 */
function saveControls(controls: StoredControls): void {
  try {
    localStorage.setItem(KEY_BINDINGS_STORAGE_KEY, JSON.stringify(controls))
  } catch (_error) {
    // Storage blocked: the controls last for this visit only
  }
}

/**
 * The keys a layout binds.
 * @param controls - The controls
 * @returns The keys of the layout in use
 */
function bindingsOf(controls: StoredControls): KeyBindings {
  if (controls.layout === ControlLayout.CUSTOM) {
    return controls.custom ?? ARROW_KEY_BINDINGS
  }
  return FIXED_LAYOUTS[controls.layout]
}

const controls = shallowRef<StoredControls>(loadControls())

/**
 * The layout in use, read-only.
 */
export const controlLayout = computed(() => controls.value.layout)

/**
 * The bound keys of the layout in use, read-only: a plain object, replaced on
 * every change and never made reactive itself, so it can be handed to the
 * game as it is.
 */
export const keyBindings = computed(() => bindingsOf(controls.value))

/**
 * Puts a layout in use. The first time Custom is picked, its keys start as
 * those of the layout in use.
 * @param layout - The layout
 */
export function chooseControlLayout(layout: ControlLayout): void {
  const current = controls.value
  const updated: StoredControls = {
    layout: layout,
    custom: (layout === ControlLayout.CUSTOM && current.custom === null) ? bindingsOf(current) : current.custom,
  }
  controls.value = updated
  saveControls(updated)
}

/**
 * Binds a key or mouse button to a game key in the Custom keys, and puts
 * Custom in use. A key already bound to another game key is swapped: that
 * game key takes this one's previous key.
 * @param gameKey - The game key to rebind
 * @param key - The key or mouse button to bind it to, which must be bindable
 */
export function bindKey(gameKey: GameKey, key: BoundKey): void {
  const current = controls.value
  const custom = current.custom ?? bindingsOf(current)
  const previousKey = custom[gameKey]
  const updated: Record<GameKey, BoundKey> = {
    ...custom,
  }
  if (previousKey !== key) {
    const holder = GAME_KEYS.find((otherKey) => custom[otherKey] === key)
    if (holder !== undefined) {
      updated[holder] = previousKey
    }
    updated[gameKey] = key
  }
  const stored: StoredControls = {
    layout: ControlLayout.CUSTOM,
    custom: updated,
  }
  controls.value = stored
  saveControls(stored)
}
