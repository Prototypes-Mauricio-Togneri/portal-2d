/**
 * Orientation of a laser beam: H for horizontal, V for vertical.
 */
export type LaserDirection = 'H' | 'V'

/**
 * Narrows a laser orientation read from chamber JSON.
 * @param value - The direction string from the data
 * @returns The same value, typed as a LaserDirection
 * @throws Error when the value is neither H nor V
 */
export function parseLaserDirection(value: string): LaserDirection {
  if (value === 'H' || value === 'V') {
    return value
  }

  throw new Error(`Unknown laser direction: ${value}`)
}
