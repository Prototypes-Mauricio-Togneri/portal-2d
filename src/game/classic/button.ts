import type {Chamber} from '@/game/classic/chamber'
import type {TriggerData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'

/**
 * A floor button, held down by the subject or a box standing on it. Pressing
 * it activates its linked elements and releasing it deactivates them.
 */
export class Button {
  static readonly fillColor = '#DC3C32' // Body colour
  static readonly borderColor = '#BA332B' // Edge colour
  static readonly borderWidth = 0.1 // Edge width in pixels

  readonly x: number // Column
  readonly y: number // Row
  readonly links: readonly number[] // Ids of the elements it opens and closes
  private readonly chamber: Chamber // The chamber that resolves the links
  activated = false // Whether it is held down

  /**
   * @param data - The button's entry in the chamber JSON
   * @param chamber - The chamber that resolves the links
   */
  constructor(data: TriggerData, chamber: Chamber) {
    this.x = data.x
    this.y = data.y
    this.links = data.links
    this.chamber = chamber
  }

  /**
   * Presses the button if it is up.
   * @returns Whether it changed state
   */
  activate(): boolean {
    if (!this.activated) {
      this.activated = true
      this.chamber.emit(GameEvent.BUTTON_PRESSED)
      this.chamber.activate(this.links)

      return true
    }

    return false
  }

  /**
   * Releases the button if it is down.
   * @returns Whether it changed state
   */
  deactivate(): boolean {
    if (this.activated) {
      this.activated = false
      this.chamber.emit(GameEvent.BUTTON_RELEASED)
      this.chamber.deactivate(this.links)

      return true
    }

    return false
  }

  /**
   * Whether the button is on a tile.
   * @param x - Column
   * @param y - Row
   * @returns True when the button sits at x, y
   */
  isIn(x: number, y: number): boolean {
    return (this.x === x) && (this.y === y)
  }
}
