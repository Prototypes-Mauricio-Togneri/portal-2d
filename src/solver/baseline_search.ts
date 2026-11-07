import {type Action, ACTIONS} from '@/game/rules/action'
import type {CompiledChamber} from '@/game/rules/compiled_chamber'
import type {RulesState} from '@/game/rules/rules_state'
import {startChamber, step} from '@/game/rules/step'
import {countPortalsOpened, countsAsMove} from '@/game/rules/step_counts'
import {CostHeap} from '@/solver/cost_heap'

/**
 * What a search makes as few as possible: moves first (ties broken by fewest
 * portals), or portals first (ties broken by fewest moves).
 */
export type Objective = 'moves' | 'portals'

/**
 * Named values of Objective.
 */
export const Objective = {
  MOVES: 'moves',
  PORTALS: 'portals',
} as const

/**
 * What a search found.
 */
export type SearchResult = {
  readonly solved: boolean // Whether it found a route to the completed chamber
  readonly gaveUp: boolean // Whether it stopped at its state cap before finding one or seeing every state
  readonly moves: number // The route's moves, when solved
  readonly portals: number // The route's portals opened, when solved
  readonly actions: readonly Action[] // The route, when solved
  readonly states: readonly RulesState[] // Every distinct state it found, the start first
  readonly expanded: number // States whose every action it tried
}

/**
 * A state the search found, with the cheapest known way to it.
 */
type SearchNode = {
  readonly state: RulesState // The state
  parent: number // The node it is reached from, or NO_PARENT
  action: Action | null // The action that reaches it, or null for the start
  moves: number // Moves on the cheapest known way to it
  portals: number // Portals opened on the cheapest known way to it
}

/** The parent of the start node */
const NO_PARENT = -1

/** The weight of the first count in a cost: the second count must stay below it */
const COST_SCALE = 2 ** 20

/**
 * Turns a route's counts into one cost that orders routes by the objective:
 * its count first, the other one to break ties.
 * @param objective - What to make as few as possible
 * @param moves - The route's moves
 * @param portals - The route's portals opened
 * @returns The cost
 * @throws Error when the tie-breaking count reaches COST_SCALE
 */
export function costOf(objective: Objective, moves: number, portals: number): number {
  const first = (objective === Objective.MOVES) ? moves : portals
  const second = (objective === Objective.MOVES) ? portals : moves

  if (second >= COST_SCALE) {
    throw new Error(`A route's ${(objective === Objective.MOVES) ? 'portals' : 'moves'} reached ${COST_SCALE}, past what a cost can order`)
  }

  return (first * COST_SCALE) + second
}

/**
 * Rebuilds the route to a node.
 * @param nodes - The search's nodes
 * @param last - The node the route ends on
 * @returns The actions from the start, in order
 */
function routeTo(nodes: readonly SearchNode[], last: number): Action[] {
  const actions: Action[] = []

  for (let node = nodes[last]; (node !== undefined) && (node.action !== null); node = nodes[node.parent]) {
    actions.push(node.action)
  }

  return actions.reverse()
}

/**
 * What a search gives when it ends.
 * @param nodes - The search's nodes
 * @param solved - The completed node taken off the queue, or null when none was
 * @param gaveUp - Whether it stopped at its state cap
 * @param expanded - States whose every action it tried
 * @returns The result
 */
function buildResult(nodes: readonly SearchNode[], solved: number | null, gaveUp: boolean, expanded: number): SearchResult {
  const solvedNode = (solved === null) ? undefined : nodes[solved]

  return {
    solved: solvedNode !== undefined,
    gaveUp: gaveUp,
    moves: solvedNode?.moves ?? 0,
    portals: solvedNode?.portals ?? 0,
    actions: (solved === null) ? [] : routeTo(nodes, solved),
    states: nodes.map((node) => node.state),
    expanded: expanded,
  }
}

/**
 * The reference search: tries every action from every state through the
 * rules' own step, cheapest state first (Dijkstra's algorithm), so the first
 * completed state taken off the queue ends an optimal route. Slow, since it
 * keeps every state as an object and tries all eleven actions on each, but
 * simple enough to trust; faster searches are checked against it.
 * @param chamber - The chamber
 * @param objective - What to make as few as possible
 * @param maxStates - The most distinct states to keep before giving up
 * @returns What it found
 * @throws Error when the rules throw
 */
export function searchBaseline(chamber: CompiledChamber, objective: Objective, maxStates: number): SearchResult {
  const start = startChamber(chamber)
  const nodes: SearchNode[] = [
    {
      state: start.state,
      parent: NO_PARENT,
      action: null,
      moves: 0,
      portals: countPortalsOpened(start.events),
    },
  ]
  const nodeByKey = new Map<string, number>()
  const queue = new CostHeap()
  let expanded = 0

  nodeByKey.set(start.state.key, 0)
  queue.push(costOf(objective, 0, nodes[0]?.portals ?? 0), 0)

  while (queue.size > 0) {
    const cost = queue.lowestCost
    const current = queue.pop()
    const node = nodes[current]

    // A node queued again at a lower cost leaves its older entries behind
    if ((node === undefined) || (cost !== costOf(objective, node.moves, node.portals))) {
      continue
    }

    if (node.state.completed) {
      return buildResult(nodes, current, false, expanded)
    }

    expanded++

    for (const action of ACTIONS) {
      const result = step(chamber, node.state, action)

      if (result.state === node.state) {
        continue
      }

      const moves = node.moves + (countsAsMove(node.state, result.state) ? 1 : 0)
      const portals = node.portals + countPortalsOpened(result.events)
      const nextCost = costOf(objective, moves, portals)
      const known = nodeByKey.get(result.state.key)

      if (known === undefined) {
        if (nodes.length >= maxStates) {
          return buildResult(nodes, null, true, expanded)
        }

        nodeByKey.set(result.state.key, nodes.length)
        queue.push(nextCost, nodes.length)
        nodes.push({
          state: result.state,
          parent: current,
          action: action,
          moves: moves,
          portals: portals,
        })
        continue
      }

      const knownNode = nodes[known]

      if ((knownNode !== undefined) && (nextCost < costOf(objective, knownNode.moves, knownNode.portals))) {
        knownNode.parent = current
        knownNode.action = action
        knownNode.moves = moves
        knownNode.portals = portals
        queue.push(nextCost, known)
      }
    }
  }

  return buildResult(nodes, null, false, expanded)
}
