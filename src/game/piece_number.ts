/**
 * A number between 0 and 1 for one piece of a sprite breaking up, the same
 * every frame, so each piece keeps its own path.
 * @param seed - Sets one sprite's pieces apart from another's
 * @param index - The piece's number
 * @param salt - Which of the piece's numbers this is
 * @returns The number, from 0 up to, never reaching, 1
 */
export function pieceNumber(seed: number, index: number, salt: number): number {
  let value = Math.imul(seed + 1, 0x9e3779b1) ^ Math.imul(index + 1, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35)

  value = Math.imul(value ^ (value >>> 16), 0x7feb352d)
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b)
  value ^= value >>> 16

  return (value >>> 0) / 4294967296
}
