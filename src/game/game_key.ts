/**
 * A key the game reads, named by what it does rather than where it is on the
 * keyboard. Input maps the physical keys to these names.
 */
export type GameKey = 'up' | 'down' | 'left' | 'right' | 'blue' | 'orange' | 'interact'

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
} as const
