import {Direction} from '@/game/direction'
import {PALETTE, withAlpha} from '@/game/palette'
import {type CompiledChamber, NO_ELEMENT, type PlacedKind} from '@/game/rules/compiled_chamber'
import {ELEMENT_REGISTRY} from '@/game/rules/element_registry'
import {chamberSeed, tileNumber, tileNumbers} from '@/game/surface_noise'
import {wallTopParts} from '@/game/surface_tone'
import type {TilePainter} from '@/game/tile_painter'

// The wear marks of the chamber's surface detail (docs/sprites.md), drawn by
// code over the floor's tones and on the walls' flat tops: scratches, cracks
// and chipped corners on the floor, scratches on the walls. Each kind marks
// its own share of the tiles, so a tile can get more than one, and each mark
// is shaped from its tile's own numbers, so no two are alike. All of them
// are faint and grey, and keep off the walls' sloped edges, where portals
// open, so none passes for a rivet, an arrow or an antline. They are the
// same in every state, so the renderer draws them into its backdrop

/**
 * Draws one mark in its tile's frame: the origin on the tile's top left
 * corner, x to the right and y down.
 * @param ctx - The canvas's context, placed on the tile; whatever it changes is undone afterwards
 * @param tileSize - Side of a tile, in pixels
 * @param next - Gives the next of the numbers the mark is shaped from, from 0 up to, never reaching, 1
 */
type MarkDrawing = (ctx: CanvasRenderingContext2D, tileSize: number, next: () => number) => void

/**
 * One kind of wear on the floor.
 */
type FloorWear = {
  readonly salt: number // Sets the tiles it marks, and its marks' shapes, apart from the other kinds'; it uses the salts from this one on
  readonly keptInTile: boolean // Whether a mark is cut off at its tile's edge, as a crack or a chipped corner, which belong to one tile, or may run on over the next, as a scratch
  readonly draw: MarkDrawing // Draws one mark
}

/**
 * A point of a crack, in pixels from its tile's top left corner.
 */
type CrackPoint = {
  readonly x: number // To the right
  readonly y: number // Downwards
}

/** The share of the tiles each kind of wear marks */
const MARKED_SHARE = 0.3

/** How opaque a scratch on the floor is drawn, and the lit edge beside it */
const FLOOR_SCRATCH_ALPHA = 0.058
const FLOOR_SCRATCH_EDGE_ALPHA = 0.132

/** How opaque a scratch on a wall is drawn, and the shaded edge beside it */
const WALL_SCRATCH_ALPHA = 0.048
const WALL_SCRATCH_EDGE_ALPHA = 0.032

/** How opaque a crack is drawn, and the lit edge beside it */
const CRACK_ALPHA = 0.048
const CRACK_EDGE_ALPHA = 0.044

/** How much fainter a crack's branch is than the crack */
const CRACK_BRANCH_SHARE = 0.75

/** How opaque a chipped corner is drawn, and its broken edge */
const CHIP_ALPHA = 0.144
const CHIP_EDGE_ALPHA = 0.096

/** A scratch's width, in tiles; it is never thinner than a pixel */
const SCRATCH_WIDTH = 0.009

/** A crack's width, in tiles; it is never thinner than a pixel */
const CRACK_WIDTH = 0.013

/** The width of a chipped corner's broken edge, in tiles; it is never thinner than a pixel */
const CHIP_EDGE_WIDTH = 0.008

/** Where along a scratch it is at its full strength, as shares of its length: it trails off towards both ends */
const SCRATCH_FULL_FROM = 0.25
const SCRATCH_FULL_TO = 0.7

/** The salt the scratches on the walls take their numbers with; it uses the salts from this one on */
const WALL_SCRATCH_SALT = 4000

/**
 * Whether a tile that holds an element of each type takes wear marks. A
 * mark under a button, a switch or an arrow, or on a slide floor's hatching,
 * would only confuse; a pit, a door and the exit hide the floor; a blocked
 * wall's steel is left as it is. Every type is listed, so a new one has to
 * be given its answer.
 */
