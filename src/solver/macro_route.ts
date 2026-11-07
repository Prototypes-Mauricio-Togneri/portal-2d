import {Action} from '@/game/rules/action'
import type {RulesState} from '@/game/rules/rules_state'
import {DIRECTIONS} from '@/game/rules/state_layout'
import {startChamber, step} from '@/game/rules/step'
import {macroAction, macroDirection, macroTile, MOVE_ACTIONS, TURN_ACTIONS} from '@/solver/macro_action'
import type {StateKeyCodec} from '@/solver/state_key_codec'
import type {WalkGraph} from '@/solver/walk_graph'

/**
 * One macro action of a route the solver found, with the state it leads to.
 */
export type MacroStep = {
  readonly macro: number // The packed macro action
  readonly low: number // The low word of the state's key after it, with the canonical facing
  readonly high: number // The high word of that key
}

/**
 * Packs a state into its key, with the canonical facing of the subject's
 * tile, as the solver stores states.
 * @param codec - The chamber's state key
 * @param graph - The chamber's walk graph
 * @param state - The state
 * @param words - Where to write the key, low word first
 */
export function encodeCanonical(codec: StateKeyCodec, graph: WalkGraph, state: RulesState, words: Uint32Array): void {
  codec.encode(state, words, 0)

  const tile = codec.subjectTileOf(words[0] ?? 0)

  words[0] = codec.placeSubject(words[0] ?? 0, tile, graph.facingOf(tile))
}

/**
 * Turns a route of macro actions back into actions, played through the
 * rules' step from the chamber's start: before each macro action, the
 * fewest moves to its tile; before a shot, a turn when the subject faces
 * another way; then the action. After each macro action the state must be
 * the one the search stored, or the walk graph disagrees with the rules.
 * @param codec - The chamber's state key
 * @param graph - The chamber's walk graph
 * @param route - The macro actions, in order, each with the state it leads to
 * @returns The actions
 * @throws Error when a macro action doesn't lead to the state stored for it
 */
export function expandRoute(codec: StateKeyCodec, graph: WalkGraph, route: readonly MacroStep[]): Action[] {
  const chamber = codec.index.chamber
  const words = new Uint32Array(2)
  const actions: Action[] = []
  let state = startChamber(chamber).state

  /**
   * Plays one action and keeps it.
   * @param action - The action
   */
  const play = (action: Action): void => {
    state = step(chamber, state, action).state
    actions.push(action)
  }

  route.forEach((macroStep, position) => {
    const tile = macroTile(macroStep.macro)
    const directionIndex = macroDirection(macroStep.macro)
    const action = macroAction(macroStep.macro)

    codec.encode(state, words, 0)
    graph.walk(graph.edgesFor(state, codec.flagsOf(words[0] ?? 0, words[1] ?? 0)), codec.subjectTileOf(words[0] ?? 0))

    for (const moveDirection of graph.pathTo(tile)) {
      play(MOVE_ACTIONS[moveDirection] ?? Action.UP)
    }

    if (((action === Action.BLUE) || (action === Action.ORANGE)) && (state.facing !== DIRECTIONS[directionIndex])) {
      play(TURN_ACTIONS[directionIndex] ?? Action.TURN_UP)
    }

    play(action)
    encodeCanonical(codec, graph, state, words)

    if ((words[0] !== macroStep.low) || (words[1] !== macroStep.high)) {
      throw new Error(`macro action ${position + 1} (${action} on tile ${tile}) doesn't lead to the state the search stored`)
    }
  })

  return actions
}
