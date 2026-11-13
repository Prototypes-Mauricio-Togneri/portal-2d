import {PALETTE} from '@/game/palette'
import {SPRITE_SHAPES, SPRITE_TILE_SIZE, STRIP_TILE, STRIP_TILES, type SpriteName} from '@/game/sprite_set'

// The placeholders that stand in for sprites without a usable file: the
// original game's flat drawing, in the palette's colours, at the size of the
// sprite's file without overhang. A switched-off element, which the original
// game didn't draw, is its switched-on look faded. A glow has none: without
// its file, nothing glows

/**
 * Paints one placeholder onto a canvas of its sprite's size.
 */
type PlaceholderPainter = (context: CanvasRenderingContext2D) => void

/** The thin edge the original game's blocks are drawn with, at a tile of a sprite's size, in pixels */
const EDGE_WIDTH = 1

/** A portal's edge at a tile of a sprite's size, in pixels */
const PORTAL_EDGE_WIDTH = 5

/** The band marking where a strip tile meets something other than itself, in pixels */
const BAND_WIDTH = 12

/** Opacity of a switched-off element: its switched-on look, faded */
const OFF_OPACITY = 0.25

/** Opacity of a fizzler that is on */
const FIZZLER_OPACITY = 0.5

/** A laser's beam is this many times thinner than a tile */
const LASER_WIDTH_RATIO = 6

/** Half the size of a facing or arrow triangle, as a share of half a tile */
const TRIANGLE_SHARE = 0.4

/**
 * Fills a rectangle, with a border drawn as the same rectangle behind it.
 * @param context - The placeholder's canvas
 * @param x - Left edge, in pixels
 * @param y - Top edge, in pixels
 * @param width - Width, in pixels
 * @param height - Height, in pixels
 * @param fillColor - Body fill
 * @param borderColor - Border fill, or null for none
 * @param edgeWidth - Border width, in pixels
 */
function fillBlock(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fillColor: string | CanvasGradient, borderColor: string | null, edgeWidth: number): void {
  if (borderColor === null) {
    context.fillStyle = fillColor
    context.fillRect(x, y, width, height)

    return
  }

  context.fillStyle = borderColor
  context.fillRect(x, y, width, height)
  context.fillStyle = fillColor
  context.fillRect(x + edgeWidth, y + edgeWidth, width - (edgeWidth * 2), height - (edgeWidth * 2))
}

/**
 * Fills a triangle pointing up in the middle of the tile, the way sprites
 * with a direction are drawn.
 * @param context - The placeholder's canvas
 * @param color - Fill
 */
function fillTriangleUp(context: CanvasRenderingContext2D, color: string): void {
  const center = SPRITE_TILE_SIZE / 2
  const half = center * TRIANGLE_SHARE

  context.fillStyle = color
  context.beginPath()
  context.moveTo(center - half, center + half)
  context.lineTo(center + half, center + half)
  context.lineTo(center, center - half)
  context.closePath()
  context.fill()
}

/**
 * Builds a painter that fills the whole tile as a block.
 * @param fillColor - Body fill
 * @param borderColor - Edge fill, or null for none
 * @param opacity - Alpha for the whole block; 1 by default
 * @returns The painter
 */
function blockPainter(fillColor: string, borderColor: string | null, opacity = 1): PlaceholderPainter {
  return (context) => {
    context.globalAlpha = opacity
    fillBlock(context, 0, 0, SPRITE_TILE_SIZE, SPRITE_TILE_SIZE, fillColor, borderColor, EDGE_WIDTH)
  }
}

/**
 * Builds a painter for a strip: every tile filled, with a band along each
 * side it leaves open and in each open corner, so the joins show.
 * @param fillColor - Fill of the wall, or of the open ditch
 * @param bandColor - The band where it meets something else
 * @returns The painter
 */
function stripPainter(fillColor: string, bandColor: string): PlaceholderPainter {
  return (context) => {
    const size = SPRITE_TILE_SIZE
    const far = size - BAND_WIDTH

    for (let i = 0; i < STRIP_TILES; i++) {
      const left = i * size

      context.fillStyle = fillColor
      context.fillRect(left, 0, size, size)
      context.fillStyle = bandColor

      if ((i === STRIP_TILE.lone) || (i === STRIP_TILE.horizontalRun)) {
        context.fillRect(left, 0, size, BAND_WIDTH)
        context.fillRect(left, far, size, BAND_WIDTH)
      }

      if ((i === STRIP_TILE.lone) || (i === STRIP_TILE.verticalRun)) {
        context.fillRect(left, 0, BAND_WIDTH, size)
        context.fillRect(left + far, 0, BAND_WIDTH, size)
      }

      if (i === STRIP_TILE.innerCorners) {
        context.fillRect(left, 0, BAND_WIDTH, BAND_WIDTH)
        context.fillRect(left + far, 0, BAND_WIDTH, BAND_WIDTH)
        context.fillRect(left, far, BAND_WIDTH, BAND_WIDTH)
        context.fillRect(left + far, far, BAND_WIDTH, BAND_WIDTH)
      }
    }
  }
}

/**
 * Builds a painter for a barrier: a radial gradient, lighter at the centre.
 * @param opacity - Alpha for the whole tile
 * @returns The painter
 */
