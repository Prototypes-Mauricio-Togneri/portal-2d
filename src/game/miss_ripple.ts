import {DELTAS, type Direction} from '@/game/direction'
import {PALETTE} from '@/game/palette'
import {NO_ELEMENT} from '@/game/rules/compiled_chamber'
import {PortalColor} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {shotStop, stopsShot} from '@/game/rules/step'
import type {TilePainter} from '@/game/tile_painter'

/**
 * Where a missed shot stopped, the way it flew and its colour.
 */
type Impact = {
  readonly x: number // Column of the point where it stopped, in tiles
  readonly y: number // Row of that point, in tiles
  readonly way: Direction // The way the shot flew
  readonly color: string // Its portal's colour
}

/** How long the ripple lasts, in milliseconds: until its last ring has faded */
const RIPPLE_MILLISECONDS = 520

/** How long the face the shot met stays lit, fading, in milliseconds */
const FACE_MILLISECONDS = 280

/** Half the lit face's length, as a share of a tile: about a portal's, short of the tile's corners */
const FACE_HALF_LENGTH = 0.42

/** The lit face's width, as a share of a tile */
const FACE_WIDTH = 0.05

/** Rings spreading back towards the subject */
const RING_COUNT = 2

/** How long after the ring before it each ring starts, in milliseconds */
const RING_DELAY = 90

/** How long each ring spreads and fades, in milliseconds */
const RING_MILLISECONDS = 420

/** A ring's half length along the face as it starts, as a share of a tile */
const RING_ALONG_START = 0.1

/** How much a ring's half length along the face grows, as a share of a tile, so it stays within the lit face */
const RING_ALONG_GROWTH = 0.3

/** How far a ring reaches back towards the subject as it starts, as a share of a tile */
const RING_BACK_START = 0.06

/** How much that reach grows, as a share of a tile */
const RING_BACK_GROWTH = 0.22

/** A ring's width as it starts, beyond its last width, as a share of a tile, thinning as it spreads */
const RING_WIDTH_START = 0.045

/** A ring's width as it ends, as a share of a tile */
const RING_WIDTH_END = 0.01

/** How sharply a ring fades: above 1, it stays bright early and fades late */
const RING_FADE_POWER = 1.4

/** How far into a wall's tile the ripple sits, as a share of a tile: where a portal's oval would open */
const WALL_INSET = 0.125

/** How far into an element's tile: at its near edge, since a door, the exit and a fizzler fill their tile */
const ELEMENT_INSET = 0.06

/** How far into a light barrier's tile when its band runs across the shot: the band's near face, 80 px into the 256 px sprite */
const BAND_INSET = 80 / 256

/** How far into the tile just outside the chamber: a little short of it, inside the doorway the shot left through */
const OUTSIDE_INSET = -0.09

/** Each portal's ripple colour */
const RIPPLE_COLORS: Readonly<Record<PortalColor, string>> = {
  [PortalColor.BLUE]: PALETTE.missBlue,
  [PortalColor.ORANGE]: PALETTE.missOrange,
}

/**
 * How far into the tile where a shot stopped its ripple sits, from the
 * tile's side the shot met: on a wall where a portal would open, on an
 * element at its near edge, or on a light barrier's band, and just inside
 * the doorway when the shot left the chamber.
 * @param state - The state the shot was taken in
 * @param x - Column where it stopped, which can be just outside the chamber
 * @param y - Row where it stopped
 * @param way - The way it flew
 * @returns The inset, as a share of a tile
 */
function insetOf(state: RulesState, x: number, y: number, way: Direction): number {
  const chamber = state.chamber

  if ((x < 0) || (y < 0) || (x >= chamber.width) || (y >= chamber.height)) {
    return OUTSIDE_INSET
  }

  // A shot ends on what stops it or on a wall, so a tile that stops none is a wall
  if (!stopsShot(state, x, y)) {
    return WALL_INSET
  }

  // A floor tile holds one element at most, so a light barrier there is what stopped the shot
  const lightBarrier = chamber.elementAt('lightBarrier', x, y)
  const band = (lightBarrier === NO_ELEMENT) ? undefined : chamber.entriesOf('lightBarrier')[lightBarrier]?.direction
  // A band running across the shot is met on its face; one running along it, at its end on the tile's edge
  const across = (DELTAS[way].dx === 0) ? 'H' : 'V'

  return (band === across) ? BAND_INSET : ELEMENT_INSET
}

