import type {CompiledChamber} from '@/game/rules/compiled_chamber'
import {StateReader} from '@/game/rules/state_reader'
import {formatHash, hashBytes} from '@/game/text_hash'

/**
 * A state of the rules, which never changes: the subject's tile, facing
 * and carried box, both portals, each box's tile, each button's pressed flag,
 * the blocked flag of each element a link reaches, and whether the chamber is
 * completed, as one short list of 16-bit numbers (see StateLayout). It holds
 * no counters: the game counts moves and portals from the steps. A step makes
 * a new state instead of changing this one.
 */
export class RulesState extends StateReader {
  private cachedKey: string | null = null // The key, worked out the first time it is asked for

  /**
   * @param chamber - The chamber the state belongs to
   * @param values - The state's values, laid out by the chamber's state layout; the state keeps them, so nothing else may change them
   */
  constructor(chamber: CompiledChamber, values: Int16Array) {
    super(chamber, values)
  }

  /**
   * The state as a short text, one character per value, for keeping states
   * in a map: two states of the same chamber are equal exactly when their
   * keys are.
   */
  get key(): string {
    if (this.cachedKey === null) {
      this.cachedKey = String.fromCharCode(...new Uint16Array(this.values.buffer, this.values.byteOffset, this.values.length))
    }

    return this.cachedKey
  }

  /**
   * The state's 32-bit FNV-1a hash, as eight hexadecimal digits.
   */
  get hash(): string {
    return formatHash(hashBytes(new Uint8Array(this.values.buffer, this.values.byteOffset, this.values.byteLength)))
  }

  /**
   * How many bytes the state's values take.
   */
  get byteSize(): number {
    return this.values.byteLength
  }

  /**
   * A copy of the state's values, for a draft to change.
   * @returns The values, laid out by the chamber's state layout
   */
  copyValues(): Int16Array {
    return this.values.slice()
  }
}
