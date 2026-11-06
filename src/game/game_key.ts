/**
 * A key the game reads, named by what it does rather than where it is on the
 * keyboard. Input maps the physical keys to these names.
 */
export type GameKey = 'up' | 'down' | 'left' | 'right' | 'blue' | 'orange' | 'interact' | 'turn' | 'undo' | 'redo'

/**
 * Named values of GameKey.
 */
export const GameKey = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  BLUE: 'blue',
  ORANGE: 'orange',
  INTERACT: 'interact',
  TURN: 'turn',
  UNDO: 'undo',
  REDO: 'redo',
} as const

/**
 * A key that steps through the run's history instead of playing: the level
 * handles it, and the rules never read it.
 */
export type HistoryKey = typeof GameKey.UNDO | typeof GameKey.REDO
