import type {Direction} from '@/game/direction'
import {GameEvent} from '@/game/game_event'
import {PORTAL_COLORS, PortalColor} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import type {SpriteName} from '@/game/sprite_set'
import type {TilePainter} from '@/game/tile_painter'

/**
 * Where and when a portal opened.
 */
type Opening = {
  readonly x: number // Column of the wall it opened on
  readonly y: number // Row of that wall
  readonly side: Direction // The side of the wall it opened on
  readonly startTime: number // When it opened, in milliseconds on the frame clock
}

/** How long a portal takes to open, in milliseconds: a little longer than a step's glide */
const OPENING_MILLISECONDS = 200

/** How far through its opening a portal has faded in, as a share of the whole time */
const FADED_IN_BY = 0.2

/** How far an opening portal grows past its size before it settles: a back ease-out's overshoot, which peaks at about 110 % */
const OVERSHOOT = 1.70158

/** How far inside its wall tile the portal's oval has its middle, from the side it opens on, in tiles (art/sprites/portal_blue.svg: 23.5 px of the 256 px tile) */
const OVAL_INSET = 23.5 / 256

/** The event each portal's opening reports */
const OPENED_EVENTS: Readonly<Record<PortalColor, GameEvent>> = {
  [PortalColor.BLUE]: GameEvent.BLUE_PORTAL_OPENED,
  [PortalColor.ORANGE]: GameEvent.ORANGE_PORTAL_OPENED,
}

/**
 * Draws a portal part way open on its wall, from its sprite: grown about
 * its oval's middle, past its size and back, and faded in at first.
 * @param painter - Paints on the canvas
 * @param sprite - The portal's sprite
 * @param x - Column of its wall
 * @param y - Row of its wall
 * @param side - The side of the wall it opens on
 * @param progress - How far it has opened, from 0 (not at all) to 1 (open)
 */
export function drawPortalOpening(painter: TilePainter, sprite: SpriteName, x: number, y: number, side: Direction, progress: number): void {
  const back = progress - 1
  const scale = 1 + ((OVERSHOOT + 1) * (back ** 3)) + (OVERSHOOT * (back ** 2))

  // The sprite is drawn on the top edge of its tile, so its oval lies above the tile's middle
  painter.drawSpriteShrunk(sprite, x + 0.5, y + 0.5, 1, side, scale, progress / FADED_IN_BY, OVAL_INSET - 0.5)
}

/**
 * How strongly a portal part way open glows, as a share of an open
 * portal's glow: rising quickly, then settling.
 * @param progress - How far it has opened, from 0 (not at all) to 1 (open)
 * @returns The share, from 0 to 1
 */
export function openingGlowShare(progress: number): number {
  return 1 - ((1 - progress) ** 3)
}

/**
 * The portals a step opened, drawn opening over a short time: each grows
 * from its oval's middle, a little past its size, and settles, while its
 * glow rises. Purely visual: the rules have already opened the portal, and
 * nothing waits for it. Once a portal moves or closes, its opening is over.
 */
export class PortalOpenings {
  private readonly openings: Record<PortalColor, Opening | null> = {
    [PortalColor.BLUE]: null,
    [PortalColor.ORANGE]: null,
  } // Each portal's latest opening, null when none is running

  /**
   * Starts the opening of each portal a step opened, replacing any still
   * running for that portal.
   * @param after - The state after the step
   * @param events - What happened in the step
   * @param time - Now, in milliseconds on the frame clock
   */
  start(after: RulesState, events: readonly GameEvent[], time: number): void {
    for (const color of PORTAL_COLORS) {
      const side = after.portalSide(color)

      if (events.includes(OPENED_EVENTS[color]) && (side !== null)) {
        this.openings[color] = {
          x: after.portalX(color),
          y: after.portalY(color),
          side: side,
          startTime: time,
        }
      }
    }
  }

  /**
   * Ends every opening at once, so each portal is drawn open.
   */
  clear(): void {
    for (const color of PORTAL_COLORS) {
      this.openings[color] = null
    }
  }

  /**
   * Whether a portal is still opening at a time. Once the time reaches an
   * opening's end, it is over.
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns True while an opening is left to draw
   */
  isRunningAt(time: number): boolean {
    let running = false

    for (const color of PORTAL_COLORS) {
      const opening = this.openings[color]

      if ((opening !== null) && (time - opening.startTime >= OPENING_MILLISECONDS)) {
        this.openings[color] = null
      } else if (opening !== null) {
        running = true
      }
    }

    return running
  }

  /**
   * How far a state's portal has opened at a time, while it is the portal
   * that opened, where it opened.
   * @param state - The state drawn
   * @param color - The portal
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns How far it has opened, from 0 to under 1, or null when it isn't opening and is drawn as it is
   */
  progressAt(state: RulesState, color: PortalColor, time: number): number | null {
    const opening = this.openings[color]

    if (opening === null) {
      return null
    }

    const progress = Math.max(time - opening.startTime, 0) / OPENING_MILLISECONDS

    if (progress >= 1) {
      return null
    }

    // A portal moved or closed since is no longer the one opening
    if ((state.portalSide(color) !== opening.side) || (state.portalX(color) !== opening.x) || (state.portalY(color) !== opening.y)) {
      return null
    }

    return progress
  }
}
