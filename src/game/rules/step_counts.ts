import {GameEvent} from '@/game/game_event'
import type {RulesState} from '@/game/rules/rules_state'

/**
 * Whether a step counts as a move: it put the subject on another tile, a
 * portal crossing included. Only moves change the subject's tile, so turns
 * count none.
 * @param before - The state before the step
 * @param after - The state after it
 * @returns True when the subject's tile changed
 */
export function countsAsMove(before: RulesState, after: RulesState): boolean {
  return (after.subjectX !== before.subjectX) || (after.subjectY !== before.subjectY)
}

/**
 * Counts the portals opened among a step's events.
 * @param events - What happened
 * @returns How many portals were opened on a wall
 */
export function countPortalsOpened(events: readonly GameEvent[]): number {
  return events.filter((event) => (event === GameEvent.BLUE_PORTAL_OPENED) || (event === GameEvent.ORANGE_PORTAL_OPENED)).length
}
