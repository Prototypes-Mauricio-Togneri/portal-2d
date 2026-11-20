import {Direction} from '@/game/direction'
import {PALETTE, withAlpha} from '@/game/palette'
import {type CompiledChamber, NO_ELEMENT} from '@/game/rules/compiled_chamber'
import {makeCanvas} from '@/game/sprite_scaling'
import {chamberSeed, clampShare, cloudNoise, smoothStep, tileNumber} from '@/game/surface_noise'
import type {TilePainter} from '@/game/tile_painter'

// The tones of the chamber's surface detail (docs/sprites.md), drawn by
// code over the floor's sprites and on the walls, so the floor and the walls
// don't read as one tile stamped everywhere: each floor tile shaded a
// little apart from the next, soft darker patches several tiles wide, the
// floor darkening towards the walls and lifted in the open, dirt gathered
// along the foot of the walls; each wall's flat top a plate a shade lighter
// or darker, and soft lighter and darker patches across the walls. All of
// it is faint and grey, and the same in every state, so the renderer draws
// it into its backdrop: the floor's under the antlines, the walls' before
// their shadow is made

/**
 * One part of a soft layer: a colour, and how much of it each sample takes.
 */
type SoftPart = {
  readonly colour: string // Its colour where it is strongest, as rgba()
  readonly share: (across: number, down: number, sample: number) => number // How much of that a sample takes, from 0 to 1, given the sample's middle in tiles from the chamber's top left corner and its number, counted row by row from there
}

/**
 * A step from a sample to one beside it, and how far that is.
 */
type SampleStep = {
  readonly across: number // Samples to the left
  readonly down: number // Samples upwards
  readonly cost: number // How far it is, in samples
}

/**
 * A rectangle of a wall tile's flat top, in canvas pixels from the
 * chamber's top left corner.
 */
export type TopPart = {
  readonly left: number // Left edge
  readonly top: number // Top edge
  readonly width: number // In pixels
  readonly height: number // In pixels
}

/** Samples of a soft layer along each side of a tile: painted this coarse and stretched over the chamber, it comes out smooth */
const SAMPLES_PER_TILE = 8

/** The samples a sweep has already passed beside each one: left, above, and above to either side */
const PASSED_STEPS: readonly SampleStep[] = [
  {
    across: 1,
    down: 0,
    cost: 1,
  },
  {
    across: 0,
    down: 1,
    cost: 1,
  },
  {
    across: 1,
    down: 1,
    cost: Math.SQRT2,
  },
  {
    across: -1,
    down: 1,
    cost: Math.SQRT2,
  },
]

/** A wall's sloped edge with the lit lip inside it, as a share of a tile: the 48 px bevel of the 256 px sprite and a little more */
const WALL_EDGE = 0.2

/** How much of its tint the darkest ordinary floor tile takes */
const TILE_SHADE = 0.065

/** Where the three numbers a tile's shade is averaged from start and stop counting, so most tiles land near the middle shade */
const SHADE_FROM = 0.2
const SHADE_SPAN = 0.6

/** The share of floor tiles shaded clearly apart, like a panel replaced later: one in fourteen */
const ODD_TILES = 0.07

/** How much darker than the darkest ordinary tile an odd tile is at least, and how much more it can be */
const ODD_SHADE_LEAST = 1.15
const ODD_SHADE_RANGE = 0.5

/** How much of their colour the floor's patches take where they are darkest */
const PATCH_SHADE = 0.14

/** How wide a patch is, in tiles */
const PATCH_SPAN = 4.2

/** The level of the cloudy noise the patches start from: below it the floor is left as it is */
const PATCH_FROM = 0.3

/** How much of its colour the floor takes at the foot of a wall, where it is darkest */
const WALL_SHADE = 0.11

/** How fast that fades away from the wall: the distance, in tiles, over which it falls to about a third */
const WALL_SHADE_REACH = 0.85

/** How much the open floor is lifted towards white where it is furthest from every wall */
const OPEN_LIFT = 0.242

/** How far from the nearest wall the lift starts, and where it is full, in tiles */
const OPEN_LIFT_FROM = 1.1
const OPEN_LIFT_FULL = 2.6

/** How much of its colour the grime takes where it is thickest */
const GRIME_SHADE = 0.15

