import type {Direction} from '@/game/direction'
import {gapTurn} from '@/game/element_drawings'
import {CARRIED_BOX_AHEAD, PORTAL_SPRITES} from '@/game/renderer'
import {PORTAL_COLORS} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {NO_BOX} from '@/game/rules/state_layout'
import {DELTAS} from '@/game/rules/step'
import type {SpriteName} from '@/game/sprite_set'
import type {PiecePlacement, TilePainter} from '@/game/tile_painter'

/**
 * One thing breaking up where it was last drawn: something a fizzle took,
 * or a fizzler switched off.
 */
type Burst = {
  readonly sprite: SpriteName // What breaks up
  readonly x: number // Column of its middle, in tiles
  readonly y: number // Row of its middle, in tiles
  readonly size: number // Its side, as a share of a tile
  readonly way: Direction // The way it was turned to face
  readonly drifts: boolean // Whether its pieces drift out of its middle, or shrink where they are
  readonly fizzler: number | null // The fizzler whose field it is, or null for what a fizzle took
  readonly seed: number // Sets its pieces' paths apart from another burst's
  readonly startTime: number // When it started breaking up, in milliseconds on the frame clock
}

/** How long the pieces take to drift apart and fade, in milliseconds: long enough to read, gone well before the next few presses */
const FIZZLE_MILLISECONDS = 600

/** Pieces across a sprite's tile */
const PIECES_ACROSS = 7

/** How far a piece drifts by the end, on average, as a share of its sprite's side */
const DRIFT_SHARE = 0.5

/** How much a piece's drift varies either way, as a share of the average */
const DRIFT_VARIATION = 0.5

/** How far a piece's path turns from straight out of the middle, either way, in radians */
const PATH_SPREAD = 0.6

/** The latest a piece starts to move, as a share of the whole time, so the sprite comes apart in a ripple rather than all at once */
const LATEST_START = 0.35

/** How small a piece has shrunk by its end, as a share of its size */
const SMALLEST_SCALE = 0.3

/** The latest a piece that stays in place starts to shrink, as a share of the whole time: later than a drifting one, so a field crumbles away bit by bit */
const LATEST_DISSOLVE_START = 0.55

/**
 * A number between 0 and 1 for one piece, the same every frame, so each
 * piece keeps its own path.
 * @param seed - Its burst's seed
 * @param index - The piece's number
 * @param salt - Which of the piece's numbers this is
 * @returns The number, from 0 up to, never reaching, 1
 */
function pieceNumber(seed: number, index: number, salt: number): number {
  let value = Math.imul(seed + 1, 0x9e3779b1) ^ Math.imul(index + 1, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35)

  value = Math.imul(value ^ (value >>> 16), 0x7feb352d)
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b)
  value ^= value >>> 16

  return (value >>> 0) / 4294967296
}

/**
 * Places one piece of a burst part way through: it waits in place until its
 * own start, then drifts out from the sprite's middle, slowing as it goes,
 * shrinking and fading, or, for a burst that doesn't drift, shrinks away to
 * nothing where it is, fading.
 * @param burst - The burst
 * @param progress - How far the whole burst has gone, from 0 to 1
 * @param offsetX - How far right of the sprite's middle the piece lies, in tiles
 * @param offsetY - How far below it, in tiles
 * @param index - The piece's number
 * @returns Where it is drawn, or null once it has faded
 */
function placePiece(burst: Burst, progress: number, offsetX: number, offsetY: number, index: number): PiecePlacement | null {
  const start = (burst.drifts ? LATEST_START : LATEST_DISSOLVE_START) * pieceNumber(burst.seed, index, 0)
  const own = Math.min(Math.max((progress - start) / (1 - start), 0), 1)

  if (own >= 1) {
    return null
  }

  if (!burst.drifts) {
    return {
      dx: 0,
      dy: 0,
      scale: 1 - own,
      alpha: 1 - (own * own),
    }
  }

  // A piece at the very middle has no way out of it, so it takes its own
  const outward = ((offsetX === 0) && (offsetY === 0)) ? 2 * Math.PI * pieceNumber(burst.seed, index, 1) : Math.atan2(offsetY, offsetX)
  const angle = outward + (PATH_SPREAD * ((2 * pieceNumber(burst.seed, index, 2)) - 1))
  const drift = DRIFT_SHARE * burst.size * (1 + (DRIFT_VARIATION * ((2 * pieceNumber(burst.seed, index, 3)) - 1)))
  // Cubic ease-out, like a step's glide: quick at first, then settling
  const travelled = drift * (1 - ((1 - own) ** 3))

  return {
    dx: travelled * Math.cos(angle),
    dy: travelled * Math.sin(angle),
    scale: 1 - ((1 - SMALLEST_SCALE) * own),
    alpha: 1 - (own * own),
  }
}