/**
 * A ripple where the latest missed portal shot stopped, drawn by code in its
 * portal's colour over a short time: the face it met lights up and fades,
 * and two thin half rings spread back towards the subject, one after the
 * other, and fade. Purely visual: the rules have already refused the shot,
 * and nothing waits for the ripple.
 */
export class MissRipple {
  private impact: Impact | null = null // Where the latest miss stopped, null when nothing is drawn
  private startTime = 0 // When the miss was taken, in milliseconds on the frame clock

  /**
   * Starts a ripple where a shot of a colour, taken in a state and missed,
   * stopped, replacing any still spreading.
   * @param state - The state the shot was taken in, which the miss left unchanged
   * @param color - The shot's colour
   * @param time - Now, in milliseconds on the frame clock
   */
  start(state: RulesState, color: PortalColor, time: number): void {
    const way = state.facing
    const stop = shotStop(state, state.subjectX, state.subjectY, way)
    const delta = DELTAS[way]
    // From the stop tile's middle back to the side the shot met, then into the tile
    const back = insetOf(state, stop.x, stop.y, way) - 0.5

    this.impact = {
      x: stop.x + 0.5 + (delta.dx * back),
      y: stop.y + 0.5 + (delta.dy * back),
      way: way,
      color: RIPPLE_COLORS[color],
    }
    this.startTime = time
  }

  /**
   * Ends the ripple at once, so nothing of it is drawn again.
   */
  clear(): void {
    this.impact = null
  }

  /**
   * Whether a ripple is still spreading at a time. Once the time reaches its
   * end, it is over.
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns True while there is a ripple to draw
   */
  isRunningAt(time: number): boolean {
    if ((this.impact !== null) && (time - this.startTime >= RIPPLE_MILLISECONDS)) {
      this.impact = null
    }

    return this.impact !== null
  }

  /**
   * Draws the ripple as it is at a time, in a frame facing the way the shot
   * flew: the face it met runs across, and the subject lies below.
   * @param painter - Paints on the canvas
   * @param time - The frame's time, in milliseconds on the frame clock
   */
  draw(painter: TilePainter, time: number): void {
    const impact = this.impact
    const elapsed = Math.max(time - this.startTime, 0)

    if ((impact === null) || (elapsed >= RIPPLE_MILLISECONDS)) {
      return
    }

    painter.drawInFrame(impact.x, impact.y, impact.way, (ctx, tileSize) => {
      const faceAlpha = 1 - (elapsed / FACE_MILLISECONDS)

      ctx.strokeStyle = impact.color
      ctx.lineCap = 'round'

      if (faceAlpha > 0) {
        ctx.globalAlpha = faceAlpha
        ctx.lineWidth = FACE_WIDTH * tileSize
        ctx.beginPath()
        ctx.moveTo(-FACE_HALF_LENGTH * tileSize, 0)
        ctx.lineTo(FACE_HALF_LENGTH * tileSize, 0)
        ctx.stroke()
      }

      for (let ring = 0; ring < RING_COUNT; ring++) {
        const progress = (elapsed - (ring * RING_DELAY)) / RING_MILLISECONDS

        if ((progress < 0) || (progress >= 1)) {
          continue
        }

        // Cubic ease-out, like a step's glide: quick at first, then settling
        const spread = 1 - ((1 - progress) ** 3)

        ctx.globalAlpha = (1 - progress) ** RING_FADE_POWER
        ctx.lineWidth = ((RING_WIDTH_START * (1 - progress)) + RING_WIDTH_END) * tileSize
        ctx.beginPath()
        // The half on the subject's side, below in this frame
        ctx.ellipse(0, 0, (RING_ALONG_START + (RING_ALONG_GROWTH * spread)) * tileSize, (RING_BACK_START + (RING_BACK_GROWTH * spread)) * tileSize, 0, 0, Math.PI)
        ctx.stroke()
      }
    })
  }
}