/** How far from a wall the grime is thickest, and where it ends, in tiles */
const GRIME_FROM = 0.02
const GRIME_REACH = 0.4

/** How much finer the grime's blotches are than a tile */
const GRIME_FINENESS = 0.9

/** The share of the grime that lies evenly along every wall; the rest comes and goes in blotches */
const GRIME_EVEN = 0.35

/** How much a wall plate is lightened or darkened at most; a lighter one takes a little less */
const PLATE_SHADE = 0.04
const PLATE_LIGHT_SHARE = 0.8

/** How far from the middle of its three numbers a plate's shade is full */
const PLATE_SPAN = 0.3

/** How much the walls' patches darken where they are strongest; a lighter one takes a little less */
const WALL_PATCH_SHADE = 0.048
const WALL_PATCH_LIGHT_SHARE = 0.75

/** How wide a patch on the walls is, in tiles */
const WALL_PATCH_SPAN = 3.6

/** Soft layers kept at once, two to a chamber, the floor's and the walls'; the one used longest ago goes first */
const KEPT_SOFT_LAYERS = 24

/** The salts each tone takes its numbers with; a noise uses its salt and the two after it */
const TILE_SHADE_SALT = 10
const PATCH_SALT = 20
const GRIME_SALT = 30
const PLATE_SALT = 40
const WALL_PATCH_SALT = 50

const softLayers = new Map<string, HTMLCanvasElement>() // Every soft layer painted so far, by which it is and its chamber's size and number, the most recently used last

/**
 * A chamber's soft layer, painted the first time it is asked for and kept:
 * it depends only on the chamber's size and walls, not on the tile size, so
 * the home menu's map, the chamber screen and every resize share it, and
 * working it out, most of the surface detail's cost, is paid once.
 * @param name - Which of the chamber's soft layers it is
 * @param chamber - The chamber
 * @param seed - The chamber's number, from chamberSeed()
 * @param paint - Paints the layer
 * @returns The layer, to stretch over the chamber
 */
function keptSoftLayer(name: string, chamber: CompiledChamber, seed: number, paint: () => HTMLCanvasElement): HTMLCanvasElement {
  const key = `${name}:${chamber.width}x${chamber.height}:${seed}`
  const kept = softLayers.get(key)

  // Asked for again, it moves to the end of the line
  softLayers.delete(key)

  const layer = kept ?? paint()

  softLayers.set(key, layer)

  if (softLayers.size > KEPT_SOFT_LAYERS) {
    const oldest = softLayers.keys().next()

    if (oldest.done !== true) {
      softLayers.delete(oldest.value)
    }
  }

  return layer
}

/**
 * One sweep over the samples, each taking the shortest way to a wall
 * through the samples the sweep has already passed.
 * @param steps - How far each sample lies from a wall, in samples, as known so far; shortened in place
 * @param width - Samples across
 * @param height - Samples down
 * @param forward - Whether the sweep runs from the top left, or back from the bottom right
 */
function sweepDistances(steps: Float32Array, width: number, height: number, forward: boolean): void {
  const way = forward ? 1 : -1

  for (let count = 0; count < steps.length; count++) {
    const sample = forward ? count : steps.length - 1 - count
    const across = sample % width
    const down = (sample - across) / width
    let nearest = steps[sample] ?? Number.POSITIVE_INFINITY

    for (const step of PASSED_STEPS) {
      const besideAcross = across - (way * step.across)
      const besideDown = down - (way * step.down)

      if ((besideAcross >= 0) && (besideAcross < width) && (besideDown >= 0) && (besideDown < height)) {
        nearest = Math.min(nearest, (steps[(besideDown * width) + besideAcross] ?? Number.POSITIVE_INFINITY) + step.cost)
      }
    }

    steps[sample] = nearest
  }
}

/**
 * How far each sample of the floor's soft layer lies from the nearest wall,
 * found in two sweeps, there and back, so close enough for a soft layer
 * rather than exact.
 * @param chamber - The chamber
 * @returns The distance of each sample, in tiles, row by row from the top left: 0 on a wall, and endless in a chamber with no wall
 */