/**
 * What fizzles took and the fizzlers switched off, drawn breaking up over a
 * short time, each on its own clock: each portal a fizzle closed and a box
 * it destroyed come apart in square pieces of their own sprites, which drift
 * out, shrink and fade, and each fizzler switched off crumbles away where it
 * is, its field's pieces shrinking and fading in place. Purely visual: the
 * rules have already settled the step, and nothing waits for the pieces.
 */
export class FizzleParticles {
  private bursts: readonly Burst[] = [] // What is breaking up, empty when nothing is
  private burstCount = 0 // Bursts started so far, which seeds each new one

  /**
   * Starts breaking up what a step changed, beside anything still breaking
   * up: each fizzler on before it and off after it, and, when the step
   * fizzled, each portal open before it and closed after it, where it was,
   * and a box carried before it and gone after it, where it was carried at
   * the step's end. A fizzler the step switched back on stops crumbling.
   * @param before - The state before the step
   * @param after - The state after the step
   * @param time - Now, in milliseconds on the frame clock
   * @param fizzled - Whether the step fizzled
   */
  start(before: RulesState, after: RulesState, time: number, fizzled: boolean): void {
    const bursts: Burst[] = []

    if (fizzled) {
      for (const color of PORTAL_COLORS) {
        const side = before.portalSide(color)

        if ((side !== null) && (after.portalSide(color) === null)) {
          bursts.push({
            sprite: PORTAL_SPRITES[color],
            x: before.portalX(color) + 0.5,
            y: before.portalY(color) + 0.5,
            size: 1,
            way: side,
            drifts: true,
            fizzler: null,
            seed: this.burstCount++,
            startTime: time,
          })
        }
      }

      if ((before.carriedBox !== NO_BOX) && (after.carriedBox === NO_BOX)) {
        const ahead = DELTAS[after.facing]

        bursts.push({
          sprite: 'box',
          x: after.subjectX + 0.5 + (ahead.dx * CARRIED_BOX_AHEAD),
          y: after.subjectY + 0.5 + (ahead.dy * CARRIED_BOX_AHEAD),
          size: 0.5,
          way: after.facing,
          drifts: true,
          fizzler: null,
          seed: this.burstCount++,
          startTime: time,
        })
      }
    }

    const chamber = after.chamber
    const switchedOn: number[] = []

    for (let i = 0; i < chamber.countOf('fizzler'); i++) {
      const wasOn = before.isBlocked('fizzler', i)
      const isOn = after.isBlocked('fizzler', i)

      if (!wasOn && isOn) {
        switchedOn.push(i)
      }

      if (wasOn && !isOn) {
        const position = chamber.positionOf('fizzler', i)

        bursts.push({
          sprite: 'fizzler_on',
          x: position.x + 0.5,
          y: position.y + 0.5,
          size: 1,
          way: gapTurn(chamber, position.x, position.y),
          drifts: false,
          fizzler: i,
          seed: this.burstCount++,
          startTime: time,
        })
      }
    }

    if ((bursts.length > 0) || (switchedOn.length > 0)) {
      // A field switched back on is whole again, so its crumbling ends at once
      const stillRunning = (burst: Burst): boolean => (time - burst.startTime < FIZZLE_MILLISECONDS) && ((burst.fizzler === null) || !switchedOn.includes(burst.fizzler))

      this.bursts = [
        ...this.bursts.filter(stillRunning),
        ...bursts,
      ]
    }
  }

  /**
   * Ends the breaking up at once, so nothing of it is drawn again.
   */
  clear(): void {
    this.bursts = []
  }

  /**
   * Whether anything is still breaking up at a time. Once the time reaches
   * its end, it is over.
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns True while pieces are left to draw
   */
  isRunningAt(time: number): boolean {
    if (this.bursts.some((burst) => time - burst.startTime >= FIZZLE_MILLISECONDS)) {
      this.bursts = this.bursts.filter((burst) => time - burst.startTime < FIZZLE_MILLISECONDS)
    }

    return this.bursts.length > 0
  }

  /**
   * Draws the pieces as they are at a time.
   * @param painter - Paints on the canvas
   * @param time - The frame's time, in milliseconds on the frame clock
   */
  draw(painter: TilePainter, time: number): void {
    for (const burst of this.bursts) {
      const progress = Math.max(time - burst.startTime, 0) / FIZZLE_MILLISECONDS

      if (progress >= 1) {
        continue
      }

      painter.drawSpritePieces(burst.sprite, burst.x, burst.y, burst.size, burst.way, PIECES_ACROSS, (offsetX, offsetY, index) => placePiece(burst, progress, offsetX, offsetY, index))
    }
  }
}
