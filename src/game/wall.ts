/**
 * A solid wall tile. Portals can only be opened on walls.
 */
export class Wall {
  static readonly fillColor = '#9C9C9C' // Body colour
  static readonly borderColor = '#3C3C3C' // Edge colour
  static readonly borderWidth = 0.1 // Edge width in pixels

  readonly x: number // Column
  readonly y: number // Row

  /**
   * @param x - Column
   * @param y - Row
   */
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }
}
