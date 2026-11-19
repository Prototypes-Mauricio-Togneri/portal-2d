import type {ArrowData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Turns an arrow, when a link acts on it, reporting it only if it turned. A
 * subject standing on it turns with it, so on an arrow the subject always
 * faces the way it points.
 * @param draft - The step's state
 * @param index - The arrow's index in the chamber's arrow list
 * @param blocked - True to point it its own way, false its turned way
 */
function setArrowBlocked(draft: StateDraft, index: number, blocked: boolean): void {
  if (!draft.setBlocked('arrow', index, blocked)) {
    return
  }

  draft.emit(GameEvent.ARROW_TURNED)

  const position = draft.chamber.positionOf('arrow', index)
  const way = draft.pointingWay('arrow', index)

  if (draft.isSubjectAt(position.x, position.y) && (way !== null)) {
    draft.face(way)
  }
}

/**
 * Turns an arrow to its turned way, when a link unblocks it.
 * @param draft - The step's state
 * @param index - The arrow's index in the chamber's arrow list
 */
function turnArrow(draft: StateDraft, index: number): void {
  setArrowBlocked(draft, index, false)
}

/**
 * Turns an arrow back to its own way, when a link blocks it.
 * @param draft - The step's state
 * @param index - The arrow's index in the chamber's arrow list
 */
function turnArrowBack(draft: StateDraft, index: number): void {
  setArrowBlocked(draft, index, true)
}

/**
 * A one-way floor tile: entered only moving the way it points, and while on
 * it only that way acts; shots pass over it. One with an id and a turned way
 * is turned by a link between its own way (blocked, as it starts) and its
 * turned way (unblocked).
 */
export const ARROW_ELEMENT = defineElement<ArrowData>()({
  kind: 'arrow',
  fileKey: 'arrows',
  count: 'many',
  sitsOn: 'floor',
  layer: 'floorMarks',
  linkable: true,
  defaultBlocked: true,
  blocksWalking: 'alongDirection',
  blocksShots: 'never',
  stopsShootingFrom: 'never',
  takesPortals: 'never',
  blocksRays: 'never',
  reactsToSubject: false,
  continuesMovement: false,
  events: [GameEvent.ARROW_TURNED],
  hooks: {
    linkUnblocked: turnArrow,
    linkBlocked: turnArrowBack,
  },
})
