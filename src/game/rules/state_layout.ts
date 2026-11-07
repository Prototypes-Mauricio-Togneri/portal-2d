import type {ChamberDataV2} from '@/game/chamber_data_v2'
import {Direction, parseDirection} from '@/game/direction'
import {listEntries} from '@/game/rules/chamber_entries'
import type {LinkTarget} from '@/game/rules/compiled_chamber'
import {type BlockableKind, ELEMENT_REGISTRY, isBlockableElement} from '@/game/rules/element_registry'
import {PortalColor} from '@/game/rules/portal_color'

/** The four directions; a state stores a direction as its index here */
export const DIRECTIONS: readonly Direction[] = [
  Direction.UP,
  Direction.DOWN,
  Direction.LEFT,
  Direction.RIGHT,
]

/** Each direction's index in DIRECTIONS */
export const DIRECTION_INDEX: Readonly<Record<Direction, number>> = {
  [Direction.UP]: 0,
  [Direction.DOWN]: 1,
  [Direction.LEFT]: 2,
  [Direction.RIGHT]: 3,
}

/** What a state stores as the carried box while the subject carries none */
export const NO_BOX = -1

/** What a state stores as a closed portal's tile and side */
export const CLOSED_PORTAL = -1

/** The flag offset of an element whose blocked flag never changes, because no link reaches it */
export const NOT_STORED = -1

/**
 * Where the values every chamber's state holds are kept. A portal takes
 * three values from its offset: the column and row of its wall, and the side
 * it opens to.
 */
export const StateSlot = {
  SUBJECT_X: 0, // The subject's column
  SUBJECT_Y: 1, // The subject's row
  FACING: 2, // Which way it faces, as an index in DIRECTIONS
  CARRIED_BOX: 3, // The index of the box it carries, or NO_BOX
  BLUE_PORTAL: 4, // The blue portal's column, row and side, each CLOSED_PORTAL while it is closed
  ORANGE_PORTAL: 7, // The orange portal's column, row and side
  COMPLETED: 10, // 1 once the chamber is completed, otherwise 0
} as const

/** How many values every chamber's state holds before its boxes */
const FIXED_SLOT_COUNT = 11

/** The largest column or row a state can hold */
const MAX_COORDINATE = 0x7fff

/** Where each portal's three values start */
export const PORTAL_SLOTS: Readonly<Record<PortalColor, number>> = {
  [PortalColor.BLUE]: StateSlot.BLUE_PORTAL,
  [PortalColor.ORANGE]: StateSlot.ORANGE_PORTAL,
}

/**
 * How one chamber's state is laid out as a list of 16-bit numbers: the
 * values every chamber has (StateSlot), then each box's column and row, each
 * button's pressed flag, and the blocked flag of each element a link reaches,
 * in registry order, then list order. An element no link reaches keeps its
 * blocked flag from the chamber file, so the state doesn't hold it.
 */
export class StateLayout {
  readonly boxCount: number // Boxes in the chamber
  readonly buttonCount: number // Buttons in the chamber
  readonly flagCount: number // Blocked flags the state holds, one per element a link reaches
  readonly boxesOffset: number // Where the boxes' columns and rows start
  readonly buttonsOffset: number // Where the buttons' pressed flags start
  readonly flagsOffset: number // Where the blocked flags start
  readonly length: number // How many values a state holds
  private readonly flagOffsets = new Map<BlockableKind, Int16Array>() // Per element type, each element's flag offset, or NOT_STORED
  private readonly startBlocked = new Map<BlockableKind, Uint8Array>() // Per element type, each element's blocked flag in the chamber file
  private readonly startValues: Int16Array // The state as the chamber file describes it, before it settles