function wallDistances(chamber: CompiledChamber): Float32Array {
  const width = chamber.width * SAMPLES_PER_TILE
  const height = chamber.height * SAMPLES_PER_TILE
  const steps = new Float32Array(width * height).fill(Number.POSITIVE_INFINITY)

  for (let down = 0; down < height; down++) {
    const y = chamber.height - 1 - Math.floor(down / SAMPLES_PER_TILE)

    for (let across = 0; across < width; across++) {
      if (chamber.isWall(Math.floor(across / SAMPLES_PER_TILE), y)) {
        steps[(down * width) + across] = 0
      }
    }
  }

  sweepDistances(steps, width, height, true)
  sweepDistances(steps, width, height, false)

  // A sample beside a wall lies half a sample from its edge, not a whole one from its first sample's middle
  return steps.map((step) => Math.max(step - 0.5, 0) / SAMPLES_PER_TILE)
}

/**
 * Paints a soft layer for a chamber, a few samples to a tile: each part's
 * colour, as much as each sample takes of it, one over the other.
 * @param chamber - The chamber
 * @param parts - Its parts, bottom to top
 * @returns The layer, to stretch over the chamber
 * @throws Error when a canvas cannot provide a 2D context
 */
function paintSoftLayer(chamber: CompiledChamber, parts: readonly SoftPart[]): HTMLCanvasElement {
  const width = chamber.width * SAMPLES_PER_TILE
  const height = chamber.height * SAMPLES_PER_TILE
  const layer = makeCanvas(width, height)
  const tinted = makeCanvas(width, height)

  for (const part of parts) {
    const shares = tinted.context.createImageData(width, height)

    for (let down = 0; down < height; down++) {
      for (let across = 0; across < width; across++) {
        const sample = (down * width) + across
        const share = part.share((across + 0.5) / SAMPLES_PER_TILE, (down + 0.5) / SAMPLES_PER_TILE, sample)

        shares.data[(sample * 4) + 3] = Math.round(clampShare(share) * 255)
      }
    }

    // The part's colour, only as opaque as each sample's share of it
    tinted.context.globalCompositeOperation = 'source-over'
    tinted.context.putImageData(shares, 0, 0)
    tinted.context.globalCompositeOperation = 'source-in'
    tinted.context.fillStyle = part.colour
    tinted.context.fillRect(0, 0, width, height)
    layer.context.drawImage(tinted.canvas, 0, 0)
  }

  return layer.canvas
}

/**
 * Stretches a soft layer over the whole chamber, smoothed.
 * @param painter - Paints on the canvas
 * @param chamber - The chamber
 * @param layer - The layer, from paintSoftLayer()
 * @param paintedOnly - Whether it shows only where the canvas is already painted, as on the walls' own layer
 */
function stretchSoftLayer(painter: TilePainter, chamber: CompiledChamber, layer: HTMLCanvasElement, paintedOnly: boolean): void {
  // A frame on the chamber's top left corner, with x to the right and y down
  painter.drawInFrame(0, chamber.height, Direction.UP, (ctx, tileSize) => {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'low'

    if (paintedOnly) {
      ctx.globalCompositeOperation = 'source-atop'
    }

    ctx.drawImage(layer, 0, 0, chamber.width * tileSize, chamber.height * tileSize)
  })
}

/**
 * Shades each floor tile a little apart from the next, somewhere between a
 * cooler and a warmer tint: most near the middle shade, a few clearly
 * darker, like a panel replaced later.
 * @param painter - Paints on the canvas
 * @param chamber - The chamber
 * @param seed - The chamber's number, from chamberSeed()
 */
function shadeFloorTiles(painter: TilePainter, chamber: CompiledChamber, seed: number): void {
  // A frame on the chamber's top left corner, with x to the right and y down
  painter.drawInFrame(0, chamber.height, Direction.UP, (ctx, tileSize) => {
    for (let y = 0; y < chamber.height; y++) {
      for (let x = 0; x < chamber.width; x++) {
        if (chamber.isWall(x, y)) {
          continue
        }

        const middling = (tileNumber(seed, x, y, TILE_SHADE_SALT) + tileNumber(seed, x, y, TILE_SHADE_SALT + 1) + tileNumber(seed, x, y, TILE_SHADE_SALT + 2)) / 3
        const odd = tileNumber(seed, x, y, TILE_SHADE_SALT + 3) < ODD_TILES
        const depth = odd ? ODD_SHADE_LEAST + (ODD_SHADE_RANGE * tileNumber(seed, x, y, TILE_SHADE_SALT + 4)) : clampShare((middling - SHADE_FROM) / SHADE_SPAN)
        const warmth = tileNumber(seed, x, y, TILE_SHADE_SALT + 5)
        const left = x * tileSize
        const top = (chamber.height - 1 - y) * tileSize

        ctx.fillStyle = withAlpha(PALETTE.floorShadeCool, TILE_SHADE * depth * (1 - warmth))
        ctx.fillRect(left, top, tileSize, tileSize)
        ctx.fillStyle = withAlpha(PALETTE.floorShadeWarm, TILE_SHADE * depth * warmth)
        ctx.fillRect(left, top, tileSize, tileSize)
      }
    }
  })
}

