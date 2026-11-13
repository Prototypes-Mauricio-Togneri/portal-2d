import {PALETTE} from '@/game/palette'
import {spriteOf} from '@/game/sprite_sources'
import {quarterRect, SPRITE_SHAPES, SPRITE_TILE_SIZE, STRIP_TILES, type SpriteName, TILE_QUARTERS} from '@/game/sprite_set'

// Each sprite shrunk once to a tile size on screen and kept, so a frame only
// copies pixels, and the shared drop shadow of each raised sprite, made once
// from its shape at that size. Shared by every canvas the chamber is drawn
// on: the level's and each home menu map's. A strip is shrunk quarter by
// quarter, each on its own, so no quarter's pixels bleed into another's: a
// tile's quarters come from different strip tiles, and side by side they must
// meet without a seam

/**
 * A sprite shrunk to a tile size.
 */
export type ScaledSprite = {
  readonly image: HTMLCanvasElement // The sprite at that size: its tile, any overhang around it, or the whole strip
  readonly margin: number // Overhang around the tile on every side, in canvas pixels
}

/**
 * A canvas to draw on, with its 2D context.
 */
type DrawingCanvas = {
  readonly canvas: HTMLCanvasElement // The canvas
  readonly context: CanvasRenderingContext2D // Its 2D context
}

/** Tile sizes kept at once; the one used longest ago goes first */
const KEPT_SIZES = 8

/** How soft the shared drop shadow is: its blur, as a share of the side of what casts it */
const SHADOW_BLUR_SHARE = 0.12

/** How far the shadow reaches past what casts it, in blurs: a canvas shadow's blur fades out by about one and a half times its size */
const SHADOW_REACH = 1.5

const scaledBySize = new Map<number, Map<SpriteName, ScaledSprite | null>>() // Every sprite shrunk so far, by tile size, the most recently used size last
const shadowsBySize = new Map<number, Map<SpriteName, ScaledSprite | null>>() // Every shadow made so far, by tile size, the most recently used size last

/**
 * Makes a canvas with a 2D context.
 * @param width - Its width, in pixels
 * @param height - Its height, in pixels
 * @returns The canvas and its context
 * @throws Error when the canvas cannot provide a 2D context
 */
function makeCanvas(width: number, height: number): DrawingCanvas {
  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')

  if (context === null) {
    throw new Error('The canvas has no 2D context')
  }

  context.imageSmoothingQuality = 'high'

  return {
    canvas: canvas,
    context: context,
  }
}

/**
 * Shrinks a strip quarter by quarter: each quarter of each of its tiles is
 * first copied alone, pixel for pixel, then shrunk to its place, so its
 * edges are shrunk from its own pixels only.
 * @param image - The strip's image: its file, or its placeholder
 * @param context - The shrunk strip's canvas, a strip of tiles of the tile size
 * @param tileSize - Side of a tile, in canvas pixels
 */
function scaleStrip(image: CanvasImageSource, context: CanvasRenderingContext2D, tileSize: number): void {
  const quarterSize = SPRITE_TILE_SIZE / 2
  const quarter = makeCanvas(quarterSize, quarterSize)

  for (let i = 0; i < STRIP_TILES; i++) {
    for (const tileQuarter of TILE_QUARTERS) {
      const source = quarterRect(SPRITE_TILE_SIZE, tileQuarter)
      const target = quarterRect(tileSize, tileQuarter)

      quarter.context.clearRect(0, 0, quarterSize, quarterSize)
      quarter.context.drawImage(image, (i * SPRITE_TILE_SIZE) + source.left, source.top, source.width, source.height, 0, 0, source.width, source.height)
      context.drawImage(quarter.canvas, (i * tileSize) + target.left, target.top, target.width, target.height)
    }
  }
}

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
  const strip = SPRITE_SHAPES[name] === 'strip'
  const scaled = makeCanvas(strip ? tileSize * STRIP_TILES : tileSize + (2 * margin), tileSize + (2 * margin))

  if (strip) {
    scaleStrip(sprite.image, scaled.context, tileSize)
  } else {
    scaled.context.drawImage(sprite.image, 0, 0, scaled.canvas.width, scaled.canvas.height)
  }

  return {
    image: scaled.canvas,
    margin: margin,
  }
}

/**
 * The blur of the shared drop shadow for something of a size: the canvas's
 * shadowBlur, with no offset, since the light is straight overhead.
 * @param size - Side of what casts it, in canvas pixels: a tile, or half of one
 * @returns The blur, in canvas pixels
 */
export function shadowBlur(size: number): number {
  return size * SHADOW_BLUR_SHARE
}

/**
 * Makes the shared drop shadow of a sprite at a tile size: its shape,
 * blurred, in the shadow's colour, with room around it for the blur.
 * @param name - The sprite
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The shadow, laid over the tile like the sprite, or null for a sprite with no image
 * @throws Error when a canvas cannot provide a 2D context
 */
function makeShadow(name: SpriteName, tileSize: number): ScaledSprite | null {
  const sprite = scaledSprite(name, tileSize)

  if (sprite === null) {
    return null
  }

  const blur = shadowBlur(tileSize)
  const padding = Math.ceil(blur * SHADOW_REACH)
  const shadow = makeCanvas(sprite.image.width + (2 * padding), sprite.image.height + (2 * padding))

  // The sprite is drawn just off the canvas's left edge, and its shadow pushed back onto it
  shadow.context.shadowColor = PALETTE.shadow
  shadow.context.shadowBlur = blur
  shadow.context.shadowOffsetX = shadow.canvas.width
  shadow.context.drawImage(sprite.image, padding - shadow.canvas.width, padding)

  return {
    image: shadow.canvas,
    margin: sprite.margin + padding,
  }
}

/**
 * The images kept for a tile size in a store, counting the size as the most
 * recently used, and letting go of the size used longest ago when too many
 * are kept.
 * @param store - The images kept, by tile size
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The images kept for that size, by sprite
 */
function keptAt(store: Map<number, Map<SpriteName, ScaledSprite | null>>, tileSize: number): Map<SpriteName, ScaledSprite | null> {
  let images = store.get(tileSize)

  if (images === undefined) {
    images = new Map()

    const oldest = store.keys().next()

    if ((store.size >= KEPT_SIZES) && (oldest.done !== true)) {
      store.delete(oldest.value)
    }
  } else {
    store.delete(tileSize)
  }

  // Set again so the size counts as the most recently used
  store.set(tileSize, images)

  return images
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

  const sprites = keptAt(scaledBySize, tileSize)

  if (!sprites.has(name)) {
    sprites.set(name, scale(name, tileSize))
  }

  return sprites.get(name) ?? null
}

/**
 * The shared drop shadow of a sprite at a tile size, made the first time it
 * is asked for at that size.
 * @param name - The sprite
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The shadow, laid over the tile like the sprite, or null for a sprite with no image, or a tile with no pixels
 */
export function scaledShadow(name: SpriteName, tileSize: number): ScaledSprite | null {
  if (tileSize <= 0) {
    return null
  }

  const shadows = keptAt(shadowsBySize, tileSize)

  if (!shadows.has(name)) {
    shadows.set(name, makeShadow(name, tileSize))
  }

  return shadows.get(name) ?? null
}
