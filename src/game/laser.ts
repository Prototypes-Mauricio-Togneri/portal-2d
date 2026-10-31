import type {LaserData} from '@/game/chamber_data'
import {type LaserDirection, parseLaserDirection} from '@/game/laser_direction'

/**
 * A laser beam the subject cannot walk through while it is on. Portal shots
 * pass through it.
 */
export class Laser {
  static readonly fillColor = '#FC1996' // Beam colour
  static readonly borderColor = '#FC1996' // Edge colour
  static readonly borderWidth = 0 // Edge width in pixels
  static readonly widthRatio = 6 // The beam is this many times thinner than a tile

  readonly id: number | undefined // Link target id
  readonly x: number // Column
  readonly y: number // Row
  readonly direction: LaserDirection // Orientation of the beam
  blocked: boolean // Whether the beam is on

  /**
   * @param data - The laser's entry in the chamber JSON
   */
  constructor(data: LaserData) {
    this.id = data.id
    this.x = data.x
    this.y = data.y
    this.direction = parseLaserDirection(data.direction)
    this.blocked = data.blocked !== undefined ? data.blocked : true
  }

  /**
   * Whether the beam is on.
   */
  get activated(): boolean {
    return this.blocked
  }

  /**
   * Turns the beam off.
   */
  activate(): void {
    if (this.blocked) {
      this.blocked = false
    }
  }

  /**
   * Turns the beam on.
   */
  deactivate(): void {
    if (!this.blocked) {
      this.blocked = true
    }
  }
}
