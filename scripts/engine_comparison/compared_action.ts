import type {FrameInput, FrameKey} from '@/game/frame_input'
import {GameKey} from '@/game/game_key'
import {parseReplayFrame} from '@/game/replay_data'
import {Action, actionOfPress} from '@/game/rules/action'

/**
 * A key frame pressing one key.
 * @param key - The key pressed
 * @param turnHeld - Whether the turn key is held
 * @returns The frame's input
 */
function keyFrame(key: FrameKey, turnHeld: boolean): FrameInput {
  return {
    keys: [key],
    turnHeld: turnHeld,
  }
}

/** The key frame today's rules read for each action: its one key, with the turn key held for a turn */
const FRAME_INPUTS: Readonly<Record<Action, FrameInput>> = {
  [Action.UP]: keyFrame(GameKey.UP, false),
  [Action.DOWN]: keyFrame(GameKey.DOWN, false),
  [Action.LEFT]: keyFrame(GameKey.LEFT, false),
  [Action.RIGHT]: keyFrame(GameKey.RIGHT, false),
  [Action.TURN_UP]: keyFrame(GameKey.UP, true),
  [Action.TURN_DOWN]: keyFrame(GameKey.DOWN, true),
  [Action.TURN_LEFT]: keyFrame(GameKey.LEFT, true),
  [Action.TURN_RIGHT]: keyFrame(GameKey.RIGHT, true),
  [Action.BLUE]: keyFrame(GameKey.BLUE, false),
  [Action.ORANGE]: keyFrame(GameKey.ORANGE, false),
  [Action.INTERACT]: keyFrame(GameKey.INTERACT, false),
}

/**
 * The key frame today's rules read for an action.
 * @param action - The action
 * @returns Its one key, with the turn key held for a turn
 */
export function toFrameInput(action: Action): FrameInput {
  return FRAME_INPUTS[action]
}

/**
 * Reads a recorded key frame as an action. The frame's gap is left out,
 * because a compared step always runs until the state settles.
 * @param text - A key frame in the replay text form, such as "8:up" or "8:^left"
 * @returns The action
 * @throws Error when the frame is an undo or a redo, or doesn't press exactly one key
 */
export function readAction(text: string): Action {
  const input = parseReplayFrame(text).input

  if (typeof input === 'string') {
    throw new Error(`"${text}" is an ${input}, not an action of the rules`)
  }

  const action = actionOfPress(input)

  if (action === null) {
    throw new Error(`"${text}" doesn't press exactly one key`)
  }

  return action
}
