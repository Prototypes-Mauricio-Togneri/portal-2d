import type {Direction} from '@/game/direction'
import type {GameEvent} from '@/game/game_event'
import type {CompiledChamber, PlacedKind} from '@/game/rules/compiled_chamber'
import {type BlockableKind, findElementDefinition} from '@/game/rules/element_registry'
import {PORTAL_COLORS, type PortalColor} from '@/game/rules/portal_color'
import {RulesState} from '@/game/rules/rules_state'
import {CLOSED_PORTAL, DIRECTION_INDEX, NO_BOX, NOT_STORED, PORTAL_SLOTS, StateSlot} from '@/game/rules/state_layout'
import {StateReader} from '@/game/rules/state_reader'

/**
 * A copy of a state that one step of the rules changes, with the events
 * the step reports, in order. The step and the element hooks change it only
 * through these methods, which count every value that actually changes, then
 * the step turns it into a new state.
 */
export class StateDraft extends StateReader {
  readonly before: RulesState | null // The state the step started from, or null while a chamber settles at its start
  private readonly stepEvents: GameEvent[] = [] // What the step reported so far, in order
  private changeCount = 0 // How many times a value changed

  /**
   * @param chamber - The chamber being played
   * @param from - The state the step starts from, or null for the state the chamber file describes, before it settles
   * @throws Error when the state belongs to another chamber
   */
  constructor(chamber: CompiledChamber, from: RulesState | null) {
    if ((from !== null) && (from.chamber !== chamber)) {
      throw new Error('The state belongs to another chamber')
    }

    super(chamber, (from !== null) ? from.copyValues() : chamber.stateLayout.createStartValues())
    this.before = from
  }

  /**
   * What the step reported so far, in order.
   */
  get events(): readonly GameEvent[] {
    return this.stepEvents
  }

  /**
   * How many times a value changed so far; a pass that leaves it as it was
   * changed nothing.
   */
  get changes(): number {
    return this.changeCount
  }

  /**
   * Writes one value, counting it as a change only when it differs.
   * @param offset - Where the value is kept
   * @param value - The new value
   * @returns Whether it changed
   */
  private write(offset: number, value: number): boolean {
    if (this.read(offset) === value) {
      return false
    }

    this.values[offset] = value
    this.changeCount++

    return true
  }

  /**
   * Reports something that happened in the step.
   * @param event - What happened
   */
  emit(event: GameEvent): void {
    this.stepEvents.push(event)
  }

  /**
   * Puts the subject on a tile.
   * @param x - Column
   * @param y - Row
   */
  moveSubject(x: number, y: number): void {
    this.write(StateSlot.SUBJECT_X, x)
    this.write(StateSlot.SUBJECT_Y, y)
  }

  /**
   * Turns the subject.
   * @param direction - Which way it faces now
   */
  face(direction: Direction): void {
    this.write(StateSlot.FACING, DIRECTION_INDEX[direction])
  }

  /**
   * Makes the subject carry a box.
   * @param index - The box's index in the chamber's box list
   */
  carryBox(index: number): void {
    this.write(StateSlot.CARRIED_BOX, index)
  }

  /**
   * Puts the carried box down where it is, on the subject's tile.
   */
  dropBox(): void {
    this.write(StateSlot.CARRIED_BOX, NO_BOX)
  }

  /**
   * Destroys the carried box, if any: it goes back to its start tile and is
   * no longer carried.
   */
  destroyCarriedBox(): void {
    const box = this.carriedBox

    if (box !== NO_BOX) {
      this.dropBox()
      this.sendBoxToStart(box)
    }
  }

  /**
   * Moves the carried box, if any, onto the subject's tile.
   */
  carryBoxAlong(): void {
    const box = this.carriedBox

    if (box !== NO_BOX) {
      this.moveBox(box, this.subjectX, this.subjectY)
    }
  }

