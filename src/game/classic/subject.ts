import type {Box} from '@/game/classic/box'
import type {SubjectData} from '@/game/chamber_data'
import {Direction, parseDirection} from '@/game/direction'

/**
 * A unit step on the grid: each component is -1, 0 or 1.
 */
type PointingDirection = {
  x: number
  y: number
}

/**
 * The test subject the player moves around the chamber.
 */
export class Subject {
  static readonly fillColor = '#00A064' // Body colour
  static readonly borderColor = '#828282' // Edge colour
  static readonly borderWidth = 0.1 // Edge width in pixels
  static readonly arrowColor = '#FFFFFF' // Facing triangle colour when not carrying a box

  x: number // Column
  y: number // Row
  direction: Direction // Which way it faces, and so where it shoots
  box: Box | null = null // The box being carried

  /**
   * @param data - The subject's entry in the chamber JSON
   */
  constructor(data: SubjectData) {
    this.x = data.x
    this.y = data.y
    this.direction = parseDirection(data.direction)
  }

  /**
   * Unit step in the direction the subject faces, with y growing upwards.
   */
  get pointingDirection(): PointingDirection {
    const result: PointingDirection = {
      x: 0,
      y: 0,
    }

    if (this.direction === Direction.LEFT) {
      result.x = -1
    } else if (this.direction === Direction.RIGHT) {
      result.x = 1
    }

    if (this.direction === Direction.UP) {
      result.y = 1
    } else if (this.direction === Direction.DOWN) {
      result.y = -1
    }

    return result
  }

  /**
   * Whether the subject is carrying a box.
   */
  get hasBox(): boolean {
    return this.box !== null
  }

  /**
   * Sends the carried box back to its starting tile and lets go of it.
   */
  destroyBox(): void {
    // Only called while carrying a box, so the optional call never skips
    this.box?.reset()
    this.releaseBox()
  }

  /**
   * Picks up a box.
   * @param box - The box to carry
   */
  setBox(box: Box): void {
    this.box = box
  }

  /**
   * Puts the carried box down where it is.
   */
  releaseBox(): void {
    this.box = null
  }

  /**
   * Moves the carried box onto the subject's tile.
   * @returns Whether the box moved
   */
  updateBox(): boolean {
    let boxUpdated = false

    if (this.box !== null) {
      boxUpdated = (this.box.x !== this.x) || (this.box.y !== this.y)

      this.box.x = this.x
      this.box.y = this.y
    }

    return boxUpdated
  }
}
