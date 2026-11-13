import type {Direction} from '@/game/direction'
import {pieceNumber} from '@/game/piece_number'
import {CARRIED_BOX_AHEAD, PORTAL_SPRITES} from '@/game/renderer'
import {PORTAL_COLORS} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {NO_BOX} from '@/game/rules/state_layout'
import {DELTAS} from '@/game/rules/step'
import type {SpriteName} from '@/game/sprite_set'
import type {PiecePlacement, TilePainter} from '@/game/tile_painter'

/**
 * One thing a fizzle took, breaking up where it was last drawn.
 */
type Burst = {
  readonly sprite: SpriteName // What breaks up
  readonly x: number // Column of its middle, in tiles
  readonly y: number // Row of its middle, in tiles
  readonly size: number // Its side, as a share of a tile
  readonly way: Direction // The way it was turned to face
  readonly seed: number // Sets its pieces' paths apart from another burst's
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

/**
 * Places one piece of a burst part way through: it waits in place until its
 * own start, then drifts out from the sprite's middle, slowing as it goes,
 * shrinking and fading.
 * @param burst - The burst
 * @param progress - How far the whole burst has gone, from 0 to 1
 * @param offsetX - How far right of the sprite's middle the piece lies, in tiles
 * @param offsetY - How far below it, in tiles
 * @param index - The piece's number
 * @returns Where it is drawn, or null once it has faded
 */
function placePiece(burst: Burst, progress: number, offsetX: number, offsetY: number, index: number): PiecePlacement | null {
  const start = LATEST_START * pieceNumber(burst.seed, index, 0)
  const own = Math.min(Math.max((progress - start) / (1 - start), 0), 1)

  if (own >= 1) {
    return null
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
 * What the latest fizzle took, drawn breaking up over a short time: each
 * portal it closed and a box it destroyed come apart in square pieces of
 * their own sprites, which drift out, shrink and fade. Purely visual: the
 * rules have already settled the step, and nothing waits for the pieces.
 */
export class FizzleParticles {
  private bursts: readonly Burst[] = [] // What is breaking up, empty when nothing is
  private startTime = 0 // When the breaking up started, in milliseconds on the frame clock
  private burstCount = 0 // Bursts started so far, which seeds each new one

  /**
   * Starts breaking up what a step that fizzled took: each portal open
   * before it and closed after it, where it was, and a box carried before it
   * and gone after it, where it was carried at the step's end. Replaces
   * anything still breaking up, unless the step took nothing.
   * @param before - The state before the step
   * @param after - The state after the step
   * @param time - Now, in milliseconds on the frame clock
   */
  start(before: RulesState, after: RulesState, time: number): void {
    const bursts: Burst[] = []

    for (const color of PORTAL_COLORS) {
      const side = before.portalSide(color)

      if ((side !== null) && (after.portalSide(color) === null)) {
        bursts.push({
          sprite: PORTAL_SPRITES[color],
          x: before.portalX(color) + 0.5,
          y: before.portalY(color) + 0.5,
          size: 1,
          way: side,
          seed: this.burstCount++,
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
        seed: this.burstCount++,
      })
    }

    if (bursts.length > 0) {
      this.bursts = bursts
      this.startTime = time
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
    if ((this.bursts.length > 0) && (time - this.startTime >= FIZZLE_MILLISECONDS)) {
      this.bursts = []
    }

    return this.bursts.length > 0
  }

  /**
   * Draws the pieces as they are at a time.
   * @param painter - Paints on the canvas
   * @param time - The frame's time, in milliseconds on the frame clock
   */
  draw(painter: TilePainter, time: number): void {
    const progress = Math.max(time - this.startTime, 0) / FIZZLE_MILLISECONDS

    if (progress >= 1) {
      return
    }

    for (const burst of this.bursts) {
      painter.drawSpritePieces(burst.sprite, burst.x, burst.y, burst.size, burst.way, PIECES_ACROSS, (offsetX, offsetY, index) => placePiece(burst, progress, offsetX, offsetY, index))
    }
  }
}