const TAKES_WEAR: Readonly<Record<PlacedKind, boolean>> = {
  slideFloor: false,
  arrow: false,
  blockedWall: false,
  emitter: true,
  lightBarrier: true,
  ditch: false,
  laser: true,
  door: false,
  exit: false,
  button: false,
  receiver: true,
  switch: false,
  fizzler: true,
}

/**
 * Whether a tile takes wear marks: it holds no element that keeps them off.
 * @param chamber - The chamber
 * @param x - Column
 * @param y - Row
 * @returns True when marks may land on it
 */
function takesWear(chamber: CompiledChamber, x: number, y: number): boolean {
  return ELEMENT_REGISTRY.every((definition) => (definition.kind === 'wall') || (definition.kind === 'box') || TAKES_WEAR[definition.kind] || (chamber.elementAt(definition.kind, x, y) === NO_ELEMENT))
}

/**
 * Draws one scrape: a few thin lines side by side, as something dragged
 * leaves, each trailing off towards its ends, with an edge beside it that
 * gives it depth.
 * @param ctx - The canvas's context, placed on the tile
 * @param tileSize - Side of a tile, in pixels
 * @param next - Gives the next of the numbers the mark is shaped from
 * @param cut - The scratch's colour at its full strength, as rgba()
 * @param edge - The colour of the edge beside it at its full strength, as rgba()
 */
function drawScratches(ctx: CanvasRenderingContext2D, tileSize: number, next: () => number, cut: string, edge: string): void {
  const lines = 2 + Math.floor(next() * 3)
  const angle = next() * Math.PI
  const width = Math.max(1, tileSize * SCRATCH_WIDTH)
  const gap = (0.035 + (0.04 * next())) * tileSize

  ctx.translate((0.25 + (0.5 * next())) * tileSize, (0.25 + (0.5 * next())) * tileSize)
  ctx.rotate(angle)
  ctx.lineCap = 'butt'
  ctx.lineWidth = width

  for (let line = 0; line < lines; line++) {
    const offset = ((line - ((lines - 1) / 2)) * gap) + ((next() - 0.5) * gap * 0.5)
    const half = (0.16 + (0.3 * next())) * tileSize
    const middle = (next() - 0.5) * 0.25 * tileSize
    const tilt = (next() - 0.5) * 0.035 * tileSize

    // The edge first, a line's width to one side, then the scratch itself
    for (const stroke of [
      {
        colour: edge,
        shift: width,
      },
      {
        colour: cut,
        shift: 0,
      },
    ]) {
      const fade = ctx.createLinearGradient(middle - half, 0, middle + half, 0)

      fade.addColorStop(0, withAlpha(stroke.colour, 0))
      fade.addColorStop(SCRATCH_FULL_FROM, stroke.colour)
      fade.addColorStop(SCRATCH_FULL_TO, stroke.colour)
      fade.addColorStop(1, withAlpha(stroke.colour, 0))
      ctx.strokeStyle = fade
      ctx.beginPath()
      ctx.moveTo(middle - half, offset + stroke.shift - tilt)
      ctx.lineTo(middle + half, offset + stroke.shift + tilt)
      ctx.stroke()
    }
  }
}

/**
 * Draws a scrape on the floor: dark, with a lit edge.
 * @param ctx - The canvas's context, placed on the tile
 * @param tileSize - Side of a tile, in pixels
 * @param next - Gives the next of the numbers the mark is shaped from
 */
function drawFloorScratches(ctx: CanvasRenderingContext2D, tileSize: number, next: () => number): void {
  drawScratches(ctx, tileSize, next, withAlpha(PALETTE.floorScratch, FLOOR_SCRATCH_ALPHA), withAlpha(PALETTE.surfaceLight, FLOOR_SCRATCH_EDGE_ALPHA))
}

/**
 * Strokes a line through a crack's points, moved a way down and to the right.
 * @param ctx - The canvas's context, placed on the tile
 * @param points - The points, in order
 * @param shift - How far the line is moved down and to the right, in pixels
 */
function strokeCrack(ctx: CanvasRenderingContext2D, points: readonly CrackPoint[], shift: number): void {
  ctx.beginPath()

  points.forEach((point, i) => {
    if (i === 0) {
      ctx.moveTo(point.x + shift, point.y + shift)
    } else {
      ctx.lineTo(point.x + shift, point.y + shift)
    }
  })

  ctx.stroke()
}

