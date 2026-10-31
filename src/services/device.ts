/**
 * Device capabilities the app depends on.
 */

/**
 * True when the primary pointer is a finger (phones, tablets).
 * The game is played with a keyboard, so these devices get the desktop-only notice.
 */
export const isTouchFirst = window.matchMedia('(pointer: coarse)').matches
