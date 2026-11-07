import {GameKey} from '@/game/game_key'

/**
 * A key as the game binds it: the physical key's KeyboardEvent.code, except
 * that both keys of a left and right modifier pair share one name ("Control",
 * "Shift"), so either of them will do.
 */
export type BoundKey = string

/**
 * The key each game key is bound to: one key each, never shared.
 */
export type KeyBindings = Readonly<Record<GameKey, BoundKey>>

/** Today's keys by position: arrows, A, D, Space, either Ctrl, Z and X */
export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  [GameKey.UP]: 'ArrowUp',
  [GameKey.DOWN]: 'ArrowDown',
  [GameKey.LEFT]: 'ArrowLeft',
  [GameKey.RIGHT]: 'ArrowRight',
  [GameKey.BLUE]: 'KeyA',
  [GameKey.ORANGE]: 'KeyD',
  [GameKey.INTERACT]: 'Space',
  [GameKey.TURN]: 'Control',
  [GameKey.UNDO]: 'KeyZ',
  [GameKey.REDO]: 'KeyX',
}

/** The shared name of each left and right modifier key */
const FOLDED_KEYS: Readonly<Record<string, BoundKey>> = {
  ControlLeft: 'Control',
  ControlRight: 'Control',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
}

/**
 * Keys that can't be bound: Escape and Tab belong to the screens, and Alt,
 * Meta (with the names older browsers give it) and the function keys to the
 * browser. Unidentified stands for a key the browser can't name.
 */
const UNBINDABLE_KEYS: ReadonlySet<string> = new Set([
  'Escape',
  'Tab',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'OSLeft',
  'OSRight',
  'Unidentified',
])

/** Function keys, F1 to F24 */
const FUNCTION_KEY_PATTERN = /^F\d+$/

/**
 * The key a keyboard event's code is bound as.
 * @param code - A KeyboardEvent.code
 * @returns The key, with left and right modifiers folded into one, or null
 * when the key can't be bound
 */
export function getBoundKey(code: string): BoundKey | null {
  if ((code === '') || UNBINDABLE_KEYS.has(code) || FUNCTION_KEY_PATTERN.test(code)) {
    return null
  }

  return FOLDED_KEYS[code] ?? code
}

/**
 * Whether a key name is one a binding can hold: a key that can be bound,
 * with left and right modifiers already folded into one.
 * @param key - The key name, such as a stored binding
 * @returns True when a binding can hold it
 */
export function isBindableKey(key: string): boolean {
  return getBoundKey(key) === key
}