/**
 * Draws the floor's tones over the floor already drawn: each tile's shade,
 * then, as one soft layer, the darker patches, the floor darkening towards
 * the walls and lifted in the open, and the grime along the walls.
 * @param painter - Paints on the canvas, the floor drawn on it
 * @param chamber - The chamber
 * @throws Error when a canvas cannot provide a 2D context
 */
export function drawFloorTone(painter: TilePainter, chamber: CompiledChamber): void {
  const seed = chamberSeed(chamber)

  shadeFloorTiles(painter, chamber, seed)
  stretchSoftLayer(painter, chamber, keptSoftLayer('floor', chamber, seed, () => {
    const distances = wallDistances(chamber)
    const distanceAt = (sample: number): number => distances[sample] ?? Number.POSITIVE_INFINITY
    const patches = cloudNoise(seed, PATCH_SALT, chamber.width / PATCH_SPAN, chamber.height / PATCH_SPAN)
    const blotches = cloudNoise(seed, GRIME_SALT, chamber.width * GRIME_FINENESS, chamber.height * GRIME_FINENESS)

    return paintSoftLayer(chamber, [
      {
        colour: withAlpha(PALETTE.floorPatch, PATCH_SHADE),
        share: (across, down) => smoothStep(PATCH_FROM, 1, patches(across / PATCH_SPAN, down / PATCH_SPAN)),
      },
      {
        colour: withAlpha(PALETTE.floorWallShade, WALL_SHADE),
        share: (_across, _down, sample) => Math.exp(-distanceAt(sample) / WALL_SHADE_REACH),
      },
      {
        colour: withAlpha(PALETTE.surfaceLight, OPEN_LIFT),
        share: (_across, _down, sample) => smoothStep(OPEN_LIFT_FROM, OPEN_LIFT_FULL, distanceAt(sample)),
      },
      {
        colour: withAlpha(PALETTE.floorGrime, GRIME_SHADE),
        share: (across, down, sample) => (1 - smoothStep(GRIME_FROM, GRIME_REACH, distanceAt(sample))) * (GRIME_EVEN + ((1 - GRIME_EVEN) * blotches(across * GRIME_FINENESS, down * GRIME_FINENESS))),
      },
    ])
  }), false)
}

/**
 * Whether a tile inside the chamber holds a wall. Outside the chamber
 * counts as open, as it does where walls join.
 * @param chamber - The chamber
 * @param x - Column
 * @param y - Row
 * @returns True on a wall tile inside the chamber
 */
function isWallInside(chamber: CompiledChamber, x: number, y: number): boolean {
  return (x >= 0) && (y >= 0) && (x < chamber.width) && (y < chamber.height) && chamber.isWall(x, y)
}

/**
 * Whether a tile holds a plain wall, whose top takes the surface detail: a
 * wall inside the chamber that is not a blocked wall, whose steel is left
 * as it is.
 * @param chamber - The chamber
 * @param x - Column
 * @param y - Row
 * @returns True on a plain wall tile
 */
export function isPlainWall(chamber: CompiledChamber, x: number, y: number): boolean {
  return isWallInside(chamber, x, y) && (chamber.elementAt('blockedWall', x, y) === NO_ELEMENT)
}

/**
 * The flat top of a plain wall tile, inside its sloped edges, as the
 * rectangles it is made of: its middle always, a side where a wall carries
 * on there, and a corner where walls fill all three tiles round it (docs/sprites.md, joins).
 * @param chamber - The chamber
 * @param x - Column
 * @param y - Row
 * @param tileSize - Side of a tile, in pixels
 * @returns Its rectangles, none for a tile that is not a plain wall
 */
