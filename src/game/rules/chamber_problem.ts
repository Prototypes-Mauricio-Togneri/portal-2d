/**
 * How much a problem in a chamber file matters: an error keeps the chamber
 * from loading, a warning doesn't.
 */
export type ChamberProblemLevel = 'error' | 'warning'

/**
 * Named values of ChamberProblemLevel.
 */
export const ChamberProblemLevel = {
  ERROR: 'error',
  WARNING: 'warning',
} as const

/**
 * The tile of the chamber a problem is about.
 */
export type ProblemTile = {
  readonly x: number // Column
  readonly y: number // Row
}

/**
 * One problem found in a chamber file.
 */
export type ChamberProblem = {
  readonly level: ChamberProblemLevel // Whether it keeps the chamber from loading
  readonly field: string // Where in the file, such as "doors[2].x"; empty for the file as a whole
  readonly tile: ProblemTile | null // The tile it is about, when it is about one
  readonly message: string // What is wrong, in plain words
}

/**
 * A problem that keeps the chamber from loading.
 * @param field - Where in the file, empty for the file as a whole
 * @param tile - The tile it is about, or null
 * @param message - What is wrong
 * @returns The problem
 */
export function chamberError(field: string, tile: ProblemTile | null, message: string): ChamberProblem {
  return {
    level: ChamberProblemLevel.ERROR,
    field: field,
    tile: tile,
    message: message,
  }
}

/**
 * A problem worth knowing about that doesn't keep the chamber from loading.
 * @param field - Where in the file, empty for the file as a whole
 * @param tile - The tile it is about, or null
 * @param message - What is wrong
 * @returns The problem
 */
export function chamberWarning(field: string, tile: ProblemTile | null, message: string): ChamberProblem {
  return {
    level: ChamberProblemLevel.WARNING,
    field: field,
    tile: tile,
    message: message,
  }
}

/**
 * Writes a problem on one line, such as "error doors[2] at (3, 4): ...".
 * @param problem - The problem
 * @returns The line
 */
export function formatChamberProblem(problem: ChamberProblem): string {
  const place: string[] = [problem.level]

  if (problem.field !== '') {
    place.push(problem.field)
  }

  if (problem.tile !== null) {
    place.push(`at (${problem.tile.x}, ${problem.tile.y})`)
  }

  return `${place.join(' ')}: ${problem.message}`
}
