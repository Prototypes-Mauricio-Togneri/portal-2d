import type {GameKey} from '@/game/game_key'

/**
 * A key press as the game's input queues it.
 */
export type FrameInput = {
  readonly keys: readonly GameKey[] // The key pressed
}