  /**
   * @param data - The chamber, its fields already read; it is only read
   * @param linked - Every element a button or switch link reaches
   * @throws Error when the chamber is too large for a state's numbers
   */
  constructor(data: ChamberDataV2, linked: readonly LinkTarget[]) {
    if ((data.size.width > MAX_COORDINATE) || (data.size.height > MAX_COORDINATE)) {
      throw new Error(`A chamber can be at most ${MAX_COORDINATE} tiles wide and high`)
    }

    const boxes = data.boxes ?? []

    this.boxCount = boxes.length
    this.buttonCount = (data.buttons ?? []).length
    this.boxesOffset = FIXED_SLOT_COUNT
    this.buttonsOffset = this.boxesOffset + (this.boxCount * 2)
    this.flagsOffset = this.buttonsOffset + this.buttonCount

    const linkedKeys = new Set(linked.map((target) => `${target.kind}:${target.index}`))
    let nextOffset = this.flagsOffset

    for (const definition of ELEMENT_REGISTRY) {
      if (!isBlockableElement(definition)) {
        continue
      }

      const entries = listEntries(data[definition.fileKey])
      const offsets = new Int16Array(entries.length).fill(NOT_STORED)
      const blocked = new Uint8Array(entries.length)

      entries.forEach((entry, index) => {
        blocked[index] = (entry.blocked ?? definition.defaultBlocked) ? 1 : 0

        if (linkedKeys.has(`${definition.kind}:${index}`)) {
          offsets[index] = nextOffset
          nextOffset++
        }
      })

      this.flagOffsets.set(definition.kind, offsets)
      this.startBlocked.set(definition.kind, blocked)
    }

    this.flagCount = nextOffset - this.flagsOffset
    this.length = nextOffset
    this.startValues = this.buildStartValues(data)
  }

  /**
   * Writes the state the chamber file describes: the subject where it starts,
   * empty-handed, both portals closed, every box on its start tile, every
   * button up and every flag as the file sets it.
   * @param data - The chamber
   * @returns The values
   */
  private buildStartValues(data: ChamberDataV2): Int16Array {
    const values = new Int16Array(this.length)

    values[StateSlot.SUBJECT_X] = data.subject.x
    values[StateSlot.SUBJECT_Y] = data.subject.y
    values[StateSlot.FACING] = DIRECTION_INDEX[parseDirection(data.subject.direction)]
    values[StateSlot.CARRIED_BOX] = NO_BOX
    values.fill(CLOSED_PORTAL, StateSlot.BLUE_PORTAL, StateSlot.COMPLETED)

    const boxes = data.boxes ?? []

    boxes.forEach((box, index) => {
      values[this.boxesOffset + (index * 2)] = box.x
      values[this.boxesOffset + (index * 2) + 1] = box.y
    })

    this.flagOffsets.forEach((offsets, kind) => {
      offsets.forEach((offset, index) => {
        if (offset !== NOT_STORED) {
          values[offset] = this.isBlockedAtStart(kind, index) ? 1 : 0
        }
      })
    })

    return values
  }

  /**
   * Where the state holds an element's blocked flag.
   * @param kind - The element type
   * @param index - The element's index in the type's list
   * @returns The offset, or NOT_STORED when no link reaches the element
   * @throws RangeError for an element the chamber doesn't have
   */
  flagOffset(kind: BlockableKind, index: number): number {
    const offset = this.flagOffsets.get(kind)?.[index]

    if (offset === undefined) {
      throw new RangeError(`no ${kind} ${index} in the chamber`)
    }

    return offset
  }

  /**
   * An element's blocked flag as the chamber file sets it.
   * @param kind - The element type
   * @param index - The element's index in the type's list
   * @returns True when it starts blocked
   * @throws RangeError for an element the chamber doesn't have
   */
  isBlockedAtStart(kind: BlockableKind, index: number): boolean {
    const blocked = this.startBlocked.get(kind)?.[index]

    if (blocked === undefined) {
      throw new RangeError(`no ${kind} ${index} in the chamber`)
    }

    return blocked === 1
  }

  /**
   * The state the chamber file describes, before it settles.
   * @returns A fresh copy of its values
   */
  createStartValues(): Int16Array {
    return this.startValues.slice()
  }
}