  /**
   * Puts a box on a tile.
   * @param index - The box's index in the chamber's box list
   * @param x - Column
   * @param y - Row
   */
  moveBox(index: number, x: number, y: number): void {
    const offset = this.boxOffset(index)

    this.write(offset, x)
    this.write(offset + 1, y)
  }

  /**
   * Puts a box back on the tile it starts on.
   * @param index - The box's index in the chamber's box list
   * @throws RangeError for a box the chamber doesn't have
   */
  sendBoxToStart(index: number): void {
    const start = this.chamber.boxStarts[index]

    if (start === undefined) {
      throw new RangeError(`no box ${index} in the chamber`)
    }

    this.moveBox(index, start.x, start.y)
  }

  /**
   * Opens a portal on a wall, closing it wherever it was before.
   * @param color - The portal
   * @param x - Column of the wall
   * @param y - Row of the wall
   * @param side - Side of the wall it opens to
   */
  openPortal(color: PortalColor, x: number, y: number, side: Direction): void {
    const offset = PORTAL_SLOTS[color]

    this.write(offset, x)
    this.write(offset + 1, y)
    this.write(offset + 2, DIRECTION_INDEX[side])
  }

  /**
   * Closes a portal.
   * @param color - The portal
   */
  closePortal(color: PortalColor): void {
    const offset = PORTAL_SLOTS[color]

    this.write(offset, CLOSED_PORTAL)
    this.write(offset + 1, CLOSED_PORTAL)
    this.write(offset + 2, CLOSED_PORTAL)
  }

  /**
   * Closes both portals.
   */
  closePortals(): void {
    for (const color of PORTAL_COLORS) {
      this.closePortal(color)
    }
  }

  /**
   * Closes each portal that is on a wall tile, on any side.
   * @param x - Column of the wall
   * @param y - Row of the wall
   */
  closePortalsAt(x: number, y: number): void {
    for (const color of PORTAL_COLORS) {
      if (this.isPortalOpen(color) && (this.portalX(color) === x) && (this.portalY(color) === y)) {
        this.closePortal(color)
      }
    }
  }

  /**
   * Sets whether a button is held down.
   * @param index - The button's index in the chamber's button list
   * @param pressed - Whether it is down
   * @returns Whether it changed
   */
  setButtonPressed(index: number, pressed: boolean): boolean {
    return this.write(this.buttonOffset(index), pressed ? 1 : 0)
  }

  /**
   * Sets an element's blocked flag.
   * @param kind - The element type
   * @param index - The element's index in the type's list
   * @param blocked - Whether it is blocked
   * @returns Whether it changed
   * @throws Error for an element no link reaches, whose flag never changes
   */
  setBlocked(kind: BlockableKind, index: number, blocked: boolean): boolean {
    const offset = this.chamber.stateLayout.flagOffset(kind, index)

    if (offset === NOT_STORED) {
      throw new Error(`${kind} ${index} is linked by nothing, so its blocked flag never changes`)
    }

    return this.write(offset, blocked ? 1 : 0)
  }

  /**
   * Marks the chamber as completed.
   */
  complete(): void {
    this.write(StateSlot.COMPLETED, 1)
  }

  /**
   * Runs a button's or switch's links, in order: each linked element's
   * linkUnblocked or linkBlocked hook, a link group's elements in its place.
   * @param kind - The element whose links act, a button or a switch
   * @param index - Its index in the type's list
   * @param unblock - True to unblock the linked elements, false to block them
   */
  applyLinks(kind: PlacedKind, index: number, unblock: boolean): void {
    for (const target of this.chamber.linksOf(kind, index)) {
      const hooks = findElementDefinition(target.kind).hooks
      const hook = unblock ? hooks?.linkUnblocked : hooks?.linkBlocked

      hook?.(this, target.index)
    }
  }

  /**
   * The state the draft has reached, as a new state.
   * @returns The new state, with a copy of the values
   */
  toState(): RulesState {
    return new RulesState(this.chamber, this.values.slice())
  }
}
