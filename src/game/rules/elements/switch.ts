import type {TriggerData} from '@/game/chamber_data'
import {GameEvent} from '@/game/game_event'
import {defineElement} from '@/game/rules/element_definition'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * Uses a switch with the interact key: refused while the subject carries a
 * box, otherwise it reports it and unblocks its links, every time.
 * @param draft - The step's state
 * @param index - The switch's index in the chamber's switch list
 * @returns Always true: on a switch, the interact key does nothing else
 */
function useSwitch(draft: StateDraft, index: number): boolean {
  if (draft.isCarrying) {
    draft.emit(GameEvent.REFUSED)
  } else {
    draft.emit(GameEvent.SWITCH_USED)
    draft.applyLinks('switch', index, true)
  }

  return true
}

/** A switch on the floor, used with the interact key: every use unblocks its links (elements or link groups), and nothing blocks them again */
export const SWITCH_ELEMENT = defineElement<TriggerData>()({
  kind: 'switch',
  fileKey: 'switches',
  count: 'many',
  sitsOn: 'floor',
  layer: 'fixtures',
  linkable: false,
  defaultBlocked: null,
  blocksWalking: 'never',
  blocksShots: 'never',
  stopsShootingFrom: 'never',
  takesPortals: false,
  reactsToSubject: false,
  events: [GameEvent.SWITCH_USED],
  hooks: {
    interact: useSwitch,
  },
})
