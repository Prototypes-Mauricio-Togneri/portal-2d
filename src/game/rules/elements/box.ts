import type {BoxData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Sends a box back to its start tile, when a link unblocks it, unless the
 * subject carries it. Blocking it does nothing.
 * @param draft - The step's state
 * @param index - The box's index in the chamber's box list
 */
function sendBoxBack(draft: StateDraft, index: number): void {
  if (draft.carriedBox !== index) {
    draft.sendBoxToStart(index)
  }
}

/** The elements that destroy a box lying on their tile while they are blocked: a door closed, a ditch open, a laser, a light barrier or a fizzler on. The exit is left out, since no box can lie on it: the subject reaching it ends the chamber */
export const BOX_DESTROYING_KINDS = [
  'door',
  'ditch',
  'laser',
  'lightBarrier',
  'fizzler',
] as const

/**
 * Destroys each box lying where an element is blocked, in list order: it
 * goes back to its start tile, reporting boxDestroyed. Run by the core step
 * in every pass, after the buttons, since boxes move and so have no pass
 * hook. A box at its start stays: the layout checks keep starts on plain
 * floor or a button, and a fixture chamber read without them may start one
 * on a blocked element. So each box is destroyed at most once in a step. A
 * carried box is left to the fizzler rule.
 * @param draft - The step's state
 */
export function destroyBoxesOnBlockedTiles(draft: StateDraft): void {
  draft.chamber.boxStarts.forEach((start, index) => {
    const x = draft.boxX(index)
    const y = draft.boxY(index)

    if ((draft.carriedBox === index) || ((x === start.x) && (y === start.y))) {
      return
    }

    if (BOX_DESTROYING_KINDS.some((kind) => draft.isBlockedAt(kind, x, y))) {
      draft.sendBoxToStart(index)
      draft.emit(GameEvent.BOX_DESTROYED)
    }
  })
}

/** A box the subject can carry, mainly to hold buttons down, listed at its start tile; resting, it keeps the subject off its tile (checked by the core step, since boxes move) but lets shots through; a link sends it back there, and so does a door closing, a ditch opening or a laser, a light barrier or a fizzler switching on where it lies */
export const BOX_ELEMENT = defineElement<BoxData>()({
  kind: 'box',
  fileKey: 'boxes',
  count: 'many',
  sitsOn: 'floor',
  layer: 'items',
  linkable: true,
  defaultBlocked: null,
  blocksWalking: 'always',
  blocksShots: 'never',
  stopsShootingFrom: 'never',
  takesPortals: 'never',
  blocksRays: 'never',
  reactsToSubject: false,
  continuesMovement: false,
  events: [
    GameEvent.BOX_PICKED_UP,
    GameEvent.BOX_PUT_DOWN,
    GameEvent.BOX_DESTROYED,
  ],
  hooks: {
    linkUnblocked: sendBoxBack,
  },
})
