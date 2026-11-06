import type {BlockableData} from '@/game/chamber_data'

/**
 * A pit the subject cannot cross while it is open. Portal shots pass over it.
 */
export class Ditch {
  static readonly dark = '#303030' // Fill colour
  static readonly light = '#FFFFFF' // Unused: left over from a gradient that is no longer drawn

  readonly id: number | undefined // Link target id
  readonly x: number // Column
  readonly y: number // Row
  blocked: boolean // Whether the pit is open

  /**
   * @param data - The ditch's entry in the chamber JSON
   */
  constructor(data: BlockableData) {
    this.id = data.id
    this.x = data.x
    this.y = data.y
    this.blocked = data.blocked !== undefined ? data.blocked : true
  }

  /**
   * Whether the pit is open.
   */
  get activated(): boolean {
    return this.blocked
  }

  /**
   * Bridges the pit.
   */
  activate(): void {
    if (this.blocked) {
      this.blocked = false
    }
  }

  /**
   * Opens the pit again.
   */
  deactivate(): void {
    if (!this.blocked) {
      this.blocked = true
    }
  }
}
