/**
 * What is printed on each key of the player's keyboard, for showing bound
 * keys. Letters, digits and punctuation follow the player's layout where the
 * browser can tell it (Chromium's keyboard layout map), and a US keyboard
 * otherwise; every other key, and each mouse button, has a fixed name.
 */
import {shallowRef} from 'vue'
import type {BoundKey} from '@/game/key_bindings'

/** How a key is shown and read aloud. */
export type KeyLabel = {
  text: string // As printed on the key, such as "Q", "Space" or "↑"
  name: string // As read aloud, such as "Q", "Space" or "Up arrow"
}

/** The part of the Keyboard API, found only in Chromium, that reads the layout. */
type KeyboardLayoutReader = {
  getLayoutMap(): Promise<ReadonlyMap<string, string>> // The character each writing key types, by KeyboardEvent.code
}

/** Keys and mouse buttons whose label doesn't depend on the layout */
const NAMED_KEYS: Readonly<Record<string, KeyLabel>> = {
  MouseLeft: {
    text: 'Left click',
    name: 'Left mouse button',
  },
  MouseRight: {
    text: 'Right click',
    name: 'Right mouse button',
  },
  ArrowUp: {
    text: '↑',
    name: 'Up arrow',
  },
  ArrowDown: {
    text: '↓',
    name: 'Down arrow',
  },
  ArrowLeft: {
    text: '←',
    name: 'Left arrow',
  },
  ArrowRight: {
    text: '→',
    name: 'Right arrow',
  },
  Space: {
    text: 'Space',
    name: 'Space',
  },
  Control: {
    text: 'Ctrl',
    name: 'Control',
  },
  Shift: {
    text: 'Shift',
    name: 'Shift',
  },
  Enter: {
    text: 'Enter',
    name: 'Enter',
  },
  NumpadEnter: {
    text: 'Enter',
    name: 'Numpad enter',
  },
  Backspace: {
    text: 'Backspace',
    name: 'Backspace',
  },
  Delete: {
    text: 'Del',
    name: 'Delete',
  },
  Insert: {
    text: 'Ins',
    name: 'Insert',
  },
  Home: {
    text: 'Home',
    name: 'Home',
  },
  End: {
    text: 'End',
    name: 'End',
  },
  PageUp: {
    text: 'PgUp',
    name: 'Page up',
  },
  PageDown: {
    text: 'PgDn',
    name: 'Page down',
  },
  CapsLock: {
    text: 'Caps',
    name: 'Caps lock',
  },
  ContextMenu: {
    text: 'Menu',
    name: 'Menu',
  },
  NumpadAdd: {
    text: 'Num +',
    name: 'Numpad plus',
  },
  NumpadSubtract: {
    text: 'Num -',
    name: 'Numpad minus',
  },
  NumpadMultiply: {
    text: 'Num *',
    name: 'Numpad multiply',
  },
  NumpadDivide: {
    text: 'Num /',
    name: 'Numpad divide',
  },
  NumpadDecimal: {
    text: 'Num .',
    name: 'Numpad decimal',
  },
}

/** The way an arrow key points, drawn on its cap as a triangle. */
export type KeyArrow = 'up' | 'down' | 'left' | 'right'

/** The arrow keys, by the way each points */
const ARROW_KEYS: Readonly<Record<string, KeyArrow>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

/** What a US keyboard prints on its punctuation keys */
const US_PUNCTUATION: Readonly<Record<string, string>> = {
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  IntlBackslash: '\\',
  Semicolon: ';',
  Quote: '\'',
  Backquote: '`',
  Comma: ',',
  Period: '.',
  Slash: '/',
}

const layoutCharacters = shallowRef<ReadonlyMap<string, string> | null>(null) // The player's layout, once the browser has told it

/**
 * Whether a value can read the keyboard layout.
 * @param value - navigator.keyboard, where the browser has it
 * @returns True when it has getLayoutMap
 */
function canReadLayout(value: unknown): value is KeyboardLayoutReader {
  return typeof value === 'object' && value !== null && 'getLayoutMap' in value && typeof value.getLayoutMap === 'function'
}

/**
 * What a US keyboard prints on a letter, digit, numpad digit or punctuation key.
 * @param key - The key
 * @returns The printed text, or null for any other key
 */
function getUsText(key: BoundKey): string | null {
  const match = /^(?:Key([A-Z])|Digit(\d)|Numpad(\d))$/.exec(key)
  if (match !== null) {
    const numpadDigit = match[3]
    return numpadDigit === undefined ? (match[1] ?? match[2] ?? null) : `Num ${numpadDigit}`
  }
  return US_PUNCTUATION[key] ?? null
}

/**
 * Asks the browser for the player's keyboard layout, so letters, digits and
 * punctuation show what the player's keys print. Call it when keys are about
 * to be shown, since the player may have switched layouts; browsers that
 * can't tell keep showing a US keyboard.
 */
export function refreshKeyLabels(): void {
  const keyboard = 'keyboard' in navigator ? navigator.keyboard : null
  if (!canReadLayout(keyboard)) {
    return
  }
  keyboard.getLayoutMap().then((layout) => {
    layoutCharacters.value = layout
  }, (_error: unknown) => {
    // Not allowed here (such as inside a frame): keep what is shown
  })
}

/**
 * How a bound key is shown and read aloud. Reactive: it changes once the
 * player's layout is known.
 * @param key - The key
 * @returns Its label; a key with no known label shows its code
 */
export function getKeyLabel(key: BoundKey): KeyLabel {
  const named = NAMED_KEYS[key]
  if (named !== undefined) {
    return named
  }
  const layoutText = layoutCharacters.value?.get(key)
  const text = (layoutText === undefined || layoutText === '') ? getUsText(key) : layoutText.toLocaleUpperCase()
  return {
    text: text ?? key,
    name: text ?? key,
  }
}

/**
 * Which way an arrow key points, so its cap can show a triangle instead of its text.
 * @param key - The key
 * @returns Its direction, or null for any key but the four arrows
 */
export function getKeyArrow(key: BoundKey): KeyArrow | null {
  return ARROW_KEYS[key] ?? null
}

refreshKeyLabels()
