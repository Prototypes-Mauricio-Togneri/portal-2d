import type {BlockableData} from '@/game/chamber_data'
import {Sound} from '@/game/sound'

/**
 * The chamber's exit door. Standing on it completes the chamber.
 */
export class Exit {
  static readonly fillColor = '#A35087' // Body colour
  static readonly borderColor = '#B304B3' // Edge colour
  static readonly borderWidth = 0.1 // Edge width in pixels

  readonly id: number | undefined // Link target id
  readonly x: number // Column
  readonly y: number // Row
  blocked: boolean // Whether the exit is closed

  /**
   * @param data - The exit's entry in the chamber JSON
   */
  constructor(data: BlockableData) {
    this.id = data.id
    this.x = data.x
    this.y = data.y
    this.blocked = data.blocked !== undefined ? data.blocked : true
  }

  /**
   * Whether the exit is closed.
   */
  get activated(): boolean {
    return this.blocked
  }

  /**
   * Opens the exit.
   */
  activate(): void {
    if (this.blocked) {
      Sound.DOOR_OPEN.play()
      this.blocked = false
    }
  }

  /**
   * Closes the exit.
   */
  deactivate(): void {
    if (!this.blocked) {
      Sound.DOOR_CLOSE.play()
      this.blocked = true
    }
  }

  /**
   * Whether the exit is on a tile.
   * @param x - Column
   * @param y - Row
   * @returns True when the exit sits at x, y
   */
  isIn(x: number, y: number): boolean {
    return (this.x === x) && (this.y === y)
  }
}
