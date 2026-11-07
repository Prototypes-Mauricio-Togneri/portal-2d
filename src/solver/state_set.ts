/** What a lookup gives for a key the set doesn't hold, and the parent of the first state */
export const NO_ENTRY = -1

/** The action recorded for a state reached by no action, such as the start */
export const NO_ACTION = 255

/** The largest share of the table's slots in use */
const MAX_LOAD = 0.7

/** The largest table this set builds, so its slot numbers stay within a 32-bit integer */
const MAX_SLOTS = 2 ** 30

/**
 * Mixes a key's two words into a 32-bit hash: the low word scrambled by a
 * golden-ratio multiply, joined with the high word, then MurmurHash3's
 * finalizer.
 * @param low - The key's low word
 * @param high - The key's high word
 * @returns The hash
 */
function hashKey(low: number, high: number): number {
  let hash = Math.imul(low, 0x9e3779b1) ^ high

  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b)
  hash ^= hash >>> 13
  hash = Math.imul(hash, 0xc2b2ae35)
  hash ^= hash >>> 16

  return hash >>> 0
}

/**
 * The states a search has seen, as 64-bit keys (two 32-bit words), each with
 * the state it was reached from and the action that reached it, so a route
 * can be rebuilt. Entries are numbered in the order they are added and kept
 * in typed arrays, with no object per state; an open-addressing table finds
 * a key's entry. The capacity is fixed when the set is made, so its memory
 * is known before a search starts and entry numbers never move.
 */
export class StateSet {
  readonly capacity: number // The most entries the set holds
  private readonly keyWords: Uint32Array // Each entry's key, low word then high word
  private readonly parents: Int32Array // Each entry's parent entry, or NO_ENTRY
  private readonly actions: Uint8Array // Each entry's action, as a number below NO_ACTION, or NO_ACTION
  private readonly slots: Int32Array // The table: each slot's entry, or NO_ENTRY
  private readonly slotMask: number // The table's size less one; the size is a power of two
  private count = 0 // Entries added

  /**
   * @param capacity - The most entries the set will hold
   * @throws Error when the capacity is not a positive whole number, or too large for the table
   */
  constructor(capacity: number) {
    if ((!Number.isSafeInteger(capacity)) || (capacity < 1)) {
      throw new Error('A state set holds a positive whole number of entries')
    }

    let slotCount = 2

    while (slotCount < (capacity / MAX_LOAD)) {
      slotCount *= 2
    }

    if (slotCount > MAX_SLOTS) {
      throw new Error(`A state set holds at most ${Math.floor(MAX_SLOTS * MAX_LOAD)} entries`)
    }

    this.capacity = capacity
    this.keyWords = new Uint32Array(capacity * 2)
    this.parents = new Int32Array(capacity)
    this.actions = new Uint8Array(capacity)
    this.slots = new Int32Array(slotCount).fill(NO_ENTRY)
    this.slotMask = slotCount - 1
  }

  /**
   * How many entries the set holds.
   */
  get size(): number {
    return this.count
  }

  /**
   * How many bytes the set's arrays take.
   */
  get byteSize(): number {
    return this.keyWords.byteLength + this.parents.byteLength + this.actions.byteLength + this.slots.byteLength
  }

  /**
   * The slot that holds a key's entry, or the empty slot where it would go.
   * @param low - The key's low word
   * @param high - The key's high word
   * @returns The slot
   */
  private slotOf(low: number, high: number): number {
    let slot = hashKey(low, high) & this.slotMask

    for (;;) {
      const entry = this.slots[slot] ?? NO_ENTRY

      if ((entry === NO_ENTRY) || ((this.keyWords[entry * 2] === low) && (this.keyWords[(entry * 2) + 1] === high))) {
        return slot
      }

      slot = (slot + 1) & this.slotMask
    }
  }

  /**
   * Finds a key's entry.
   * @param low - The key's low word
   * @param high - The key's high word
   * @returns The entry, or NO_ENTRY when the set doesn't hold the key
   */
  find(low: number, high: number): number {
    return this.slots[this.slotOf(low, high)] ?? NO_ENTRY
  }

  /**
   * Adds a key, unless the set holds it already.
   * @param low - The key's low word
   * @param high - The key's high word
   * @param parent - The entry it was reached from, or NO_ENTRY
   * @param action - The action that reached it, as a number below NO_ACTION, or NO_ACTION
   * @returns The new entry, or NO_ENTRY when the set already held the key
   * @throws Error when the set is full, or the action is out of range
   */
  addIfAbsent(low: number, high: number, parent: number, action: number): number {
    const slot = this.slotOf(low, high)

    if (this.slots[slot] !== NO_ENTRY) {
      return NO_ENTRY
    }

    if (this.count >= this.capacity) {
      throw new Error(`The state set is full at ${this.capacity} states`)
    }

    const entry = this.count

    this.keyWords[entry * 2] = low
    this.keyWords[(entry * 2) + 1] = high
    this.slots[slot] = entry
    this.count++
    this.setParent(entry, parent, action)

    return entry
  }

  /**
   * Changes the state an entry was reached from, when a search finds a
   * cheaper way to it.
   * @param entry - The entry
   * @param parent - The entry it is now reached from, or NO_ENTRY
   * @param action - The action that reaches it, as a number below NO_ACTION, or NO_ACTION
   * @throws RangeError for an entry the set doesn't hold, or an action out of range
   */
  setParent(entry: number, parent: number, action: number): void {
    this.checkEntry(entry)

    if ((!Number.isInteger(action)) || (action < 0) || (action > NO_ACTION)) {
      throw new RangeError(`action ${action} is not a number from 0 to ${NO_ACTION}`)
    }

    this.parents[entry] = parent
    this.actions[entry] = action
  }

  /**
   * Checks that the set holds an entry.
   * @param entry - The entry
   * @throws RangeError for an entry the set doesn't hold
   */
  private checkEntry(entry: number): void {
    if ((!Number.isInteger(entry)) || (entry < 0) || (entry >= this.count)) {
      throw new RangeError(`no entry ${entry} in the state set`)
    }
  }

  /**
   * An entry's key's low word.
   * @param entry - The entry
   * @returns The word
   */
  keyLow(entry: number): number {
    this.checkEntry(entry)

    return this.keyWords[entry * 2] ?? 0
  }

  /**
   * An entry's key's high word.
   * @param entry - The entry
   * @returns The word
   */
  keyHigh(entry: number): number {
    this.checkEntry(entry)

    return this.keyWords[(entry * 2) + 1] ?? 0
  }

  /**
   * The entry an entry was reached from.
   * @param entry - The entry
   * @returns The parent, or NO_ENTRY
   */
  parentOf(entry: number): number {
    this.checkEntry(entry)

    return this.parents[entry] ?? NO_ENTRY
  }

  /**
   * The action that reached an entry.
   * @param entry - The entry
   * @returns The action's number, or NO_ACTION
   */
  actionOf(entry: number): number {
    this.checkEntry(entry)

    return this.actions[entry] ?? NO_ACTION
  }
}
