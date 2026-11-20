import {Direction} from '@/game/direction'
import {PALETTE, withAlpha} from '@/game/palette'
import {NO_ELEMENT} from '@/game/rules/compiled_chamber'
import type {RayLine, RayPoint, RayTrace} from '@/game/rules/rays'
import type {RulesState} from '@/game/rules/rules_state'
import type {TilePainter} from '@/game/tile_painter'

// How an emitter's ray is drawn (docs/sprites.md): in code, from the rays
// traced on the state shown, as the game draws a laser's beam (laser_on and
// laser_glow), recoloured pale gold with a dark rim and narrower: a haze
// tinting the floor, a soft edge, then the beam from its rim to its core,
// each band filled once along each straight run, and a glow, held steady,
// added with the other glows. A ray changes at once with the step that cuts
// or frees it, so nothing about it moves with time

/**
 * One straight run of a ray, from one corner of its line to the next, in
 * tiles from the chamber's bottom-left corner.
 */
type RayRun = {
  readonly from: RayPoint // Where it starts
  readonly to: RayPoint // Where it ends, in the same row or column
}

/**
 * One colour of a gradient across a run, at a share of the band's width.
 */
type GradientStop = {
  readonly offset: number // Where across the band, from 0 (one side) to 1 (the other)
  readonly colour: string // Its colour, as rgba()
}

/**
 * One band of a ray, filled along each run with a gradient across it.
 */
type RayBand = {
  readonly halfWidth: number // Half its width, in tiles
  readonly stops: readonly GradientStop[] // Its colours across it
}

/** How much narrower a ray is drawn than a laser's beam: 23 px of 256 against 30 */
const RAY_SCALE = 0.09 / (30 / 256)

/** The least half-width a band is drawn at, in canvas pixels, so a ray still shows on the home menu's map */
const MIN_HALF_WIDTH = 0.6

/** How far short of its tile's middle a ray ends at a light barrier whose band runs across it: the band's rim, in tiles */
const BARRIER_RIM = 50 / 256

/** How strongly the rays' glow is added: held steady, where the lasers' and portals' pulse */
const GLOW_STRENGTH = 0.8

/**
 * A palette colour multiplied by an opacity and drawn opaque, so drawing it
 * with 'lighten' keeps each spot's brightest, as the glow is gathered.
 * @param colour - The colour, as rgba() with its channels
 * @param alpha - The opacity, from 0 to 1
 * @returns The darkened colour, opaque, as rgba()
 */
