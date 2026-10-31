import type {BoxData} from '@/game/chamber_data'

/**
 * A box the subject can carry, mainly to hold buttons down. Activating it
 * through a link puts it back where it started. It has no deactivate.
 */
export class Box {
  static readonly fillColor = '#BE785A' // Body colour, also used for the subject's arrow while carrying
  static readonly borderColor = '#8F5B45' // Edge colour
  static readonly borderWidth = 0.1 // Edge width in pixels

  readonly id: number | undefined // Link target id
  x: number // Column, follows the subject while carried
  y: number // Row, follows the subject while carried
  private readonly data: BoxData // The original JSON entry, read again on reset

  /**
   * @param data - The box's entry in the chamber JSON
   */
  constructor(data: BoxData) {
    this.data = data
    this.id = data.id
    this.x = data.x
    this.y = data.y
  }

  /**
   * Puts the box back at its starting tile.
   */
  reset(): void {
    this.x = this.data.x
    this.y = this.data.y
  }

  /**
   * Link action: puts the box back at its starting tile.
   */
  activate(): void {
    this.reset()
  }
}
