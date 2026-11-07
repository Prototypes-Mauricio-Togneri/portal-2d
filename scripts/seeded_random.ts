/**
 * A seeded source of random numbers (mulberry32), so a failing run can be
 * run again exactly.
 * @param seed - Any 32-bit integer
 * @returns A function giving the next number from 0 up to, not including, 1
 */
export function createRandom(seed: number): () => number {
  let current = seed >>> 0

  return (): number => {
    current = (current + 0x6d2b79f5) >>> 0

    let mixed = Math.imul(current ^ (current >>> 15), current | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}
