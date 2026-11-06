import type {BlockableData} from '@/game/chamber_data'
import type {Chamber} from '@/game/classic/chamber'
import {GameEvent} from '@/game/game_event'

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
  private readonly chamber: Chamber // The chamber that passes on what the exit does

  /**
   * @param data - The exit's entry in the chamber JSON
   * @param chamber - The chamber that passes on what the exit does
   */
  constructor(data: BlockableData, chamber: Chamber) {
    this.id = data.id
    this.x = data.x
    this.y = data.y
    this.blocked = data.blocked !== undefined ? data.blocked : true
    this.chamber = chamber
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
      this.chamber.emit(GameEvent.EXIT_OPENED)
      this.blocked = false
    }
  }

  /**
   * Closes the exit.
   */
  deactivate(): void {
    if (!this.blocked) {
      this.chamber.emit(GameEvent.EXIT_CLOSED)
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
