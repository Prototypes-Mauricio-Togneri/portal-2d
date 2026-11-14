import type {GameKey} from '@/game/game_key'
import {type HistoryKey} from '@/game/game_key'

/**
 * A game key that stands for an action of the rules when pressed. Undo and
 * redo are handled by the level instead, so they are not among them.
 */
export type FrameKey = Exclude<GameKey, HistoryKey>

/**
 * A key press as the game's input queues it.
 */
export type FrameInput = {
  readonly keys: readonly FrameKey[] // The key pressed
}
