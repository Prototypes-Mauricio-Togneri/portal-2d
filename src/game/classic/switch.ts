import type {Chamber} from '@/game/classic/chamber'
import type {TriggerData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'

/**
 * A wall switch the subject uses with the interact key. Every use activates
 * its linked elements; nothing ever deactivates them.
 */
export class Switch {
  static readonly fillColor = '#F27A22' // Body colour
  static readonly borderColor = '#B52A2A' // Edge colour
  static readonly borderWidth = 0.1 // Edge width in pixels

  readonly x: number // Column
  readonly y: number // Row
  readonly links: readonly number[] // Ids of the elements it activates
  private readonly chamber: Chamber // The chamber that resolves the links

  /**
   * @param data - The switch's entry in the chamber JSON
   * @param chamber - The chamber that resolves the links
   */
  constructor(data: TriggerData, chamber: Chamber) {
    this.x = data.x
    this.y = data.y
    this.links = data.links
    this.chamber = chamber
  }

  /**
   * Uses the switch.
   */
  activate(): void {
    this.chamber.emit(GameEvent.SWITCH_USED)
    this.chamber.activate(this.links)
  }
}
