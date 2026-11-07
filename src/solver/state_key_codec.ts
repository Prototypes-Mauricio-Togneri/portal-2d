import {NO_ELEMENT} from '@/game/rules/compiled_chamber'
import {RulesState} from '@/game/rules/rules_state'
import {CLOSED_PORTAL, NO_BOX, PORTAL_SLOTS, StateSlot} from '@/game/rules/state_layout'
import {type ChamberIndex, NO_NUMBER} from '@/solver/chamber_index'

/** The most bits a state key holds: two 32-bit words */
export const MAX_KEY_BITS = 64

/** Bits a word of the key holds */
const WORD_BITS = 32

/** Bits the subject's facing takes */
const FACING_BITS = 2

/** The portals' value offsets, blue then orange */
const PORTAL_OFFSETS: readonly number[] = Object.values(PORTAL_SLOTS)

/**
 * What a chamber's state key has to hold.
 */
export type KeyCounts = {
  readonly tiles: number // Tiles that aren't wall
  readonly sides: number // Wall sides a portal can open on
  readonly boxes: number // Boxes
  readonly flags: number // Blocked flags the state holds
}

/**
 * How many bits each field of a chamber's state key takes.
 */
export type KeyWidths = {
  readonly tile: number // The subject's tile, and each box's
  readonly carriedBox: number // None, or which box the subject carries
  readonly portal: number // Each portal: closed, or the wall side it is on
  readonly total: number // The whole key
}

/**
 * The bits needed to write every number from 0 up to, not including, a
 * count.
 * @param count - How many numbers
 * @returns The bits, 0 when there is at most one number
 */
function bitsFor(count: number): number {
  return (count <= 1) ? 0 : (WORD_BITS - Math.clz32(count - 1))
}

/**
 * Works out how wide each field of a chamber's state key is.
 * @param counts - What the key has to hold
 * @returns The fields' widths and the total
 * @throws Error when the key would need more than MAX_KEY_BITS
 */
export function measureKey(counts: KeyCounts): KeyWidths {
  const tile = bitsFor(counts.tiles)
  const carriedBox = bitsFor(counts.boxes + 1)
  const portal = bitsFor(counts.sides + 1)
  const total = tile + FACING_BITS + carriedBox + (2 * portal) + (counts.boxes * tile) + counts.flags

  if (total > MAX_KEY_BITS) {
    throw new Error(`The state key needs ${total} bits, at most ${MAX_KEY_BITS}`)
  }

  return {
    tile: tile,
    carriedBox: carriedBox,
    portal: portal,
    total: total,
  }
}

/**
 * Reads one value of a state's values.
 * @param values - The values
 * @param offset - Where the value is kept
 * @returns The value
 * @throws RangeError for an offset past the end
 */
function valueAt(values: Int16Array, offset: number): number {
  const value = values[offset]

  if (value === undefined) {
    throw new RangeError(`no value ${offset} in the state`)
  }

  return value
}

/**
 * Packs a settled state of one chamber into a key of two 32-bit words, and
 * back. The key holds the subject's tile and facing, the carried box, each
 * portal's wall side, each box's tile (none for the carried box, which is on
 * the subject's tile) and each blocked flag. It leaves out what a settled
 * state determines: each button is pressed exactly when the subject or a box
 * is on it, and the chamber is completed exactly when the subject is on the
 * exit, so unpacking works those out again.
 */
export class StateKeyCodec {
  readonly index: ChamberIndex // The chamber's tile and wall side numbers
  readonly widths: KeyWidths // How wide each field is
  private low = 0 // The low word, while packing or unpacking
  private high = 0 // The high word, while packing or unpacking
  private position = 0 // The next bit to write or read

  /**
   * @param index - The chamber's tile and wall side numbers
   * @throws Error when the chamber's key would need more than MAX_KEY_BITS
   */
  constructor(index: ChamberIndex) {
    const layout = index.chamber.stateLayout

    this.index = index
    this.widths = measureKey({
      tiles: index.tileCount,
      sides: index.sideCount,
      boxes: layout.boxCount,
      flags: layout.flagCount,
    })
  }

  /**
   * Writes a field at the next bit.
   * @param value - The field's value, which fits its width
   * @param width - The field's width in bits
   */
  private write(value: number, width: number): void {
    if (width === 0) {
      return
    }

    if (this.position < WORD_BITS) {
      this.low = (this.low | (value << this.position)) >>> 0

      // A field that runs past the low word carries on in the high one
      if ((this.position + width) > WORD_BITS) {
        this.high = (this.high | (value >>> (WORD_BITS - this.position))) >>> 0
      }
    } else {
      this.high = (this.high | (value << (this.position - WORD_BITS))) >>> 0
    }

    this.position += width
  }

  /**
   * Reads the field at the next bit.
   * @param width - The field's width in bits
   * @returns The field's value
   */
  private read(width: number): number {
    if (width === 0) {
      return 0
    }

    const mask = (width === WORD_BITS) ? 0xffffffff : (((1 << width) >>> 0) - 1)
    let value: number

    if (this.position < WORD_BITS) {
      value = this.low >>> this.position

      // A field that runs past the low word carries on in the high one
      if ((this.position + width) > WORD_BITS) {
        value = (value | (this.high << (WORD_BITS - this.position))) >>> 0
      }
    } else {
      value = this.high >>> (this.position - WORD_BITS)
    }

    this.position += width

    return (value & mask) >>> 0
  }

