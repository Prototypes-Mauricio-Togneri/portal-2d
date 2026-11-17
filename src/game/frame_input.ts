import type {GameKey} from '@/game/game_key'

/**
 * A game key that stands for an action of the rules when pressed. The turn
 * key is only ever read as held, so it is not among them.
 */
export type FrameKey = Exclude<GameKey, typeof GameKey.TURN>

/**
 * A key press as the game's input queues it, with whether the turn key was
 * held as it went down.
 */
export type FrameInput = {
  readonly keys: readonly FrameKey[] // The key pressed
  readonly turnHeld: boolean // Whether the turn key was held down
}
