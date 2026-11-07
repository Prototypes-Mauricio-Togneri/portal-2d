import type {FrameInput, FrameKey} from '@/game/frame_input'
import {GameKey} from '@/game/game_key'
import {parseReplayFrame} from '@/game/replay_data'

/**
 * One thing the player does in a step, as the v2 rules take it: a move or a
 * turn towards one of four directions, a portal shot, or interact.
 */
export type ComparedAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'turnUp'
  | 'turnDown'
  | 'turnLeft'
  | 'turnRight'
  | 'blue'
  | 'orange'
  | 'interact'

/**
 * Named values of ComparedAction.
 */
export const ComparedAction = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  TURN_UP: 'turnUp',
  TURN_DOWN: 'turnDown',
  TURN_LEFT: 'turnLeft',
  TURN_RIGHT: 'turnRight',
  BLUE: 'blue',
  ORANGE: 'orange',
  INTERACT: 'interact',
} as const

/** Every action, in a fixed order, so a seeded walk picks the same ones on every run */
export const COMPARED_ACTIONS: readonly ComparedAction[] = [
  ComparedAction.UP,
  ComparedAction.DOWN,
  ComparedAction.LEFT,
  ComparedAction.RIGHT,
  ComparedAction.TURN_UP,
  ComparedAction.TURN_DOWN,
  ComparedAction.TURN_LEFT,
  ComparedAction.TURN_RIGHT,
  ComparedAction.BLUE,
  ComparedAction.ORANGE,
  ComparedAction.INTERACT,
]

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
const FRAME_INPUTS: Readonly<Record<ComparedAction, FrameInput>> = {
  [ComparedAction.UP]: keyFrame(GameKey.UP, false),
  [ComparedAction.DOWN]: keyFrame(GameKey.DOWN, false),
  [ComparedAction.LEFT]: keyFrame(GameKey.LEFT, false),
  [ComparedAction.RIGHT]: keyFrame(GameKey.RIGHT, false),
  [ComparedAction.TURN_UP]: keyFrame(GameKey.UP, true),
  [ComparedAction.TURN_DOWN]: keyFrame(GameKey.DOWN, true),
  [ComparedAction.TURN_LEFT]: keyFrame(GameKey.LEFT, true),
  [ComparedAction.TURN_RIGHT]: keyFrame(GameKey.RIGHT, true),
  [ComparedAction.BLUE]: keyFrame(GameKey.BLUE, false),
  [ComparedAction.ORANGE]: keyFrame(GameKey.ORANGE, false),
  [ComparedAction.INTERACT]: keyFrame(GameKey.INTERACT, false),
}

/**
 * The key frame today's rules read for an action.
 * @param action - The action
 * @returns Its one key, with the turn key held for a turn
 */
export function toFrameInput(action: ComparedAction): FrameInput {
  return FRAME_INPUTS[action]
}

/**
 * Reads a recorded key frame as an action. The frame's gap is left out,
 * because a compared step always runs until the state settles.
 * @param text - A key frame in the replay text form, such as "8:up" or "8:^left"
 * @returns The action
 * @throws Error when the frame is an undo or a redo, or doesn't press exactly one key
 */
export function readAction(text: string): ComparedAction {
  const input = parseReplayFrame(text).input

  if (typeof input === 'string') {
    throw new Error(`"${text}" is an ${input}, not an action of the rules`)
  }

  const key = input.keys[0]

  if ((input.keys.length !== 1) || (key === undefined)) {
    throw new Error(`"${text}" doesn't press exactly one key`)
  }

  // Holding the turn key changes nothing for the keys other than the arrows
  switch (key) {
    case GameKey.UP:
      return input.turnHeld ? ComparedAction.TURN_UP : ComparedAction.UP

    case GameKey.DOWN:
      return input.turnHeld ? ComparedAction.TURN_DOWN : ComparedAction.DOWN

    case GameKey.LEFT:
      return input.turnHeld ? ComparedAction.TURN_LEFT : ComparedAction.LEFT

    case GameKey.RIGHT:
      return input.turnHeld ? ComparedAction.TURN_RIGHT : ComparedAction.RIGHT

    case GameKey.BLUE:
      return ComparedAction.BLUE

    case GameKey.ORANGE:
      return ComparedAction.ORANGE

    case GameKey.INTERACT:
      return ComparedAction.INTERACT
  }
}
