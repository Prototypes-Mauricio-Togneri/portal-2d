import {findDestroyedBoxes} from '@/game/destroyed_boxes'
import {DELTAS, type Direction} from '@/game/direction'
import {GameEvent} from '@/game/game_event'
import {pieceNumber} from '@/game/piece_number'
import {CARRIED_BOX_AHEAD, PORTAL_SPRITES} from '@/game/renderer'
import {PORTAL_COLORS} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {NO_BOX} from '@/game/rules/state_layout'
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
const PIECES_ACROSS = 9

/** How far a piece drifts by the end, on average, as a share of its sprite's side: a short way, so the pieces stay by what broke up */
const DRIFT_SHARE = 0.15

/** How much a piece's drift varies either way, as a share of the average */
const DRIFT_VARIATION = 0.3

/** How far a piece's path turns from straight out of the middle, either way, in radians */
const PATH_SPREAD = 0.6

/** The latest a piece starts to move, as a share of the whole time, so the sprite comes apart in a ripple rather than all at once */
const LATEST_START = 0.35

/** How small a piece has shrunk by its end, as a share of its size */
const SMALLEST_SCALE = 0.3

/** How far through its own time a piece has rounded off into a dot, as a share of that time */
const ROUNDED_BY = 0.25

/**
 * Places one piece of a burst part way through: it waits in place until its
 * own start, then drifts a short way out from the sprite's middle, slowing as
 * it goes, rounding off into a dot, shrinking and fading.
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
    roundness: Math.min(own / ROUNDED_BY, 1),
  }
}

/**
 * What the latest fizzle took, drawn breaking up over a short time: each
 * portal it closed and a box it destroyed, and each box a door, a laser, a
 * light barrier or a fizzler destroyed by closing or switching on where it
 * lay, come apart in pieces of their own sprites, which round off into dots as they drift a short way out, shrink
 * and fade. Purely visual: the rules have already settled the step, and
 * nothing waits for the pieces.
 */
export class FizzleParticles {
  private bursts: readonly Burst[] = [] // What is breaking up, empty when nothing is
  private startTime = 0 // When the breaking up started, in milliseconds on the frame clock
  private burstCount = 0 // Bursts started so far, which seeds each new one

  /**
   * Starts breaking up what a step's fizzlers took. When the subject was
   * caught in a field (fizzled): each portal open before it and closed after
   * it, where it was, and a box carried before it and gone after it, unless
   * it was put down, where it was carried at the step's end. Otherwise only each portal a fizzler
   * closed by switching on: one closed in the step whose wall side faced a
   * fizzler that is on after it, so a portal a blocked wall closed in the
   * same step still just vanishes. And each box destroyed where it lay or
   * was put down (boxDestroyed), but one that fell into a ditch. Replaces
   * anything still breaking up, unless the step took nothing.
   * @param before - The state before the step
   * @param after - The state after the step
   * @param events - What happened in the step
   * @param time - Now, in milliseconds on the frame clock
   */
  start(before: RulesState, after: RulesState, events: readonly GameEvent[], time: number): void {
    const bursts: Burst[] = []
    const subjectFizzled = events.includes(GameEvent.FIZZLED)

    for (const color of PORTAL_COLORS) {
      const side = before.portalSide(color)

      if ((side === null) || (after.portalSide(color) !== null)) {
        continue
      }

      const facedX = before.portalX(color) + DELTAS[side].dx
      const facedY = before.portalY(color) + DELTAS[side].dy

      if (subjectFizzled || after.isBlockedAt('fizzler', facedX, facedY)) {
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

    // A box put down in the step was let go before the field could take it,
    // even when a button it landed on switched the field on under the subject
    if (subjectFizzled && (before.carriedBox !== NO_BOX) && (after.carriedBox === NO_BOX) && (!events.includes(GameEvent.BOX_PUT_DOWN))) {
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

    for (const box of findDestroyedBoxes(before, after, events)) {
      if (!box.fell) {
        bursts.push({
          sprite: 'box',
          x: box.x,
          y: box.y,
          size: box.size,
          way: box.way,
          seed: this.burstCount++,
        })
      }
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
