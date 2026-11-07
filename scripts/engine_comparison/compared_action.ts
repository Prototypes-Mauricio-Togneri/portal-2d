import {GameKey} from '@/game/game_key'
import {parseReplayFrame, parseReplayStep} from '@/game/replay_data'
import {type Action, actionOfPress} from '@/game/rules/action'

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

/**
 * Reads a press of a recorded solution as an action.
 * @param text - A press in the replay text form, such as "up" or "turnLeft"
 * @returns The action
 * @throws Error when the press is an undo, a redo or unknown
 */
export function readSolutionAction(text: string): Action {
  const replayStep = parseReplayStep(text)

  if ((replayStep === GameKey.UNDO) || (replayStep === GameKey.REDO)) {
    throw new Error(`"${text}" is an ${replayStep}, not an action of the rules`)
  }

  return replayStep
}