function premultiplied(colour: string, alpha: number): string {
  const channels = /^rgba\((\d+),\s*(\d+),\s*(\d+),/.exec(colour)
  const scale = (channel: string | undefined): number => Math.round(Number(channel ?? 0) * alpha)

  return `rgba(${scale(channels?.[1])}, ${scale(channels?.[2])}, ${scale(channels?.[3])}, 1)`
}

/**
 * The stops of a band in one colour at several opacities.
 * @param colour - The colour
 * @param offsets - Where each stop lies across the band
 * @param alphas - Each stop's opacity
 * @param paint - Turns the colour and an opacity into the stop's colour
 * @returns The stops
 */
function stopsOf(colour: string, offsets: readonly number[], alphas: readonly number[], paint: (colour: string, alpha: number) => string): readonly GradientStop[] {
  return offsets.map((offset, i) => ({
    offset: offset,
    colour: paint(colour, alphas[i] ?? 0),
  }))
}

/** The haze, tinting the floor around the beam: laser_on's haze in pale gold */
const HAZE: RayBand = {
  halfWidth: (48 / 256) * RAY_SCALE,
  stops: stopsOf(PALETTE.rayBody, [
    0,
    0.15,
    0.3,
    0.5,
    0.7,
    0.85,
    1,
  ], [
    0,
    0.08,
    0.24,
    0.32,
    0.24,
    0.08,
    0,
  ], withAlpha),
}

/** The soft edge, the rim's shade solid across, stronger than a laser's so the pale ray shows on the light floor */
const SOFT_EDGE: RayBand = {
  halfWidth: (17 / 256) * RAY_SCALE,
  stops: [
    {
      offset: 0,
      colour: withAlpha(PALETTE.rayRim, 0.8),
    },
    {
      offset: 1,
      colour: withAlpha(PALETTE.rayRim, 0.8),
    },
  ],
}

/** The beam, opaque, from its dark rim through its body to its white-hot core and back */
const BEAM: RayBand = {
  halfWidth: (15 / 256) * RAY_SCALE,
  stops: [
    {
      offset: 0,
      colour: PALETTE.rayRim,
    },
    {
      offset: 0.25,
      colour: PALETTE.rayBody,
    },
    {
      offset: 0.38,
      colour: PALETTE.rayLight,
    },
    {
      offset: 0.44,
      colour: PALETTE.rayCore,
    },
    {
      offset: 0.56,
      colour: PALETTE.rayCore,
    },
    {
      offset: 0.62,
      colour: PALETTE.rayLight,
    },
    {
      offset: 0.75,
      colour: PALETTE.rayBody,
    },
    {
      offset: 1,
      colour: PALETTE.rayRim,
    },
  ],
}

/** The glow, laser_glow's bell in pale gold, premultiplied to be gathered with 'lighten' */
const GLOW: RayBand = {
  halfWidth: (80 / 256) * RAY_SCALE,
  stops: stopsOf(PALETTE.rayBody, [
    0,
    0.15,
    0.3,
    0.4,
    0.46,
    0.5,
    0.54,
    0.6,
    0.7,
    0.85,
    1,
  ], [
    0,
    0.03,
    0.12,
    0.3,
    0.47,
    0.55,
    0.47,
    0.3,
    0.12,
    0.03,
    0,
  ], premultiplied),
}

/**
 * Where a line of a ray is drawn ending: where the rules end it, but at a
 * light barrier whose band runs across it, at the band's near rim, inside
 * the tile, rather than at the tile's edge.
 * @param state - The state drawn
 * @param line - The line
 * @param last - The point the rules end it at
 * @returns The point it is drawn ending at
 */
function drawnEnd(state: RulesState, line: RayLine, last: RayPoint): RayPoint {
  if (line.end !== 'element') {
    return last
  }

  const chamber = state.chamber
  const index = chamber.elementAt('lightBarrier', line.endX, line.endY)
  const across = (line.way === Direction.UP) || (line.way === Direction.DOWN) ? 'H' : 'V'

  if ((index === NO_ELEMENT) || (chamber.entriesOf('lightBarrier')[index]?.direction !== across)) {
    return last
  }

  const reach = 0.5 - BARRIER_RIM
  const dx = (line.way === Direction.RIGHT) ? reach : ((line.way === Direction.LEFT) ? -reach : 0)
  const dy = (line.way === Direction.UP) ? reach : ((line.way === Direction.DOWN) ? -reach : 0)

  return {
    x: last.x + dx,
    y: last.y + dy,
  }
}

/**
 * Every straight run of the rays in a trace, line by line, as they are
 * drawn.
 * @param state - The state drawn
 * @param trace - The rays traced on it
 * @returns The runs
 */
export function rayRuns(state: RulesState, trace: RayTrace): readonly RayRun[] {
  const runs: RayRun[] = []

  for (const line of trace.lines) {
    for (let i = 1; i < line.points.length; i++) {
      const from = line.points[i - 1]
      const corner = line.points[i]

      if ((from === undefined) || (corner === undefined)) {
        continue
      }

      runs.push({
        from: from,
        to: (i === line.points.length - 1) ? drawnEnd(state, line, corner) : corner,
      })
    }
  }

  return runs
}

/**
 * Fills one band along each run, a rectangle as long as the run with its
 * gradient across it, in a frame whose origin is the chamber's bottom-left
 * corner, rows growing upwards.
 * @param ctx - The canvas's context, in that frame
 * @param tileSize - Side of a tile, in pixels
 * @param runs - The runs
 * @param band - The band
 */
function fillBand(ctx: CanvasRenderingContext2D, tileSize: number, runs: readonly RayRun[], band: RayBand): void {
  const half = Math.max(band.halfWidth * tileSize, MIN_HALF_WIDTH)

  for (const run of runs) {
    const left = Math.min(run.from.x, run.to.x) * tileSize
    const right = Math.max(run.from.x, run.to.x) * tileSize
    const top = -Math.max(run.from.y, run.to.y) * tileSize
    const bottom = -Math.min(run.from.y, run.to.y) * tileSize
    const along = (run.from.y === run.to.y) ? 'row' : 'column'
    const gradient = (along === 'row') ?
      ctx.createLinearGradient(0, top - half, 0, top + half) :
      ctx.createLinearGradient(left - half, 0, left + half, 0)

    for (const stop of band.stops) {
      gradient.addColorStop(stop.offset, stop.colour)
    }

    ctx.fillStyle = gradient

    if (along === 'row') {
      ctx.fillRect(left, top - half, right - left, 2 * half)
    } else {
      ctx.fillRect(left - half, top, 2 * half, bottom - top)
    }
  }
}

/**
 * Draws the rays: every run's haze, then every run's soft edge, then every
 * run's beam, so crossing rays layer cleanly.
 * @param painter - Paints on the canvas
 * @param runs - The runs, from rayRuns()
 */
export function drawRays(painter: TilePainter, runs: readonly RayRun[]): void {
  if (runs.length === 0) {
    return
  }

  painter.drawInFrame(0, 0, Direction.UP, (ctx, tileSize) => {
    fillBand(ctx, tileSize, runs, HAZE)
    fillBand(ctx, tileSize, runs, SOFT_EDGE)
    fillBand(ctx, tileSize, runs, BEAM)
  })
}

/**
 * Paints the rays' glow on a layer of its own, cleared first: each run's
 * bell, cut square where the run ends, gathered with 'lighten' so each spot
 * keeps its brightest, and a corner or a crossing isn't lit twice.
 * @param layer - The layer, from createLayer(), the size of the canvas
 * @param runs - The runs, from rayRuns()
 */
export function paintRayGlows(layer: TilePainter, runs: readonly RayRun[]): void {
  layer.drawInFrame(0, 0, Direction.UP, (ctx, tileSize) => {
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.restore()
    ctx.globalCompositeOperation = 'lighten'
    fillBand(ctx, tileSize, runs, GLOW)
  })
}

/**
 * Adds the rays' glow, painted on its layer, to what lies beneath, held
 * steady.
 * @param painter - Paints on the canvas
 * @param layer - The layer the glow is painted on, from paintRayGlows()
 */
export function drawRayGlows(painter: TilePainter, layer: TilePainter): void {
  painter.drawLayerAdded(layer, GLOW_STRENGTH)
}
