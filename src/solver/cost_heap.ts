/**
 * A queue that always gives back its cheapest item first (a binary heap).
 * Items are numbers, such as a search's node numbers; an item can be added
 * more than once, at different costs.
 */
export class CostHeap {
  private readonly costs: number[] = [] // Each queued item's cost, in heap order
  private readonly items: number[] = [] // Each queued item, in heap order

  /**
   * How many items are queued.
   */
  get size(): number {
    return this.items.length
  }

  /**
   * The cost of the cheapest item.
   * @throws Error when the queue is empty
   */
  get lowestCost(): number {
    const cost = this.costs[0]

    if (cost === undefined) {
      throw new Error('The queue is empty')
    }

    return cost
  }

  /**
   * Reads the cost at a heap position.
   * @param position - The position, inside the heap
   * @returns The cost
   */
  private costAt(position: number): number {
    return this.costs[position] ?? Infinity
  }

  /**
   * Swaps two heap positions.
   * @param first - One position
   * @param second - The other
   */
  private swap(first: number, second: number): void {
    const firstCost = this.costAt(first)
    const firstItem = this.items[first] ?? 0

    this.costs[first] = this.costAt(second)
    this.items[first] = this.items[second] ?? 0
    this.costs[second] = firstCost
    this.items[second] = firstItem
  }

  /**
   * Queues an item.
   * @param cost - Its cost
   * @param item - The item
   */
  push(cost: number, item: number): void {
    let position = this.items.length

    this.costs.push(cost)
    this.items.push(item)

    while (position > 0) {
      const parent = (position - 1) >> 1

      if (this.costAt(parent) <= cost) {
        break
      }

      this.swap(position, parent)
      position = parent
    }
  }

  /**
   * Takes the cheapest item off the queue.
   * @returns The item
   * @throws Error when the queue is empty
   */
  pop(): number {
    const item = this.items[0]
    const lastCost = this.costs.pop()
    const lastItem = this.items.pop()

    if ((item === undefined) || (lastCost === undefined) || (lastItem === undefined)) {
      throw new Error('The queue is empty')
    }

    if (this.items.length === 0) {
      return item
    }

    this.costs[0] = lastCost
    this.items[0] = lastItem

    let position = 0

    for (;;) {
      const left = (position * 2) + 1
      const right = left + 1
      let smallest = position

      if ((left < this.items.length) && (this.costAt(left) < this.costAt(smallest))) {
        smallest = left
      }

      if ((right < this.items.length) && (this.costAt(right) < this.costAt(smallest))) {
        smallest = right
      }

      if (smallest === position) {
        return item
      }

      this.swap(position, smallest)
      position = smallest
    }
  }
}
