import type {CompiledChamber} from '@/game/rules/compiled_chamber'
import {DIRECTIONS} from '@/game/rules/state_layout'
import {DELTAS} from '@/game/rules/step'

/** A tile's or wall side's number where there is none */
export const NO_NUMBER = -1

/**
 * Numbers a chamber's places for the solver: every tile that isn't wall, in
 * row order, and every side of a wall that takes portals facing such a tile,
 * where a portal can open. A state key stores these numbers instead of
 * columns and rows, so its fields are only as wide as the chamber needs.
 */
export class ChamberIndex {
  readonly chamber: CompiledChamber // The chamber numbered
  readonly tileCount: number // Tiles that aren't wall
  readonly sideCount: number // Sides of walls that take portals, facing a tile that isn't wall
  private readonly tileNumbers: Int32Array // Each cell's tile number, or NO_NUMBER on a wall
  private readonly tileCells: Int32Array // Each tile's cell
  private readonly sideNumbers: Int32Array // Each cell's side numbers, four per cell in DIRECTIONS order, or NO_NUMBER
  private readonly sideCells: Int32Array // Each side's wall cell
  private readonly sideDirections: Uint8Array // Each side's direction, as its index in DIRECTIONS

  /**
   * @param chamber - The chamber to number
   */
  constructor(chamber: CompiledChamber) {
    const cellCount = chamber.width * chamber.height
    const tileCells: number[] = []
    const sideCells: number[] = []
    const sideDirections: number[] = []

    this.chamber = chamber
    this.tileNumbers = new Int32Array(cellCount).fill(NO_NUMBER)
    this.sideNumbers = new Int32Array(cellCount * DIRECTIONS.length).fill(NO_NUMBER)

    for (let y = 0; y < chamber.height; y++) {
      for (let x = 0; x < chamber.width; x++) {
        if (!chamber.isWall(x, y)) {
          this.tileNumbers[this.cellOf(x, y)] = tileCells.length
          tileCells.push(this.cellOf(x, y))
        }
      }
    }

    for (let y = 0; y < chamber.height; y++) {
      for (let x = 0; x < chamber.width; x++) {
        if (!chamber.takesPortals(x, y)) {
          continue
        }

        DIRECTIONS.forEach((side, directionIndex) => {
          const facedX = x + DELTAS[side].dx
          const facedY = y + DELTAS[side].dy

          if (this.tileNumber(facedX, facedY) !== NO_NUMBER) {
            this.sideNumbers[(this.cellOf(x, y) * DIRECTIONS.length) + directionIndex] = sideCells.length
            sideCells.push(this.cellOf(x, y))
            sideDirections.push(directionIndex)
          }
        })
      }
    }

    this.tileCount = tileCells.length
    this.sideCount = sideCells.length
    this.tileCells = Int32Array.from(tileCells)
    this.sideCells = Int32Array.from(sideCells)
    this.sideDirections = Uint8Array.from(sideDirections)
  }

  /**
   * A tile's cell, its index in row order.
   * @param x - Column, inside the chamber
   * @param y - Row, inside the chamber
   * @returns The cell
   */
  private cellOf(x: number, y: number): number {
    return (y * this.chamber.width) + x
  }

  /**
   * Whether a tile is inside the chamber.
   * @param x - Column
   * @param y - Row
   * @returns True inside
   */
  private isInside(x: number, y: number): boolean {
    return (x >= 0) && (y >= 0) && (x < this.chamber.width) && (y < this.chamber.height)
  }

  /**
   * A tile's number.
   * @param x - Column
   * @param y - Row
   * @returns The number, or NO_NUMBER on a wall and outside the chamber
   */
  tileNumber(x: number, y: number): number {
    return this.isInside(x, y) ? (this.tileNumbers[this.cellOf(x, y)] ?? NO_NUMBER) : NO_NUMBER
  }

  /**
   * The cell of a numbered tile.
   * @param tile - The tile's number
   * @returns The cell
   * @throws RangeError for a number no tile has
   */
  private tileCell(tile: number): number {
    const cell = this.tileCells[tile]

    if (cell === undefined) {
      throw new RangeError(`no tile ${tile} in the chamber`)
    }

    return cell
  }

  /**
   * A numbered tile's column.
   * @param tile - The tile's number
   * @returns The column
   */
  tileX(tile: number): number {
    return this.tileCell(tile) % this.chamber.width
  }

  /**
   * A numbered tile's row.
   * @param tile - The tile's number
   * @returns The row
   */
  tileY(tile: number): number {
    return Math.floor(this.tileCell(tile) / this.chamber.width)
  }

  /**
   * A wall side's number.
   * @param x - The wall's column
   * @param y - The wall's row
   * @param directionIndex - The side, as its index in DIRECTIONS
   * @returns The number, or NO_NUMBER where no portal can open
   */
  sideNumber(x: number, y: number, directionIndex: number): number {
    if ((!this.isInside(x, y)) || (directionIndex < 0) || (directionIndex >= DIRECTIONS.length)) {
      return NO_NUMBER
    }

    return this.sideNumbers[(this.cellOf(x, y) * DIRECTIONS.length) + directionIndex] ?? NO_NUMBER
  }

  /**
   * The wall cell of a numbered side.
   * @param side - The side's number
   * @returns The cell
   * @throws RangeError for a number no side has
   */
  private sideCell(side: number): number {
    const cell = this.sideCells[side]

    if (cell === undefined) {
      throw new RangeError(`no wall side ${side} in the chamber`)
    }

    return cell
  }

  /**
   * The column of a numbered side's wall.
   * @param side - The side's number
   * @returns The column
   */
  sideX(side: number): number {
    return this.sideCell(side) % this.chamber.width
  }

  /**
   * The row of a numbered side's wall.
   * @param side - The side's number
   * @returns The row
   */
  sideY(side: number): number {
    return Math.floor(this.sideCell(side) / this.chamber.width)
  }

  /**
   * Which side of its wall a numbered side is.
   * @param side - The side's number
   * @returns The side, as its index in DIRECTIONS
   * @throws RangeError for a number no side has
   */
  sideDirection(side: number): number {
    const directionIndex = this.sideDirections[side]

    if (directionIndex === undefined) {
      throw new RangeError(`no wall side ${side} in the chamber`)
    }

    return directionIndex
  }
}
