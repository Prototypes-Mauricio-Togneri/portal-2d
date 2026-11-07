import {type Action, ACTIONS, MOVEMENTS} from '@/game/rules/action'
import {DIRECTIONS} from '@/game/rules/state_layout'

/** Bits a packed macro action gives the action's index in ACTIONS */
const ACTION_BITS = 4

/** Bits a packed macro action gives the way, as an index in DIRECTIONS */
const DIRECTION_BITS = 2

/** The most tiles a packed macro action can name, so it fits a 32-bit number */
export const MAX_MACRO_TILES = 2 ** (32 - ACTION_BITS - DIRECTION_BITS)

/**
 * The action that moves or turns each way, by index in DIRECTIONS.
 * @param turn - Whether to find the turns rather than the moves
 * @returns The actions
 * @throws Error when ACTIONS lacks one, which the action list rules out
 */
function actionsByDirection(turn: boolean): readonly Action[] {
  return DIRECTIONS.map((direction) => {
    const action = ACTIONS.find((candidate) => {
      const movement = MOVEMENTS[candidate]

      return (movement !== null) && (movement.direction === direction) && (movement.turn === turn)
    })

    if (action === undefined) {
      throw new Error(`no ${turn ? 'turn' : 'move'} action for ${direction}`)
    }

    return action
  })
}

/** The move action each way, by index in DIRECTIONS */
export const MOVE_ACTIONS: readonly Action[] = actionsByDirection(false)

/** The turn action each way, by index in DIRECTIONS */
export const TURN_ACTIONS: readonly Action[] = actionsByDirection(true)

/**
 * Packs a macro action of the solver into one number: walk to a tile, face
 * a way (only for a shot), then take an action.
 * @param tile - The tile walked to, by its number
 * @param directionIndex - The way faced before a shot, as an index in DIRECTIONS; 0 for other actions
 * @param action - The action taken there
 * @returns The packed macro action
 * @throws Error when the action isn't in ACTIONS or the tile is past MAX_MACRO_TILES
 */
export function packMacro(tile: number, directionIndex: number, action: Action): number {
  const actionIndex = ACTIONS.indexOf(action)

  if ((actionIndex < 0) || (tile < 0) || (tile >= MAX_MACRO_TILES)) {
    throw new Error(`can't pack ${action} on tile ${tile}`)
  }

  return (((tile * (2 ** DIRECTION_BITS)) + directionIndex) * (2 ** ACTION_BITS)) + actionIndex
}

/**
 * The tile a packed macro action walks to.
 * @param macro - The packed macro action
 * @returns The tile's number
 */
export function macroTile(macro: number): number {
  return Math.floor(macro / (2 ** (DIRECTION_BITS + ACTION_BITS)))
}

/**
 * The way a packed macro action faces before a shot.
 * @param macro - The packed macro action
 * @returns The way, as an index in DIRECTIONS
 */
export function macroDirection(macro: number): number {
  return Math.floor(macro / (2 ** ACTION_BITS)) % (2 ** DIRECTION_BITS)
}

/**
 * The action a packed macro action takes.
 * @param macro - The packed macro action
 * @returns The action
 * @throws Error when the number holds no action
 */
export function macroAction(macro: number): Action {
  const action = ACTIONS[macro % (2 ** ACTION_BITS)]

  if (action === undefined) {
    throw new Error(`macro ${macro} holds no action`)
  }

  return action
}
