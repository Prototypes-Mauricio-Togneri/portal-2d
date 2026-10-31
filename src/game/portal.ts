import {Direction} from '@/game/direction'

/**
 * Colours of one of the two portals. The style object itself also identifies
 * which portal a shot opens.
 */
export type PortalStyle = {
  readonly fillColor: string
  readonly borderColor: string
  readonly borderWidth: number
}

/**
 * Where a subject crossing a portal comes out, and which way it then faces.
 */
export type PortalExit = {
  x: number
  y: number
  direction: Direction | null
}

/**
 * One end of the gateway: a portal on a wall tile, facing away from the wall
 * towards the tile the subject comes out on.
 */
export class Portal {
  static readonly BLUE: PortalStyle = {
    fillColor: '#288CDC',
    borderColor: '#227ABF',
    borderWidth: 1,
  } // Shot with the A key

  static readonly ORANGE: PortalStyle = {
    fillColor: '#FFA01E',
    borderColor: '#D18011',
    borderWidth: 1,
  } // Shot with the D key

  x = -1 // Column of the wall it is on, -1 when closed
  y = -1 // Row of the wall it is on, -1 when closed
  direction: Direction | null = null // Side of the wall it opens to, null when closed

  /**
   * Whether the portal is open.
   */
  get activated(): boolean {
    return (this.x !== -1) && (this.y !== -1)
  }

  /**
   * Opens the portal on a wall.
   * @param x - Column of the wall
   * @param y - Row of the wall
   * @param directionX - Horizontal component of the side it faces
   * @param directionY - Vertical component of the side it faces
   */
  set(x: number, y: number, directionX: number, directionY: number): void {
    this.x = x
    this.y = y

    if (directionX > 0) {
      this.direction = Direction.RIGHT
    } else if (directionX < 0) {
      this.direction = Direction.LEFT
    } else if (directionY > 0) {
      this.direction = Direction.UP
    } else if (directionY < 0) {
      this.direction = Direction.DOWN
    }
  }

  /**
   * The tile in front of the portal and the direction it faces.
   */
  get exitPosition(): PortalExit {
    const result: PortalExit = {
      x: this.x,
      y: this.y,
      direction: this.direction,
    }

    switch (this.direction) {
      case Direction.UP:
        result.y++
        break

      case Direction.DOWN:
        result.y--
        break

      case Direction.LEFT:
        result.x--
        break

      case Direction.RIGHT:
        result.x++
        break
    }

    return result
  }

  /**
   * Closes the portal.
   */
  clear(): void {
    this.x = -1
    this.y = -1
    this.direction = null
  }

  /**
   * Whether the portal is on a tile.
   * @param x - Column
   * @param y - Row
   * @returns True when the portal's wall is at x, y
   */
  isIn(x: number, y: number): boolean {
    return (this.x === x) && (this.y === y)
  }

  /**
   * Whether a tile is the one in front of the portal.
   * @param x - Column
   * @param y - Row
   * @returns True when x, y is where a subject crossing this portal would come out
   */
  isInExit(x: number, y: number): boolean {
    const exitPosition = this.exitPosition

    return (exitPosition.x === x) && (exitPosition.y === y)
  }
}
