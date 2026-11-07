import type {BlockableData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Opens the exit, when a link unblocks it, reporting it only if it was
 * closed.
 * @param draft - The step's state
 * @param index - Always 0: the exit is a list of one
 */
function openExit(draft: StateDraft, index: number): void {
  if (draft.setBlocked('exit', index, false)) {
    draft.emit(GameEvent.EXIT_OPENED)
  }
}

/**
 * Closes the exit, when a link blocks it, reporting it only if it was open.
 * @param draft - The step's state
 * @param index - Always 0: the exit is a list of one
 */
function closeExit(draft: StateDraft, index: number): void {
  if (draft.setBlocked('exit', index, true)) {
    draft.emit(GameEvent.EXIT_CLOSED)
  }
}

/** The way out, one per chamber, which keeps the subject and shots out while closed; a step that ends with the subject on it completes the chamber */
export const EXIT_ELEMENT = defineElement<BlockableData>()({
  kind: 'exit',
  fileKey: 'exit',
  count: 'one',
  sitsOn: 'floor',
  layer: 'blockers',
  linkable: true,
  defaultBlocked: true,
  blocksWalking: 'whenBlocked',
  blocksShots: 'whenBlocked',
  stopsShootingFrom: 'never',
  takesPortals: false,
  reactsToSubject: true,
  events: [
    GameEvent.EXIT_OPENED,
    GameEvent.EXIT_CLOSED,
  ],
  hooks: {
    linkUnblocked: openExit,
    linkBlocked: closeExit,
  },
})
