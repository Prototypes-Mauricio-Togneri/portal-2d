/**
 * Which way the subject, an arrow or a portal faces. UP is towards higher y.
 */
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

/**
 * Named values of Direction.
 */
export const Direction = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
} as const

/**
 * A column and row step.
 */
export type Delta = {
  readonly dx: number // Column step
  readonly dy: number // Row step
}

/** The step one tile each way takes */
export const DELTAS: Readonly<Record<Direction, Delta>> = {
  [Direction.UP]: {
    dx: 0,
    dy: 1,
  },
  [Direction.DOWN]: {
    dx: 0,
    dy: -1,
  },
  [Direction.LEFT]: {
    dx: -1,
    dy: 0,
  },
  [Direction.RIGHT]: {
    dx: 1,
    dy: 0,
  },
}

/**
 * Narrows a direction read from chamber JSON.
 * @param value - The direction string from the data
 * @returns The same value, typed as a Direction
 * @throws Error when the value is not one of the four directions
 */
export function parseDirection(value: string): Direction {
  if (value === Direction.UP || value === Direction.DOWN || value === Direction.LEFT || value === Direction.RIGHT) {
    return value
  }

  throw new Error(`Unknown direction: ${value}`)
}
