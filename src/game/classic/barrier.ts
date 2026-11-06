import type {BlockableData} from '@/game/chamber_data'

/**
 * A field that blocks the subject and portal shots while active. Closing a
 * barrier through a link also removes any portal on its tile.
 */
export class Barrier {
  static readonly light = '#404040' // Gradient edge colour
  static readonly dark = '#B8B8B8' // Gradient centre colour

  readonly id: number | undefined // Link target id
  readonly x: number // Column
  readonly y: number // Row
  blocked: boolean // Whether the barrier is up

  /**
   * @param data - The barrier's entry in the chamber JSON
   */
  constructor(data: BlockableData) {
    this.id = data.id
    this.x = data.x
    this.y = data.y
    this.blocked = data.blocked !== undefined ? data.blocked : true
  }

  /**
   * Whether the barrier is up.
   */
  get activated(): boolean {
    return this.blocked
  }

  /**
   * Lowers the barrier.
   */
  activate(): void {
    if (this.blocked) {
      this.blocked = false
    }
  }

  /**
   * Raises the barrier.
   */
  deactivate(): void {
    if (!this.blocked) {
      this.blocked = true
    }
  }
}