function barrierPainter(opacity: number): PlaceholderPainter {
  return (context) => {
    const center = SPRITE_TILE_SIZE / 2
    const gradient = context.createRadialGradient(center, center, 0, center, center, SPRITE_TILE_SIZE)

    gradient.addColorStop(0, PALETTE.barrierCenter)
    gradient.addColorStop(1, PALETTE.barrierEdge)
    context.globalAlpha = opacity
    fillBlock(context, 0, 0, SPRITE_TILE_SIZE, SPRITE_TILE_SIZE, gradient, null, 0)
  }
}

/**
 * Builds a painter for a laser: a beam running left to right through the
 * middle of the tile.
 * @param opacity - Alpha for the beam
 * @returns The painter
 */
function laserPainter(opacity: number): PlaceholderPainter {
  return (context) => {
    const beamWidth = SPRITE_TILE_SIZE / LASER_WIDTH_RATIO

    context.globalAlpha = opacity
    fillBlock(context, 0, (SPRITE_TILE_SIZE - beamWidth) / 2, SPRITE_TILE_SIZE, beamWidth, PALETTE.laser, null, 0)
  }
}

/**
 * Builds a painter for a portal: the top half of its wall tile, the side it
 * opens on.
 * @param fillColor - Body fill
 * @param borderColor - Edge fill
 * @returns The painter
 */
function portalPainter(fillColor: string, borderColor: string): PlaceholderPainter {
  return (context) => {
    fillBlock(context, 0, 0, SPRITE_TILE_SIZE, SPRITE_TILE_SIZE / 2, fillColor, borderColor, PORTAL_EDGE_WIDTH)
  }
}

/**
 * Paints an arrow: a triangle pointing up.
 * @param context - The placeholder's canvas
 */
function paintArrow(context: CanvasRenderingContext2D): void {
  fillTriangleUp(context, PALETTE.arrow)
}

/**
 * Paints the subject: a block with a triangle showing it faces up.
 * @param context - The placeholder's canvas
 */
function paintSubject(context: CanvasRenderingContext2D): void {
  fillBlock(context, 0, 0, SPRITE_TILE_SIZE, SPRITE_TILE_SIZE, PALETTE.subjectFill, PALETTE.subjectBorder, EDGE_WIDTH)
  fillTriangleUp(context, PALETTE.subjectArrow)
}

/** How each sprite's placeholder is painted; null for a glow, which has none */
const PLACEHOLDER_PAINTERS: Readonly<Record<SpriteName, PlaceholderPainter | null>> = {
  floor: blockPainter(PALETTE.floorFill, PALETTE.floorBorder),
  wall: stripPainter(PALETTE.wallFill, PALETTE.wallBorder),
  ditch: stripPainter(PALETTE.ditch, PALETTE.floorBorder),
  ditch_bridged: blockPainter(PALETTE.ditch, null, OFF_OPACITY),
  barrier_raised: barrierPainter(1),
  barrier_lowered: barrierPainter(OFF_OPACITY),
  door_closed: blockPainter(PALETTE.doorFill, PALETTE.doorBorder),
  door_open: blockPainter(PALETTE.doorFill, PALETTE.doorBorder, OFF_OPACITY),
  exit_closed: blockPainter(PALETTE.doorFill, PALETTE.doorBorder),
  exit_open: blockPainter(PALETTE.doorFill, PALETTE.doorBorder, OFF_OPACITY),
  button_up: blockPainter(PALETTE.buttonFill, PALETTE.buttonBorder),
  button_pressed: blockPainter(PALETTE.buttonBorder, PALETTE.buttonFill),
  switch: blockPainter(PALETTE.switchFill, PALETTE.switchBorder),
  box: blockPainter(PALETTE.boxFill, PALETTE.boxBorder),
  fizzler_on: blockPainter(PALETTE.fizzlerFill, PALETTE.fizzlerBorder, FIZZLER_OPACITY),
  laser_on: laserPainter(1),
  laser_glow: null,
  arrow: paintArrow,
  portal_blue: portalPainter(PALETTE.bluePortalFill, PALETTE.bluePortalBorder),
  portal_orange: portalPainter(PALETTE.orangePortalFill, PALETTE.orangePortalBorder),
  portal_blue_glow: null,
  portal_orange_glow: null,
  subject: paintSubject,
}

/**
 * Draws the placeholder that stands in for a sprite without a usable file.
 * @param name - The sprite
 * @returns A canvas the size of the sprite's file without overhang, or null for a glow, which has no placeholder
 * @throws Error when a canvas cannot provide a 2D context
 */
export function drawPlaceholder(name: SpriteName): HTMLCanvasElement | null {
  const paint = PLACEHOLDER_PAINTERS[name]

  if (paint === null) {
    return null
  }

  const canvas = document.createElement('canvas')

  canvas.width = (SPRITE_SHAPES[name] === 'strip') ? SPRITE_TILE_SIZE * STRIP_TILES : SPRITE_TILE_SIZE
  canvas.height = SPRITE_TILE_SIZE

  const context = canvas.getContext('2d')

  if (context === null) {
    throw new Error('The canvas has no 2D context')
  }

  paint(context)

  return canvas
}
