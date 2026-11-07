import {Direction} from '@/game/direction'
import type {FrameInput} from '@/game/frame_input'
import {GameKey} from '@/game/game_key'

/**
 * One thing the player does in a step of the rules: a move or a turn
 * towards one of four directions, a portal shot, or interact. Undo and redo
 * are not actions: they bring back an earlier state, outside the rules.
 */
export type Action =
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
 * Named values of Action.
 */
export const Action = {
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

/**
 * What a move or turn action does: which way, and whether it only turns.
 */
export type Movement = {
  readonly direction: Direction // Which way the subject faces, and moves
  readonly turn: boolean // Whether it only turns, unless it already faced that way
}

/** Every action, in a fixed order, so a seeded walk picks the same ones on every run */
export const ACTIONS: readonly Action[] = [
  Action.UP,
  Action.DOWN,
  Action.LEFT,
  Action.RIGHT,
  Action.TURN_UP,
  Action.TURN_DOWN,
  Action.TURN_LEFT,
  Action.TURN_RIGHT,
  Action.BLUE,
  Action.ORANGE,
  Action.INTERACT,
]

/** What each move or turn action does; null for the other actions */
export const MOVEMENTS: Readonly<Record<Action, Movement | null>> = {
  [Action.UP]: {
    direction: Direction.UP,
    turn: false,
  },
  [Action.DOWN]: {
    direction: Direction.DOWN,
    turn: false,
  },
  [Action.LEFT]: {
    direction: Direction.LEFT,
    turn: false,
  },
  [Action.RIGHT]: {
    direction: Direction.RIGHT,
    turn: false,
  },
  [Action.TURN_UP]: {
    direction: Direction.UP,
    turn: true,
  },
  [Action.TURN_DOWN]: {
    direction: Direction.DOWN,
    turn: true,
  },
  [Action.TURN_LEFT]: {
    direction: Direction.LEFT,
    turn: true,
  },
  [Action.TURN_RIGHT]: {
    direction: Direction.RIGHT,
    turn: true,
  },
  [Action.BLUE]: null,
  [Action.ORANGE]: null,
  [Action.INTERACT]: null,
}

/**
 * The action a key press stands for: an arrow key moves, or turns while the
 * turn key is held; the turn key changes nothing for the other keys.
 * @param input - A press, as the game's input queues it
 * @returns The action, or null when the press doesn't hold exactly one key
 */
export function actionOfPress(input: FrameInput): Action | null {
  const key = input.keys[0]

  if ((input.keys.length !== 1) || (key === undefined)) {
    return null
  }

  switch (key) {
    case GameKey.UP:
      return input.turnHeld ? Action.TURN_UP : Action.UP

    case GameKey.DOWN:
      return input.turnHeld ? Action.TURN_DOWN : Action.DOWN

    case GameKey.LEFT:
      return input.turnHeld ? Action.TURN_LEFT : Action.LEFT

    case GameKey.RIGHT:
      return input.turnHeld ? Action.TURN_RIGHT : Action.RIGHT

    case GameKey.BLUE:
      return Action.BLUE

    case GameKey.ORANGE:
      return Action.ORANGE

    case GameKey.INTERACT:
      return Action.INTERACT
  }
}