  /**
   * A tile's number.
   * @param x - Column
   * @param y - Row
   * @returns The number
   * @throws Error on a wall or outside the chamber
   */
  private numberTile(x: number, y: number): number {
    const tile = this.index.tileNumber(x, y)

    if (tile === NO_NUMBER) {
      throw new Error(`The state has something on ${x},${y}, which is no tile`)
    }

    return tile
  }

  /**
   * Packs a settled state of the chamber into a key.
   * @param state - The state, settled by a step or the chamber's start
   * @param words - Where to write the key
   * @param offset - Where in words the key's low word goes; the high word follows
   * @throws Error when the state has a portal where none can open, or something on a wall
   */
  encode(state: RulesState, words: Uint32Array, offset: number): void {
    const layout = this.index.chamber.stateLayout
    const values = state.copyValues()
    const carriedBox = valueAt(values, StateSlot.CARRIED_BOX)

    this.low = 0
    this.high = 0
    this.position = 0
    this.write(this.numberTile(valueAt(values, StateSlot.SUBJECT_X), valueAt(values, StateSlot.SUBJECT_Y)), this.widths.tile)
    this.write(valueAt(values, StateSlot.FACING), FACING_BITS)
    this.write((carriedBox === NO_BOX) ? 0 : (carriedBox + 1), this.widths.carriedBox)

    for (const portalOffset of PORTAL_OFFSETS) {
      const x = valueAt(values, portalOffset)
      const y = valueAt(values, portalOffset + 1)
      const side = valueAt(values, portalOffset + 2)

      if (side === CLOSED_PORTAL) {
        this.write(0, this.widths.portal)
        continue
      }

      const sideNumber = this.index.sideNumber(x, y, side)

      if (sideNumber === NO_NUMBER) {
        throw new Error(`The state has a portal on ${x},${y} side ${side}, where none can open`)
      }

      this.write(sideNumber + 1, this.widths.portal)
    }

    for (let box = 0; box < layout.boxCount; box++) {
      const tile = (box === carriedBox) ? 0 : this.numberTile(valueAt(values, layout.boxesOffset + (box * 2)), valueAt(values, layout.boxesOffset + (box * 2) + 1))

      this.write(tile, this.widths.tile)
    }

    for (let flag = 0; flag < layout.flagCount; flag++) {
      this.write(valueAt(values, layout.flagsOffset + flag), 1)
    }

    words[offset] = this.low
    words[offset + 1] = this.high
  }

  /**
   * Unpacks a key into the settled state it was packed from.
   * @param words - Where the key is
   * @param offset - Where in words the key's low word is; the high word follows
   * @returns The state
   * @throws RangeError when words has no key at offset
   */
  decode(words: Uint32Array, offset: number): RulesState {
    const chamber = this.index.chamber
    const layout = chamber.stateLayout
    const values = new Int16Array(layout.length)
    const low = words[offset]
    const high = words[offset + 1]

    if ((low === undefined) || (high === undefined)) {
      throw new RangeError(`no key at ${offset}`)
    }

    this.low = low
    this.high = high
    this.position = 0

    const subjectTile = this.read(this.widths.tile)
    const subjectX = this.index.tileX(subjectTile)
    const subjectY = this.index.tileY(subjectTile)
    const facing = this.read(FACING_BITS)
    const carried = this.read(this.widths.carriedBox)
    const carriedBox = (carried === 0) ? NO_BOX : (carried - 1)

    values[StateSlot.SUBJECT_X] = subjectX
    values[StateSlot.SUBJECT_Y] = subjectY
    values[StateSlot.FACING] = facing
    values[StateSlot.CARRIED_BOX] = carriedBox

    for (const portalOffset of PORTAL_OFFSETS) {
      const portal = this.read(this.widths.portal)

      if (portal === 0) {
        values.fill(CLOSED_PORTAL, portalOffset, portalOffset + 3)
        continue
      }

      values[portalOffset] = this.index.sideX(portal - 1)
      values[portalOffset + 1] = this.index.sideY(portal - 1)
      values[portalOffset + 2] = this.index.sideDirection(portal - 1)
    }

    const boxTiles = new Set<number>()

    for (let box = 0; box < layout.boxCount; box++) {
      const tile = (box === carriedBox) ? this.skipTile(subjectTile) : this.read(this.widths.tile)

      values[layout.boxesOffset + (box * 2)] = this.index.tileX(tile)
      values[layout.boxesOffset + (box * 2) + 1] = this.index.tileY(tile)
      boxTiles.add(tile)
    }

    for (let flag = 0; flag < layout.flagCount; flag++) {
      values[layout.flagsOffset + flag] = this.read(1)
    }

    // A settled state's button is pressed exactly when the subject or a box is on it
    for (let button = 0; button < layout.buttonCount; button++) {
      const position = chamber.positionOf('button', button)
      const tile = this.index.tileNumber(position.x, position.y)

      values[layout.buttonsOffset + button] = ((tile === subjectTile) || boxTiles.has(tile)) ? 1 : 0
    }

    // A settled state is completed exactly when the subject is on the exit
    values[StateSlot.COMPLETED] = (chamber.elementAt('exit', subjectX, subjectY) === NO_ELEMENT) ? 0 : 1

    return new RulesState(chamber, values)
  }

  /**
   * Skips the tile field of the carried box, which is on the subject's tile.
   * @param subjectTile - The subject's tile
   * @returns The subject's tile
   */
  private skipTile(subjectTile: number): number {
    this.read(this.widths.tile)

    return subjectTile
  }
}
