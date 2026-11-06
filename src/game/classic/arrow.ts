import type {ArrowData} from '@/game/chamber_data'
import {type Direction, parseDirection} from '@/game/direction'

/**
 * A one-way floor tile: the subject can only enter it, and only leave it,
 * moving in its direction.
 */
export class Arrow {
  static readonly fillColor = '#8C8C8C' // Triangle colour
  static readonly borderColor = '#3C3C3C' // Unused: arrows are drawn as a bare triangle
  static readonly borderWidth = 0.1 // Unused: arrows are drawn as a bare triangle

  readonly x: number // Column
  readonly y: number // Row
  readonly direction: Direction // The only way through

  /**
   * @param data - The arrow's entry in the chamber JSON
   */
  constructor(data: ArrowData) {
    this.x = data.x
    this.y = data.y
    this.direction = parseDirection(data.direction)
  }
}
