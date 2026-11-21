import type {PositionData} from '@/game/chamber_data'
import {DELTAS, Direction} from '@/game/direction'
import {boxSprite} from '@/game/element_drawings'
import {GameEvent} from '@/game/game_event'
import {CARRIED_BOX_AHEAD, CARRIED_BOX_SIZE} from '@/game/renderer'
import {NO_ELEMENT} from '@/game/rules/compiled_chamber'
import {BOX_DESTROYING_KINDS} from '@/game/rules/elements/box'
import type {RulesState} from '@/game/rules/rules_state'
import type {SpriteName} from '@/game/sprite_set'

/**
 * A box a step destroyed where it lay, or where the subject put it down,
 * placed where it was last drawn.
 */
export type DestroyedBox = {
  readonly index: number // Which box it is, its index in the chamber's box list, so it keeps its look as it goes
  readonly x: number // Column of its middle, in tiles
  readonly y: number // Row of its middle, in tiles
  readonly size: number // Its side, as a share of a tile
  readonly sprite: SpriteName // What it is drawn as: a plain box or a mirror box
  readonly way: Direction // The way its sprite was turned to face
  readonly tile: PositionData // The tile it was destroyed on
  readonly fell: boolean // Whether it fell into a ditch still open after the step, rather than broke up
}

/**
 * The boxes a step destroyed because an element was blocked where they lay
 * (boxDestroyed): each box that went back to its start from a tile holding
 * a door, a ditch, a laser, a light barrier or a fizzler, where it lay or
 * was put down. A box carried into a fizzler that is on is the fizzler
 * rule's, not one of these. One on a ditch falls in only while the ditch
 * is still open after the step: sent back to a button that bridges it
 * again, it breaks up, as the grate slides back over the pit. A box a
 * switch sends back from such a tile in the same step as another is
 * destroyed would be counted too, a case too rare to tell apart.
 * @param before - The state before the step
 * @param after - The state after the step
 * @param events - What happened in the step
 * @returns Each destroyed box, empty when the step destroyed none
 */
export function findDestroyedBoxes(before: RulesState, after: RulesState, events: readonly GameEvent[]): DestroyedBox[] {
  if (!events.includes(GameEvent.BOX_DESTROYED)) {
    return []
  }

  const chamber = after.chamber
  const destroyed: DestroyedBox[] = []

  chamber.boxStarts.forEach((start, index) => {
    // A carried box lies on the subject's tile
    const x = before.boxX(index)
    const y = before.boxY(index)
    const carried = before.carriedBox === index
    const sentBack = (after.carriedBox !== index) && (after.boxX(index) === start.x) && (after.boxY(index) === start.y) && ((x !== start.x) || (y !== start.y))
    const putDownInPlace = (after.subjectX === x) && (after.subjectY === y)
    const kind = BOX_DESTROYING_KINDS.find((candidate) => chamber.elementAt(candidate, x, y) !== NO_ELEMENT)

    if ((!sentBack) || (kind === undefined) || (carried && ((!putDownInPlace) || (kind === 'fizzler')))) {
      return
    }

    const facing = carried ? after.facing : Direction.UP
    const ahead = carried ? CARRIED_BOX_AHEAD : 0
    const sprite = boxSprite(chamber, index, facing)

    destroyed.push({
      index: index,
      x: x + 0.5 + (DELTAS[facing].dx * ahead),
      y: y + 0.5 + (DELTAS[facing].dy * ahead),
      size: carried ? CARRIED_BOX_SIZE : 1,
      sprite: sprite.name,
      way: sprite.way,
      tile: {
        x: x,
        y: y,
      },
      fell: (kind === 'ditch') && after.isBlockedAt('ditch', x, y),
    })
  })

  return destroyed
}