/**
 * Draws a crack: a jagged line running in from one of the tile's edges,
 * with one short branch, and a lit edge beside both.
 * @param ctx - The canvas's context, placed on the tile and clipped to it
 * @param tileSize - Side of a tile, in pixels
 * @param next - Gives the next of the numbers the mark is shaped from
 */
function drawCrack(ctx: CanvasRenderingContext2D, tileSize: number, next: () => number): void {
  const side = Math.floor(next() * 4)
  const along = (0.15 + (0.7 * next())) * tileSize
  const width = Math.max(1, tileSize * CRACK_WIDTH)
  // It starts on the top, right, bottom or left edge, heading into the tile
  let x = [
    along,
    tileSize,
    along,
    0,
  ][side] ?? 0
  let y = [
    0,
    along,
    tileSize,
    along,
  ][side] ?? 0
  let heading = ([
    Math.PI / 2,
    Math.PI,
    -Math.PI / 2,
    0,
  ][side] ?? 0) + (next() - 0.5)
  const points: CrackPoint[] = [
    {
      x: x,
      y: y,
    },
  ]
  const steps = 5 + Math.floor(next() * 4)

  for (let step = 0; step < steps; step++) {
    heading += (next() - 0.5) * 0.9

    const length = (0.06 + (0.09 * next())) * tileSize

    x += Math.cos(heading) * length
    y += Math.sin(heading) * length
    points.push({
      x: x,
      y: y,
    })
  }

  // The branch leaves the crack at its third or fourth point, turning off to one side
  const branch: CrackPoint[] = [
    points[2 + Math.floor(next() * 2)] ?? {
      x: x,
      y: y,
    },
  ]
  let branchHeading = heading + (((next() < 0.5) ? -1 : 1) * (0.7 + (0.5 * next())))

  for (let step = 0; step < 3; step++) {
    branchHeading += (next() - 0.5) * 0.8

    const length = (0.05 + (0.06 * next())) * tileSize
    const last = branch[branch.length - 1] ?? {
      x: x,
      y: y,
    }

    branch.push({
      x: last.x + (Math.cos(branchHeading) * length),
      y: last.y + (Math.sin(branchHeading) * length),
    })
  }

  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.lineWidth = width

  // The lit edges first, a line's width down and to the right, then the crack and its branch
  ctx.strokeStyle = withAlpha(PALETTE.surfaceLight, CRACK_EDGE_ALPHA)
  strokeCrack(ctx, points, width)
  ctx.strokeStyle = withAlpha(PALETTE.surfaceLight, CRACK_EDGE_ALPHA * CRACK_BRANCH_SHARE)
  strokeCrack(ctx, branch, width)
  ctx.strokeStyle = withAlpha(PALETTE.floorCrack, CRACK_ALPHA)
  strokeCrack(ctx, points, 0)
  ctx.strokeStyle = withAlpha(PALETTE.floorCrack, CRACK_ALPHA * CRACK_BRANCH_SHARE)
  strokeCrack(ctx, branch, 0)
}

/**
 * Draws a chipped corner: a small jagged piece broken off one of the tile's
 * corners, showing what lies beneath, with a broken edge round it.
 * @param ctx - The canvas's context, placed on the tile and clipped to it
 * @param tileSize - Side of a tile, in pixels
 * @param next - Gives the next of the numbers the mark is shaped from
 */
