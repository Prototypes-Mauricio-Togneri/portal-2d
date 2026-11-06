import {GameKey, type HistoryKey} from '@/game/game_key'

/**
 * A game key the rules read as pressed. The turn key is only ever read as
 * held, and undo and redo are handled by the level instead, so they are not
 * among them.
 */
export type FrameKey = Exclude<GameKey, typeof GameKey.TURN | HistoryKey>

/**
 * Every key the rules read as pressed, in a fixed order, so a frame's keys
 * are always listed the same way.
 */
export const FRAME_KEYS: readonly FrameKey[] = [
  GameKey.UP,
  GameKey.DOWN,
  GameKey.LEFT,
  GameKey.RIGHT,
  GameKey.BLUE,
  GameKey.ORANGE,
  GameKey.INTERACT,
]

/**
 * All the rules read from the keyboard in one frame. Two inputs with the same
 * keys and turn flag lead the rules to the same next state.
 */
export type FrameInput = {
  readonly keys: readonly FrameKey[] // Keys pressed since the previous frame, in FRAME_KEYS order
  readonly turnHeld: boolean // Whether the turn key is held down
}

/**
 * The keyboard as the rules read it, built from a frame's input.
 */
export type FrameInputReader = {
  isPressed(key: GameKey): boolean // Whether the key went down since the previous frame
  isPressing(key: GameKey): boolean // Whether the key is held down; the rules only ask about the turn key
}

/** A frame with no key pressed and the turn key up */
export const EMPTY_FRAME_INPUT: FrameInput = {
  keys: [],
  turnHeld: false,
}

/**
 * Lets the rules read a frame's input as they read the keyboard.
 * @param input - The frame's input
 * @returns A reader answering from that input alone
 */
export function createFrameInputReader(input: FrameInput): FrameInputReader {
  return {
    isPressed: (key: GameKey): boolean => input.keys.some((pressedKey) => pressedKey === key),
    isPressing: (key: GameKey): boolean => (key === GameKey.TURN) && input.turnHeld,
  }
}
