import type {PositionData} from '@/game/chamber_data'
import {DELTAS, type Direction} from '@/game/direction'
import {GameEvent} from '@/game/game_event'
import {PORTAL_COLORS, PortalColor} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {OPPOSITES} from '@/game/rules/portals'
import type {SlideLeg} from '@/game/rules/step'
import {legUnits, slideUnits, type StepTransition} from '@/game/step_animation'

/**
 * Where the subject is drawn in a frame: its tile, part way between two
 * while a step is being drawn, the way it faces, and the one tile it shows
 * inside while it slides through a portal.
 */
export type SubjectPose = {
  readonly x: number // Column, part way between two while it glides
  readonly y: number // Row, part way between two while it glides
  readonly facing: Direction // The way it faces
  readonly clip: PositionData | null // The tile it shows only inside, or null to show it whole
}

/**
 * Where the subject is drawn in a frame. Part way through a step that moved
 * it one tile, it glides from the tile it left to the tile it reached.
 * Through a portal, it slides into the entry portal, shown only inside the
 * tile it left, then out of the exit portal, shown only inside the tile it
 * reached, each half one tile's travel at the pace of a glide. Along a
 * slide, it goes the same way leg by leg, gliding onto each tile and passing
 * through each portal on its path. The distance still to go is rounded to
 * whole canvas pixels, so its edges stay sharp. Every other step, and a
 * frame drawing no step, shows it where it stands.
 * @param state - The state drawn
 * @param transition - The step being drawn, ending on the state drawn, or null
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The pose
 */
export function subjectPose(state: RulesState, transition: StepTransition | null, tileSize: number): SubjectPose {
  const rest: SubjectPose = {
    x: state.subjectX,
    y: state.subjectY,
    facing: state.facing,
    clip: null,
  }

  if ((transition === null) || (transition.to !== state)) {
    return rest
  }

  const from = transition.from

  if (transition.path.length > 0) {
    return slidePose(from, transition.path, transition.progress * slideUnits(transition.path), tileSize) ?? rest
  }

  if (transition.events.includes(GameEvent.CROSSED)) {
    return crossingPose(from, state, transition.progress, tileSize) ?? rest
  }

  return glidePose(from, state, 1 - transition.progress, tileSize) ?? rest
}

/**
 * Where the subject is drawn part way along a slide: on the leg it has got
 * to, gliding onto that leg's tile from the one before it, or passing
 * through a portal onto it (crossingPose).
 * @param from - The state before the step
 * @param path - Each tile the slide entered, in order, at least one
 * @param travelled - How far along the path the drawing has gone, in units (legUnits)
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The pose, or null when a leg doesn't follow on from the tile before it
 */
function slidePose(from: RulesState, path: readonly SlideLeg[], travelled: number, tileSize: number): SubjectPose | null {
  let before = from
  let unitsBefore = 0

  for (const [
    index,
    leg,
  ] of path.entries()) {
    const units = legUnits(leg)

    if ((travelled < (unitsBefore + units)) || (index === (path.length - 1))) {
      const along = Math.min(Math.max(travelled - unitsBefore, 0), units)

      return leg.crossed ? crossingPose(before, leg.state, along / units, tileSize) : glidePose(before, leg.state, units - along, tileSize)
    }

    unitsBefore += units
    before = leg.state
  }

  return null
}

/**
 * Where the subject is drawn part way through gliding one tile, from where
 * it stands in one state to where it stands in the next, facing the way it
 * faces there.
 * @param from - The state it glides from
 * @param to - The state it glides to, on the next tile
 * @param remaining - How much of the tile it still has to go, from 0 to 1
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The pose, or null when the two tiles aren't next to each other
 */
function glidePose(from: RulesState, to: RulesState, remaining: number, tileSize: number): SubjectPose | null {
  const dx = to.subjectX - from.subjectX
  const dy = to.subjectY - from.subjectY

  if ((Math.abs(dx) + Math.abs(dy)) !== 1) {
    return null
  }

  const behind = toWholePixels(remaining, tileSize)

  return {
    x: to.subjectX - (dx * behind),
    y: to.subjectY - (dy * behind),
    facing: to.facing,
    clip: null,
  }
}

