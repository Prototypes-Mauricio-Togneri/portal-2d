import type {BlockableData} from '@/game/chamber_data'

/**
 * An emancipation field. While active, walking into it removes both portals
 * and destroys a carried box, and shots cannot be fired from or through it.
 */
export class Fizzler {
  static readonly fillColor = '#687DB3' // Body colour, drawn at half opacity
  static readonly borderColor = '#4949E3' // Edge colour
  static readonly borderWidth = 0.1 // Edge width in pixels

  readonly id: number | undefined // Link target id
  readonly x: number // Column
  readonly y: number // Row
  blocked: boolean // Whether the field is on

  /**
   * @param data - The fizzler's entry in the chamber JSON
   */
  constructor(data: BlockableData) {
    this.id = data.id
    this.x = data.x
    this.y = data.y
    this.blocked = data.blocked !== undefined ? data.blocked : true
  }

  /**
   * Whether the field is on.
   */
  get activated(): boolean {
    return this.blocked
  }

  /**
   * Turns the field off.
   */
  activate(): void {
    this.blocked = false
  }

  /**
   * Turns the field on.
   */
  deactivate(): void {
    this.blocked = true
  }
}