export function wallTopParts(chamber: CompiledChamber, x: number, y: number, tileSize: number): TopPart[] {
  if (!isPlainWall(chamber, x, y)) {
    return []
  }

  const edge = Math.round(tileSize * WALL_EDGE)
  const bounds = [
    0,
    edge,
    tileSize - edge,
    tileSize,
  ]
  const left = x * tileSize
  const top = (chamber.height - 1 - y) * tileSize
  const parts: TopPart[] = []

  for (let down = -1; down <= 1; down++) {
    for (let across = -1; across <= 1; across++) {
      // Rows grow upwards, the canvas's y downwards
      const flat = ((across === 0) || isWallInside(chamber, x + across, y)) && ((down === 0) || isWallInside(chamber, x, y - down)) && ((across === 0) || (down === 0) || isWallInside(chamber, x + across, y - down))
      const partLeft = bounds[across + 1] ?? 0
      const partTop = bounds[down + 1] ?? 0

      if (flat) {
        parts.push({
          left: left + partLeft,
          top: top + partTop,
          width: (bounds[across + 2] ?? tileSize) - partLeft,
          height: (bounds[down + 2] ?? tileSize) - partTop,
        })
      }
    }
  }

  return parts
}

/**
 * Shades each plain wall's flat top a little lighter or darker than the
 * next, so a run of wall reads as plates; its sloped edges are left alone.
 * @param painter - Paints on the canvas
 * @param chamber - The chamber
 * @param seed - The chamber's number, from chamberSeed()
 */
function shadeWallPlates(painter: TilePainter, chamber: CompiledChamber, seed: number): void {
  // A frame on the chamber's top left corner, with x to the right and y down
  painter.drawInFrame(0, chamber.height, Direction.UP, (ctx, tileSize) => {
    for (let y = 0; y < chamber.height; y++) {
      for (let x = 0; x < chamber.width; x++) {
        const lean = ((tileNumber(seed, x, y, PLATE_SALT) + tileNumber(seed, x, y, PLATE_SALT + 1) + tileNumber(seed, x, y, PLATE_SALT + 2)) / 3) - 0.5
        const depth = PLATE_SHADE * clampShare(Math.abs(lean) / PLATE_SPAN)

        ctx.fillStyle = (lean > 0) ? withAlpha(PALETTE.surfaceLight, depth * PLATE_LIGHT_SHARE) : withAlpha(PALETTE.surfaceDark, depth)

        for (const part of wallTopParts(chamber, x, y, tileSize)) {
          ctx.fillRect(part.left, part.top, part.width, part.height)
        }
      }
    }
  })
}

/**
 * Draws the walls' tones over the walls already drawn on their own layer,
 * before their shadow is made: soft lighter and darker patches across
 * every wall, then each plain wall's top as a plate of its own shade.
 * @param painter - Paints on the walls' layer, the walls drawn on it
 * @param chamber - The chamber
 * @throws Error when a canvas cannot provide a 2D context
 */
export function drawWallTone(painter: TilePainter, chamber: CompiledChamber): void {
  const seed = chamberSeed(chamber)

  stretchSoftLayer(painter, chamber, keptSoftLayer('walls', chamber, seed, () => {
    const patches = cloudNoise(seed, WALL_PATCH_SALT, chamber.width / WALL_PATCH_SPAN, chamber.height / WALL_PATCH_SPAN)
    // How far a spot leans lighter (above 0) or darker (below it), from -1 to 1
    const levelAt = (across: number, down: number): number => (patches(across / WALL_PATCH_SPAN, down / WALL_PATCH_SPAN) - 0.5) * 2

    return paintSoftLayer(chamber, [
      {
        colour: withAlpha(PALETTE.surfaceDark, WALL_PATCH_SHADE),
        share: (across, down) => -levelAt(across, down),
      },
      {
        colour: withAlpha(PALETTE.surfaceLight, WALL_PATCH_SHADE * WALL_PATCH_LIGHT_SHARE),
        share: (across, down) => levelAt(across, down),
      },
    ])
  }), true)
  shadeWallPlates(painter, chamber, seed)
}
