import type {BlockableData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Opens a door, when a link unblocks it, reporting it only if it was closed.
 * @param draft - The step's state
 * @param index - The door's index in the chamber's door list
 */
function openDoor(draft: StateDraft, index: number): void {
  if (draft.setBlocked('door', index, false)) {
    draft.emit(GameEvent.DOOR_OPENED)
  }
}

/**
 * Closes a door, when a link blocks it, reporting it only if it was open.
 * @param draft - The step's state
 * @param index - The door's index in the chamber's door list
 */
function closeDoor(draft: StateDraft, index: number): void {
  if (draft.setBlocked('door', index, true)) {
    draft.emit(GameEvent.DOOR_CLOSED)
  }
}

/** A door, which keeps the subject and shots out while closed */
export const DOOR_ELEMENT = defineElement<BlockableData>()({
  kind: 'door',
  fileKey: 'doors',
  count: 'many',
  sitsOn: 'floor',
  layer: 'blockers',
  linkable: true,
  defaultBlocked: true,
  blocksWalking: 'whenBlocked',
  blocksShots: 'whenBlocked',
  stopsShootingFrom: 'never',
  takesPortals: false,
  reactsToSubject: false,
  events: [
    GameEvent.DOOR_OPENED,
    GameEvent.DOOR_CLOSED,
  ],
  hooks: {
    linkUnblocked: openDoor,
    linkBlocked: closeDoor,
  },
})
