import type {BlockableData} from '@/game/chamber_data'
import {Sound} from '@/game/sound'

/**
 * A door that blocks the subject and portal shots while closed.
 */
export class Door {
  static readonly fillColor = '#A35087' // Body colour
  static readonly borderColor = '#B304B3' // Edge colour
  static readonly borderWidth = 0.1 // Edge width in pixels

  readonly id: number | undefined // Link target id
  readonly x: number // Column
  readonly y: number // Row
  blocked: boolean // Whether the door is closed

  /**
   * @param data - The door's entry in the chamber JSON
   */
  constructor(data: BlockableData) {
    this.id = data.id
    this.x = data.x
    this.y = data.y
    this.blocked = data.blocked !== undefined ? data.blocked : true
  }

  /**
   * Whether the door is closed.
   */
  get activated(): boolean {
    return this.blocked
  }

  /**
   * Opens the door.
   */
  activate(): void {
    if (this.blocked) {
      Sound.DOOR_OPEN.play()
      this.blocked = false
    }
  }

  /**
   * Closes the door.
   */
  deactivate(): void {
    if (!this.blocked) {
      Sound.DOOR_CLOSE.play()
      this.blocked = true
    }
  }
}
