import {pieceNumber} from '@/game/piece_number'
import type {CompiledChamber} from '@/game/rules/compiled_chamber'
import {hashBytes} from '@/game/text_hash'

// Where the chamber's surface detail lands (docs/sprites.md): every number
// it is drawn from depends only on the chamber's size and walls, a tile's
// place and a salt, so a chamber comes out the same every time it is drawn,
// at any tile size, and no two chambers alike

/** How far apart the rows of tiles, and of the noise's grid, are numbered, so no two of them share a number: more than any chamber is wide */
const ROW_STRIDE = 4096

/** How the three layers of the cloudy noise weigh, the coarsest first */
const CLOUD_WEIGHTS: readonly number[] = [
  0.6,
  0.28,
  0.12,
]

/** How much finer each layer of the cloudy noise is than the coarsest */
const CLOUD_SCALES: readonly number[] = [
  1,
  2.1,
  4.3,
]

/** How far each layer of the cloudy noise is moved across and down, so their grids don't line up */
const CLOUD_SHIFTS: readonly (readonly [number, number])[] = [
  [
    0,
    0,
  ],
  [
    7.3,
    3.1,
  ],
  [
    1.7,
    9.2,
  ],
]

/** How far the cloudy noise is stretched about its middle, so it uses its whole range */
const CLOUD_CONTRAST = 2.3

/**
 * A number that sets one chamber's surface detail apart from another's,
 * from its size and where its walls stand.
 * @param chamber - The chamber
 * @returns The number, an unsigned 32-bit integer
 */
export function chamberSeed(chamber: CompiledChamber): number {
  const bytes = new Uint8Array(2 + (chamber.width * chamber.height))

  bytes[0] = chamber.width
  bytes[1] = chamber.height

  for (let y = 0; y < chamber.height; y++) {
    for (let x = 0; x < chamber.width; x++) {
      bytes[2 + (y * chamber.width) + x] = chamber.isWall(x, y) ? 1 : 0
    }
  }

  return hashBytes(bytes)
}

/**
 * Keeps a share between nothing and all.
 * @param value - Any number
 * @returns The number, no less than 0 and no more than 1
 */
export function clampShare(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * How far a value has come from one bound to another, easing in and out.
 * @param from - The bound that gives 0
 * @param to - The bound that gives 1, on either side of the other
 * @param value - The value
 * @returns From 0 to 1
 */
export function smoothStep(from: number, to: number, value: number): number {
  const share = clampShare((value - from) / (to - from))

  return share * share * (3 - (2 * share))
}

/**
 * A number between 0 and 1 for one tile, the same every time.
 * @param seed - The chamber's number, from chamberSeed()
 * @param x - Column
 * @param y - Row
 * @param salt - Which of the tile's numbers this is
 * @returns The number, from 0 up to, never reaching, 1
 */
export function tileNumber(seed: number, x: number, y: number, salt: number): number {
  return pieceNumber(seed, (y * ROW_STRIDE) + x, salt)
}

/**
 * A run of numbers between 0 and 1 for one tile, the same every time: what
 * one mark on it is shaped from.
 * @param seed - The chamber's number, from chamberSeed()
 * @param x - Column
 * @param y - Row
 * @param salt - Which of the tile's runs this is; a run uses the salts from this one on, so runs' salts lie well apart
 * @returns Gives the run's next number, from 0 up to, never reaching, 1
 */
export function tileNumbers(seed: number, x: number, y: number, salt: number): () => number {
  let taken = 0

  return () => {
    taken += 1

    return tileNumber(seed, x, y, salt + taken)
  }
}

/**
 * One layer of the cloudy noise, ready to be read: a number for each point
 * of its grid of whole numbers, worked out once.
 */
type CloudLayer = {
  readonly weight: number // How much it weighs in the noise
  readonly scale: number // How much finer it is than the coarsest
  readonly shiftAcross: number // How far it is moved across, so the layers' grids don't line up
  readonly shiftDown: number // How far it is moved down
  readonly columns: number // Points across its grid
  readonly numbers: Float64Array // Each point's number, from 0 to 1, row by row
}

/**
 * Reads cloudy noise at a point.
 * @param x - How far across, a cloud being about one wide
 * @param y - How far down
 * @returns From 0 to 1
 */
export type CloudNoise = (x: number, y: number) => number

/**
 * Reads one layer of the cloudy noise at a point: its grid's numbers,
 * blended smoothly between the four points round it.
 * @param layer - The layer
 * @param x - How far across the noise
 * @param y - How far down it
 * @returns From 0 to 1
 */
function readCloudLayer(layer: CloudLayer, x: number, y: number): number {
  const gridX = (x * layer.scale) + layer.shiftAcross
  const gridY = (y * layer.scale) + layer.shiftDown
  const left = Math.floor(gridX)
  const top = Math.floor(gridY)
  const across = smoothStep(0, 1, gridX - left)
  const down = smoothStep(0, 1, gridY - top)
  const at = (top * layer.columns) + left
  const topLeft = layer.numbers[at] ?? 0
  const topRight = layer.numbers[at + 1] ?? 0
  const bottomLeft = layer.numbers[at + layer.columns] ?? 0
  const bottomRight = layer.numbers[at + layer.columns + 1] ?? 0
  const upper = topLeft + ((topRight - topLeft) * across)
  const lower = bottomLeft + ((bottomRight - bottomLeft) * across)

  return upper + ((lower - upper) * down)
}

/**
 * Cloudy noise between 0 and 1 over an area, to be read at many points:
 * three layers of smooth noise, each finer and fainter than the one before,
 * stretched to use the whole range. Each layer's numbers are worked out
 * once, here, so reading a point only blends them.
 * @param seed - The chamber's number, from chamberSeed()
 * @param salt - Which noise this is; it uses this salt and the two after it
 * @param width - How far across it is read, from 0
 * @param height - How far down it is read, from 0
 * @returns Reads the noise at a point of that area
 */
export function cloudNoise(seed: number, salt: number, width: number, height: number): CloudNoise {
  const layers = CLOUD_WEIGHTS.map((weight, index): CloudLayer => {
    const scale = CLOUD_SCALES[index] ?? 1
    const shift = CLOUD_SHIFTS[index] ?? [
      0,
      0,
    ]
    // One point past the last one read, on each side of the far edges
    const columns = Math.floor((width * scale) + shift[0]) + 2
    const rows = Math.floor((height * scale) + shift[1]) + 2
    const numbers = new Float64Array(columns * rows)

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        numbers[(row * columns) + column] = tileNumber(seed, column, row, salt + index)
      }
    }

    return {
      weight: weight,
      scale: scale,
      shiftAcross: shift[0],
      shiftDown: shift[1],
      columns: columns,
      numbers: numbers,
    }
  })

  return (x, y) => {
    let level = 0

    for (const layer of layers) {
      level += layer.weight * readCloudLayer(layer, x, y)
    }

    return clampShare(((level - 0.5) * CLOUD_CONTRAST) + 0.5)
  }
}