/**
 * Where the subject is drawn part way through a portal crossing: two tiles'
 * travel, the first into the entry portal's wall, facing it, the second out
 * of the exit portal's wall, facing as it does after the crossing: the way
 * it came out, or the new way of an arrow that turned it as the step
 * settled.
 * @param from - The state before the crossing
 * @param to - The state after it
 * @param progress - How far the drawing has gone, eased, from 0 to 1
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The pose, or null when the portals before the crossing don't match it
 */
function crossingPose(from: RulesState, to: RulesState, progress: number, tileSize: number): SubjectPose | null {
  const ways = crossingWays(from, to)

  if (ways === null) {
    return null
  }

  const travelled = progress * 2

  if (travelled < 1) {
    const into = DELTAS[ways.entry]
    const ahead = toWholePixels(travelled, tileSize)

    return {
      x: from.subjectX + (into.dx * ahead),
      y: from.subjectY + (into.dy * ahead),
      facing: ways.entry,
      clip: {
        x: from.subjectX,
        y: from.subjectY,
      },
    }
  }

  const out = DELTAS[ways.exit]
  const behind = toWholePixels(2 - travelled, tileSize)

  return {
    x: to.subjectX - (out.dx * behind),
    y: to.subjectY - (out.dy * behind),
    facing: to.facing,
    clip: {
      x: to.subjectX,
      y: to.subjectY,
    },
  }
}

/**
 * The ways a portal crossing went, read from the portals before it.
 */
type CrossingWays = {
  readonly entry: Direction // The way the subject moved into the entry portal
  readonly exit: Direction // The way it came out of the exit portal
}

/**
 * The ways a portal crossing went, read from the portals before it: the
 * exit portal opens in front of the tile the subject reached, and the entry
 * portal, the other one, is on the wall next to the tile it left, facing
 * that tile. The subject faces the way it came out after a crossing, which
 * tells the portals apart when both face its tile, unless an arrow turned it
 * as the step settled; only then are they matched on where they lie alone.
 * @param from - The state before the crossing
 * @param to - The state after it
 * @returns The ways, or null when no pair of portals matches
 */
function crossingWays(from: RulesState, to: RulesState): CrossingWays | null {
  return matchCrossing(from, to, true) ?? matchCrossing(from, to, false)
}

/**
 * Finds the pair of portals a crossing went through.
 * @param from - The state before the crossing
 * @param to - The state after it
 * @param facingOut - Whether the exit portal must open the way the subject faces after it
 * @returns The ways, or null when no pair of portals matches
 */
function matchCrossing(from: RulesState, to: RulesState, facingOut: boolean): CrossingWays | null {
  for (const exit of PORTAL_COLORS) {
    const entrance = (exit === PortalColor.BLUE) ? PortalColor.ORANGE : PortalColor.BLUE
    const exitSide = from.portalSide(exit)
    const entrySide = from.portalSide(entrance)

    if ((exitSide === null) || (entrySide === null) || (facingOut && (exitSide !== to.facing))) {
      continue
    }

    const out = DELTAS[exitSide]
    const entryWay = OPPOSITES[entrySide]
    const into = DELTAS[entryWay]
    const cameOut = ((from.portalX(exit) + out.dx) === to.subjectX) && ((from.portalY(exit) + out.dy) === to.subjectY)
    const wentIn = ((from.subjectX + into.dx) === from.portalX(entrance)) && ((from.subjectY + into.dy) === from.portalY(entrance))

    if (cameOut && wentIn) {
      return {
        entry: entryWay,
        exit: exitSide,
      }
    }
  }

  return null
}

/**
 * Rounds a distance in tiles to whole canvas pixels.
 * @param tiles - The distance, in tiles
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The distance, in tiles, a whole number of pixels long
 */
function toWholePixels(tiles: number, tileSize: number): number {
  // A canvas not yet sized for a chamber has no pixels to round to
  if (tileSize <= 0) {
    return tiles
  }

  return Math.round(tiles * tileSize) / tileSize
}
