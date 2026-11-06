import type {BlockableData} from '@/game/chamber_data'
import type {Chamber} from '@/game/classic/chamber'
import {GameEvent} from '@/game/game_event'

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
  private readonly chamber: Chamber // The chamber that passes on what the door does

  /**
   * @param data - The door's entry in the chamber JSON
   * @param chamber - The chamber that passes on what the door does
   */
  constructor(data: BlockableData, chamber: Chamber) {
    this.id = data.id
    this.x = data.x
    this.y = data.y
    this.blocked = data.blocked !== undefined ? data.blocked : true
    this.chamber = chamber
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
      this.chamber.emit(GameEvent.DOOR_OPENED)
      this.blocked = false
    }
  }

  /**
   * Closes the door.
   */
  deactivate(): void {
    if (!this.blocked) {
      this.chamber.emit(GameEvent.DOOR_CLOSED)
      this.blocked = true
    }
  }
}