function drawChip(ctx: CanvasRenderingContext2D, tileSize: number, next: () => number): void {
  const across = (0.08 + (0.1 * next())) * tileSize
  const down = (0.08 + (0.1 * next())) * tileSize

  // Turned about the tile's middle, so the piece comes off any of the four corners
  ctx.translate(tileSize / 2, tileSize / 2)
  ctx.rotate(Math.floor(next() * 4) * Math.PI / 2)
  ctx.translate(-tileSize / 2, -tileSize / 2)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(across, 0)
  ctx.lineTo(across * (0.62 + (0.12 * next())), down * (0.2 + (0.12 * next())))
  ctx.lineTo(across * (0.4 + (0.1 * next())), down * (0.42 + (0.14 * next())))
  ctx.lineTo(across * (0.16 + (0.1 * next())), down * (0.7 + (0.12 * next())))
  ctx.lineTo(0, down)
  ctx.closePath()
  ctx.fillStyle = withAlpha(PALETTE.floorChip, CHIP_ALPHA)
  ctx.fill()
  ctx.strokeStyle = withAlpha(PALETTE.floorChipEdge, CHIP_EDGE_ALPHA)
  ctx.lineWidth = Math.max(1, tileSize * CHIP_EDGE_WIDTH)
  ctx.stroke()
}

/** The kinds of wear on the floor, bottom to top */
const FLOOR_WEAR: readonly FloorWear[] = [
  {
    salt: 1000,
    keptInTile: false,
    draw: drawFloorScratches,
  },
  {
    salt: 2000,
    keptInTile: true,
    draw: drawCrack,
  },
  {
    salt: 3000,
    keptInTile: true,
    draw: drawChip,
  },
]

/**
 * Draws the floor's wear marks over the floor and its tones: each kind on
 * its own share of the floor tiles that take them.
 * @param painter - Paints on the canvas, the floor drawn on it
 * @param chamber - The chamber
 */
export function drawFloorWear(painter: TilePainter, chamber: CompiledChamber): void {
  const seed = chamberSeed(chamber)

  // A frame on the chamber's top left corner, with x to the right and y down
  painter.drawInFrame(0, chamber.height, Direction.UP, (ctx, tileSize) => {
    for (const wear of FLOOR_WEAR) {
      for (let y = 0; y < chamber.height; y++) {
        for (let x = 0; x < chamber.width; x++) {
          if (chamber.isWall(x, y) || (!takesWear(chamber, x, y)) || (tileNumber(seed, x, y, wear.salt) >= MARKED_SHARE)) {
            continue
          }

          ctx.save()
          ctx.translate(x * tileSize, (chamber.height - 1 - y) * tileSize)

          if (wear.keptInTile) {
            ctx.beginPath()
            ctx.rect(0, 0, tileSize, tileSize)
            ctx.clip()
          }

          wear.draw(ctx, tileSize, tileNumbers(seed, x, y, wear.salt))
          ctx.restore()
        }
      }
    }
  })
}

/**
 * Draws the walls' wear marks over the walls already drawn on their own
 * layer: scratches, bright on the grey, on a share of the plain walls, cut
 * off at the flat tops' edges so the sloped edges, where portals open, stay
 * clean.
 * @param painter - Paints on the walls' layer, the walls drawn on it
 * @param chamber - The chamber
 */
export function drawWallWear(painter: TilePainter, chamber: CompiledChamber): void {
  const seed = chamberSeed(chamber)

  // A frame on the chamber's top left corner, with x to the right and y down
  painter.drawInFrame(0, chamber.height, Direction.UP, (ctx, tileSize) => {
    for (let y = 0; y < chamber.height; y++) {
      for (let x = 0; x < chamber.width; x++) {
        if ((!chamber.isWall(x, y)) || (!takesWear(chamber, x, y)) || (tileNumber(seed, x, y, WALL_SCRATCH_SALT) >= MARKED_SHARE)) {
          continue
        }

        ctx.save()
        ctx.beginPath()

        // A scrape may run on over the walls beside its own, but only over flat tops
        for (let down = -1; down <= 1; down++) {
          for (let across = -1; across <= 1; across++) {
            for (const part of wallTopParts(chamber, x + across, y + down, tileSize)) {
              ctx.rect(part.left, part.top, part.width, part.height)
            }
          }
        }

        ctx.clip()
        ctx.translate(x * tileSize, (chamber.height - 1 - y) * tileSize)
        drawScratches(ctx, tileSize, tileNumbers(seed, x, y, WALL_SCRATCH_SALT), withAlpha(PALETTE.wallScratch, WALL_SCRATCH_ALPHA), withAlpha(PALETTE.surfaceDark, WALL_SCRATCH_EDGE_ALPHA))
        ctx.restore()
      }
    }
  })
}
