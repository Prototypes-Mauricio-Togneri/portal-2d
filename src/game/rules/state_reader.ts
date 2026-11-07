import type {Direction} from '@/game/direction'
import {type CompiledChamber, NO_ELEMENT} from '@/game/rules/compiled_chamber'
import type {BlockableKind} from '@/game/rules/element_registry'
import type {PortalColor} from '@/game/rules/portal_color'
import {CLOSED_PORTAL, DIRECTIONS, NO_BOX, NOT_STORED, PORTAL_SLOTS, StateSlot} from '@/game/rules/state_layout'

/**
 * Reads a state of the rules: the values of one chamber's state, laid out
 * by its state layout, together with the chamber. The immutable state and the
 * draft a step works on both read through it.
 */
export abstract class StateReader {
  readonly chamber: CompiledChamber // The chamber the state belongs to
  protected readonly values: Int16Array // The values, laid out by the chamber's state layout

  /**
   * @param chamber - The chamber the state belongs to
   * @param values - The state's values
   * @throws Error when the values don't fit the chamber's state layout
   */
  protected constructor(chamber: CompiledChamber, values: Int16Array) {
    if (values.length !== chamber.stateLayout.length) {
      throw new Error(`A state of this chamber holds ${chamber.stateLayout.length} values, not ${values.length}`)
    }

    this.chamber = chamber
    this.values = values
  }

  /**
   * Reads one value.
   * @param offset - Where the value is kept
   * @returns The value
   * @throws RangeError for an offset past the state's end
   */
  protected read(offset: number): number {
    const value = this.values[offset]

    if (value === undefined) {
      throw new RangeError(`no value ${offset} in the state`)
    }

    return value
  }

  /**
   * Where a box's column is kept; its row follows.
   * @param index - The box's index in the chamber's box list
   * @returns The offset
   * @throws RangeError for a box the chamber doesn't have
   */
  protected boxOffset(index: number): number {
    if ((index < 0) || (index >= this.chamber.stateLayout.boxCount)) {
      throw new RangeError(`no box ${index} in the chamber`)
    }

    return this.chamber.stateLayout.boxesOffset + (index * 2)
  }

  /**
   * Where a button's pressed flag is kept.
   * @param index - The button's index in the chamber's button list
   * @returns The offset
   * @throws RangeError for a button the chamber doesn't have
   */
  protected buttonOffset(index: number): number {
    if ((index < 0) || (index >= this.chamber.stateLayout.buttonCount)) {
      throw new RangeError(`no button ${index} in the chamber`)
    }

    return this.chamber.stateLayout.buttonsOffset + index
  }

  /**
   * The subject's column.
   */
  get subjectX(): number {
    return this.read(StateSlot.SUBJECT_X)
  }

  /**
   * The subject's row.
   */
  get subjectY(): number {
    return this.read(StateSlot.SUBJECT_Y)
  }

  /**
   * Which way the subject faces.
   */
  get facing(): Direction {
    const facing = DIRECTIONS[this.read(StateSlot.FACING)]

    if (facing === undefined) {
      throw new RangeError('the state holds no direction the subject faces')
    }

    return facing
  }

  /**
   * The index of the box the subject carries, or NO_BOX.
   */
  get carriedBox(): number {
    return this.read(StateSlot.CARRIED_BOX)
  }

  /**
   * Whether the subject carries a box.
   */
  get isCarrying(): boolean {
    return this.carriedBox !== NO_BOX
  }

  /**
   * Whether the chamber is completed.
   */
  get completed(): boolean {
    return this.read(StateSlot.COMPLETED) === 1
  }

  /**
   * Whether the subject stands on a tile.
   * @param x - Column
   * @param y - Row
   * @returns True when it is there
   */
  isSubjectAt(x: number, y: number): boolean {
    return (this.subjectX === x) && (this.subjectY === y)
  }

  /**
   * Whether a portal is open.
   * @param color - The portal
   * @returns True when it is on a wall
   */
  isPortalOpen(color: PortalColor): boolean {
    return this.read(PORTAL_SLOTS[color] + 2) !== CLOSED_PORTAL
  }

  /**
   * The column of the wall a portal is on.
   * @param color - The portal
   * @returns The column, or CLOSED_PORTAL while it is closed
   */
  portalX(color: PortalColor): number {
    return this.read(PORTAL_SLOTS[color])
  }

  /**
   * The row of the wall a portal is on.
   * @param color - The portal
   * @returns The row, or CLOSED_PORTAL while it is closed
   */
  portalY(color: PortalColor): number {
    return this.read(PORTAL_SLOTS[color] + 1)
  }

  /**
   * The side of its wall a portal opens to.
   * @param color - The portal
   * @returns The side, or null while it is closed
   */
  portalSide(color: PortalColor): Direction | null {
    const side = this.read(PORTAL_SLOTS[color] + 2)

    return (side === CLOSED_PORTAL) ? null : (DIRECTIONS[side] ?? null)
  }

  /**
   * A box's column.
   * @param index - The box's index in the chamber's box list
   * @returns The column
   */
  boxX(index: number): number {
    return this.read(this.boxOffset(index))
  }

  /**
   * A box's row.
   * @param index - The box's index in the chamber's box list
   * @returns The row
   */
  boxY(index: number): number {
    return this.read(this.boxOffset(index) + 1)
  }

  /**
   * The first box on a tile, in the chamber's box list.
   * @param x - Column
   * @param y - Row
   * @returns Its index, or NO_BOX when the tile has none
   */
  firstBoxAt(x: number, y: number): number {
    for (let i = 0; i < this.chamber.stateLayout.boxCount; i++) {
      if ((this.boxX(i) === x) && (this.boxY(i) === y)) {
        return i
      }
    }

    return NO_BOX
  }

  /**
   * Whether any box is on a tile, carried or not.
   * @param x - Column
   * @param y - Row
   * @returns True when one is there
   */
  hasBoxAt(x: number, y: number): boolean {
    return this.firstBoxAt(x, y) !== NO_BOX
  }

  /**
   * Whether a button is held down.
   * @param index - The button's index in the chamber's button list
   * @returns True when it is down
   */
  isButtonPressed(index: number): boolean {
    return this.read(this.buttonOffset(index)) === 1
  }

  /**
   * An element's blocked flag: from the state when a link reaches the
   * element, otherwise as the chamber file sets it.
   * @param kind - The element type
   * @param index - The element's index in the type's list
   * @returns True when it is blocked
   */
  isBlocked(kind: BlockableKind, index: number): boolean {
    const layout = this.chamber.stateLayout
    const offset = layout.flagOffset(kind, index)

    return (offset === NOT_STORED) ? layout.isBlockedAtStart(kind, index) : (this.read(offset) === 1)
  }

  /**
   * Whether any element of a type on a tile is blocked, such as either of two
   * crossing lasers.
   * @param kind - The element type
   * @param x - Column
   * @param y - Row
   * @returns True when one of them is blocked; false outside the chamber
   */
  isBlockedAt(kind: BlockableKind, x: number, y: number): boolean {
    for (let index = this.chamber.elementAt(kind, x, y); index !== NO_ELEMENT; index = this.chamber.nextOnTile(kind, index)) {
      if (this.isBlocked(kind, index)) {
        return true
      }
    }

    return false
  }
}
