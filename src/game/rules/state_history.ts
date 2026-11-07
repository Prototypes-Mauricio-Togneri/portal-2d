import type {RulesState} from '@/game/rules/rules_state'

/**
 * Undo and redo for a run on the rules: the states before each step that
 * changed the state, and those undone since the latest such step. States
 * never change, so keeping them is enough. The level and the replay runner
 * share it, so a replay steps through the history exactly as the live run did.
 */
export class StateHistory {
  private readonly undoStates: RulesState[] = [] // The states before each recorded step, newest last
  private redoStates: RulesState[] = [] // The states undone since the latest recorded step, most recently undone last

  /**
   * Records a step: when it changed the state, the state before it can be
   * brought back by undo, and what was undone is forgotten.
   * @param before - The state before the step
   * @param after - The state after it, the same object when nothing changed
   */
  record(before: RulesState, after: RulesState): void {
    if (after !== before) {
      this.undoStates.push(before)
      this.redoStates = []
    }
  }

  /**
   * Takes back the latest step.
   * @param state - The state now, which redo can bring back
   * @returns The state before that step, or null when there is nothing to undo
   */
  undo(state: RulesState): RulesState | null {
    const restored = this.undoStates.pop()

    if (restored === undefined) {
      return null
    }

    this.redoStates.push(state)

    return restored
  }

  /**
   * Takes the latest undone step again.
   * @param state - The state now, which undo can bring back
   * @returns The state after that step, or null when there is nothing to redo
   */
  redo(state: RulesState): RulesState | null {
    const restored = this.redoStates.pop()

    if (restored === undefined) {
      return null
    }

    this.undoStates.push(state)

    return restored
  }
}
