import {spriteOf} from '@/game/sprite_sources'
import {SPRITE_SHAPES, SPRITE_TILE_SIZE, STRIP_TILES, type SpriteName} from '@/game/sprite_set'

// Each sprite shrunk once to a tile size on screen and kept, so a frame only
// copies pixels. Shared by every canvas the chamber is drawn on: the level's
// and each home menu map's

/**
 * A sprite shrunk to a tile size.
 */
export type ScaledSprite = {
  readonly image: HTMLCanvasElement // The sprite at that size: its tile, any overhang around it, or the whole strip
  readonly margin: number // Overhang around the tile on every side, in canvas pixels
}

/** Tile sizes kept at once; the one used longest ago goes first */
const KEPT_SIZES = 8

const scaledBySize = new Map<number, Map<SpriteName, ScaledSprite | null>>() // Every sprite shrunk so far, by tile size, the most recently used size last

/**
 * Shrinks a sprite to a tile size.
 * @param name - The sprite
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The sprite at that size, or null for a glow without a usable file
 * @throws Error when a canvas cannot provide a 2D context
 */
function scale(name: SpriteName, tileSize: number): ScaledSprite | null {
  const sprite = spriteOf(name)

  if (sprite === null) {
    return null
  }

  const margin = Math.round(sprite.overhang * tileSize / SPRITE_TILE_SIZE)
  const canvas = document.createElement('canvas')

  canvas.width = (SPRITE_SHAPES[name] === 'strip') ? tileSize * STRIP_TILES : tileSize + (2 * margin)
  canvas.height = tileSize + (2 * margin)

  const context = canvas.getContext('2d')

  if (context === null) {
    throw new Error('The canvas has no 2D context')
  }

  context.imageSmoothingQuality = 'high'
  context.drawImage(sprite.image, 0, 0, canvas.width, canvas.height)

  return {
    image: canvas,
    margin: margin,
  }
}

/**
 * A sprite shrunk to a tile size, shrunk the first time it is asked for at
 * that size.
 * @param name - The sprite
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The sprite at that size, or null for a glow without a usable file, or a tile with no pixels
 */
export function scaledSprite(name: SpriteName, tileSize: number): ScaledSprite | null {
  // A canvas not yet sized for a chamber has nothing to draw
  if (tileSize <= 0) {
    return null
  }

  let sprites = scaledBySize.get(tileSize)

  if (sprites === undefined) {
    sprites = new Map()

    const oldest = scaledBySize.keys().next()

    if ((scaledBySize.size >= KEPT_SIZES) && (oldest.done !== true)) {
      scaledBySize.delete(oldest.value)
    }
  } else {
    scaledBySize.delete(tileSize)
  }

  // Set again so the size counts as the most recently used
  scaledBySize.set(tileSize, sprites)

  if (!sprites.has(name)) {
    sprites.set(name, scale(name, tileSize))
  }

  return sprites.get(name) ?? null
}
