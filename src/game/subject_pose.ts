import type {PositionData} from '@/game/chamber_data'
import type {Direction} from '@/game/direction'
import {GameEvent} from '@/game/game_event'
import {PORTAL_COLORS, PortalColor} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {NO_BOX} from '@/game/rules/state_layout'
import {DELTAS, OPPOSITES} from '@/game/rules/step'
import type {StepTransition} from '@/game/step_animation'

/**
 * Where the subject is drawn in a frame: its tile, part way between two
 * while a step is being drawn, the way it faces, and the one tile it shows
 * inside while it slides through a portal.
 */
export type SubjectPose = {
  readonly x: number // Column, part way between two while it glides
  readonly y: number // Row, part way between two while it glides
  readonly facing: Direction // The way its triangle points
  readonly clip: PositionData | null // The tile it shows only inside, or null to show it whole
}

/**
 * Where the subject is drawn in a frame. Part way through a step that moved
 * it one tile, it glides from the tile it left to the tile it reached.
 * Through a portal, it slides into the entry portal, shown only inside the
 * tile it left, then out of the exit portal, shown only inside the tile it
 * reached, each half one tile's travel at the pace of a glide. The distance
 * still to go is rounded to whole canvas pixels, so its edges stay sharp.
 * Every other step, and a frame drawing no step, shows it where it stands.
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

  if (transition.events.includes(GameEvent.CROSSED)) {
    return crossingPose(from, state, transition.progress, tileSize) ?? rest
  }

  const dx = state.subjectX - from.subjectX
  const dy = state.subjectY - from.subjectY

  if ((Math.abs(dx) + Math.abs(dy)) !== 1) {
    return rest
  }

  const behind = toWholePixels(1 - transition.progress, tileSize)

  return {
    x: state.subjectX - (dx * behind),
    y: state.subjectY - (dy * behind),
    facing: state.facing,
    clip: null,
  }
}

/**
 * The box the subject carries both before and after the step being drawn,
 * which is drawn with the subject, at its pose.
 * @param state - The state drawn
 * @param transition - The step being drawn, ending on the state drawn, or null
 * @returns The box's index, or NO_BOX when no box is carried through a step being drawn
 */
export function boxCarriedThrough(state: RulesState, transition: StepTransition | null): number {
  if ((transition === null) || (transition.to !== state) || (state.carriedBox === NO_BOX)) {
    return NO_BOX
  }

  return (transition.from.carriedBox === state.carriedBox) ? state.carriedBox : NO_BOX
}

/**
 * Where the subject is drawn part way through a portal crossing: two tiles'
 * travel, the first into the entry portal's wall, facing it, the second out
 * of the exit portal's wall, facing the way it came out.
 * @param from - The state before the crossing
 * @param to - The state after it
 * @param progress - How far the drawing has gone, eased, from 0 to 1
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The pose, or null when the portals before the crossing don't match it
 */
function crossingPose(from: RulesState, to: RulesState, progress: number, tileSize: number): SubjectPose | null {
  const entryWay = crossingEntryWay(from, to)

  if (entryWay === null) {
    return null
  }

  const travelled = progress * 2

  if (travelled < 1) {
    const into = DELTAS[entryWay]
    const ahead = toWholePixels(travelled, tileSize)

    return {
      x: from.subjectX + (into.dx * ahead),
      y: from.subjectY + (into.dy * ahead),
      facing: entryWay,
      clip: {
        x: from.subjectX,
        y: from.subjectY,
      },
    }
  }

  const out = DELTAS[to.facing]
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
 * The way the subject moved into the entry portal of a crossing, read from
 * the portals before it: the exit portal opens to the way the subject came
 * out, in front of the tile it reached, and the entry portal, the other one,
 * is on the wall next to the tile it left, facing that tile.
 * @param from - The state before the crossing
 * @param to - The state after it
 * @returns The way into the entry portal, or null when no pair of portals matches
 */
function crossingEntryWay(from: RulesState, to: RulesState): Direction | null {
  for (const exit of PORTAL_COLORS) {
    const entrance = (exit === PortalColor.BLUE) ? PortalColor.ORANGE : PortalColor.BLUE
    const exitSide = from.portalSide(exit)
    const entrySide = from.portalSide(entrance)

    if ((exitSide !== to.facing) || (entrySide === null)) {
      continue
    }

    const out = DELTAS[to.facing]
    const entryWay = OPPOSITES[entrySide]
    const into = DELTAS[entryWay]
    const cameOut = ((from.portalX(exit) + out.dx) === to.subjectX) && ((from.portalY(exit) + out.dy) === to.subjectY)
    const wentIn = ((from.subjectX + into.dx) === from.portalX(entrance)) && ((from.subjectY + into.dy) === from.portalY(entrance))

    if (cameOut && wentIn) {
      return entryWay
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
