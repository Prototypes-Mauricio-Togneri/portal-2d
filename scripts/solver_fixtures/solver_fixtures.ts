import type {ChamberData} from '@/game/chamber_data'
import type {ReplayExpectation} from '@/game/replay_data'
import type {Action} from '@/game/rules/action'
import arrowTrap from '@scripts/solver_fixtures/arrow_trap.json'
import boxOnButton from '@scripts/solver_fixtures/box_on_button.json'
import boxThroughPortal from '@scripts/solver_fixtures/box_through_portal.json'
import fizzlerBox from '@scripts/solver_fixtures/fizzler_box.json'
import portalWalk from '@scripts/solver_fixtures/portal_walk.json'
import switchDoor from '@scripts/solver_fixtures/switch_door.json'

// Tiny chambers (the JSON files next to this one) with hand-counted optimal
// routes, the reference answers for the solver (stage 02). The replay check
// plays each route, proving its counts can be reached; the solver check
// (npm run solver:check) proves the solver finds the same counts. The
// chambers pass the layout checks, like the catalogue's

/**
 * A route through a tiny chamber, written by hand, with what replaying it
 * gives.
 */
export type SolverRoute = {
  readonly actions: readonly Action[] // The actions, in order
  readonly expected: ReplayExpectation // What replaying them gives; its moves and portals are the hand counts
}

/**
 * A tiny chamber with its two optimal routes, counted by hand.
 */
export type SolverFixture = {
  readonly name: string // Short id, used in the checks' reports
  readonly covers: string // What it covers, in plain words
  readonly chamber: ChamberData // The tiny chamber
  readonly fewestMoves: SolverRoute // A route with the fewest moves, and among those the fewest portals
  readonly fewestPortals: SolverRoute // A route with the fewest portals, and among those the fewest moves
}

/** Every solver fixture, run by the replay check and the solver check */
export const SOLVER_FIXTURES: readonly SolverFixture[] = [
  // Only two wall faces take portals, (0,1) facing right and (6,1) facing
  // left, so the one useful crossing is walking left from (1,1) onto the exit
  // at (5,1); reaching (1,1) takes at least 3 moves, so 4 moves is the least
  // and it needs both portals. Without a crossing (0 or 1 portal) the subject
  // walks round the top, at least the 7 tiles between it and the exit
  {
    name: 'portal_walk',
    covers: 'Walking through a portal: crossing over the ditches takes fewer moves than walking round, so the two pars come from different routes.',
    chamber: portalWalk,
    fewestMoves: {
      actions: [
        'down',
        'down',
        'down',
        'turnRight',
        'orange',
        'turnLeft',
        'blue',
        'left',
      ],
      expected: {
        completed: true,
        moves: 4,
        portals: 2,
        finalHash: 'a2f3f787',
      },
    },
    fewestPortals: {
      actions: [
        'right',
        'right',
        'right',
        'right',
        'down',
        'down',
        'down',
      ],
      expected: {
        completed: true,
        moves: 7,
        portals: 0,
        finalHash: '5e8ab6eb',
      },
    },
  },
  // The ditch cuts the box's side from the button and the exit, so the box
  // reaches the button only carried through the one crossing, walking left
  // from (1,1) into (0,1) and out at (5,1), which needs both portals. The
  // subject needs 2 moves to the box at (2,2), 2 back to (1,1), 1 to cross,
  // 1 onto the button and 3 from there to the exit: 9, so one route is both
  // optimums
  {
    name: 'box_through_portal',
    covers: 'Carrying a box through a portal: the only box must cross the ditch to hold down the button that opens the exit.',
    chamber: boxThroughPortal,
    fewestMoves: {
      actions: [
        'orange',
        'turnLeft',
        'blue',
        'right',
        'up',
        'interact',
        'down',
        'left',
        'left',
        'left',
        'interact',
        'right',
        'up',
        'up',
      ],
      expected: {
        completed: true,
        moves: 9,
        portals: 2,
        finalHash: '8a928f4b',
      },
    },
    fewestPortals: {
      actions: [
        'orange',
        'turnLeft',
        'blue',
        'right',
        'up',
        'interact',
        'down',
        'left',
        'left',
        'left',
        'interact',
        'right',
        'up',
        'up',
      ],
      expected: {
        completed: true,
        moves: 9,
        portals: 2,
        finalHash: '8a928f4b',
      },
    },
  },
  // No wall takes portals and the button is far from the door, so the box
  // must be on the button when the subject steps into the doorway: the
  // subject walks to the box (4 tiles), to the button (2) and to the exit
  // (7), each leg as short as the grid allows, 13 moves with no portal
  {
    name: 'box_on_button',
    covers: 'A box left on a button holds open the door the subject must pass on its way to the exit.',
    chamber: boxOnButton,
    fewestMoves: {
      actions: [
        'right',
        'right',
        'down',
        'down',
        'interact',
        'left',
        'left',
        'interact',
        'up',
        'up',
        'right',
        'right',
        'right',
        'right',
        'right',
      ],
      expected: {
        completed: true,
        moves: 13,
        portals: 0,
        finalHash: '83f1c2dd',
      },
    },
    fewestPortals: {
      actions: [
        'right',
        'right',
        'down',
        'down',
        'interact',
        'left',
        'left',
        'interact',
        'up',
        'up',
        'right',
        'right',
        'right',
        'right',
        'right',
      ],
      expected: {
        completed: true,
        moves: 13,
        portals: 0,
        finalHash: '83f1c2dd',
      },
    },
  },
  // The subject must use the switch at (5,2), then come back to (1,2), the
  // only way to the door and the exit below it, so at least 1 + 1 + 2 = 4
  // moves; that needs a crossing each way, over the laser, through the two
  // portal faces (0,2) and (6,2). Without a crossing each way between (1,2)
  // and (5,2) goes round the laser through row 3, 6 moves, so 6 + 6 + 2 = 14
  {
    name: 'switch_door',
    covers: 'A switch across a laser opens the door to the exit: crossing there and back through the same two portals beats walking round twice.',
    chamber: switchDoor,
    fewestMoves: {
      actions: [
        'orange',
        'turnLeft',
        'blue',
        'left',
        'interact',
        'right',
        'down',
        'down',
      ],
      expected: {
        completed: true,
        moves: 4,
        portals: 2,
        finalHash: '72887b5d',
      },
    },
    fewestPortals: {
      actions: [
        'up',
        'right',
        'right',
        'right',
        'right',
        'down',
        'interact',
        'up',
        'left',
        'left',
        'left',
        'left',
        'down',
        'down',
        'down',
      ],
      expected: {
        completed: true,
        moves: 14,
        portals: 0,
        finalHash: 'a5d3a62e',
      },
    },
  },
  // The box must be carried from (1,1) to the button at (4,1) without
  // entering the fizzler at (2,1), which sends it back: round the loop that
  // is 11 moves, or 8 when crossing row 4 through the portal faces (0,4) and
  // (6,4); then 2 more from the button to the exit. So 10 moves with both
  // portals, and 13 moves with none (one portal crosses nothing)
  {
    name: 'fizzler_box',
    covers: 'A fizzler sends a carried box back to its start, so the box goes round it, crossing the top corridor through a portal or walking the long way.',
    chamber: fizzlerBox,
    fewestMoves: {
      actions: [
        'interact',
        'up',
        'up',
        'up',
        'turnRight',
        'orange',
        'turnLeft',
        'blue',
        'left',
        'down',
        'down',
        'down',
        'left',
        'interact',
        'right',
        'right',
      ],
      expected: {
        completed: true,
        moves: 10,
        portals: 2,
        finalHash: '8c0fc0dd',
      },
    },
    fewestPortals: {
      actions: [
        'interact',
        'up',
        'up',
        'up',
        'right',
        'right',
        'right',
        'right',
        'down',
        'down',
        'down',
        'left',
        'interact',
        'right',
        'right',
      ],
      expected: {
        completed: true,
        moves: 13,
        portals: 0,
        finalHash: '8d8eebce',
      },
    },
  },
  // No wall takes portals. The left arrow at (3,1) closes the short way
  // along the bottom, so (5,1), the exit's only neighbour, is reached only
  // down column 5 from row 4, itself reached only up column 1: 3 + 4 + 3 + 1
  // = 11 moves. The down arrow at (3,3) leads to (3,2), which both arrows
  // keep the subject from leaving: a dead end
  {
    name: 'arrow_trap',
    covers: 'One-way arrows: one closes the short way to the exit, another drops the subject into a pocket it can never leave.',
    chamber: arrowTrap,
    fewestMoves: {
      actions: [
        'up',
        'up',
        'up',
        'right',
        'right',
        'right',
        'right',
        'down',
        'down',
        'down',
        'right',
      ],
      expected: {
        completed: true,
        moves: 11,
        portals: 0,
        finalHash: 'f5b29422',
      },
    },
    fewestPortals: {
      actions: [
        'up',
        'up',
        'up',
        'right',
        'right',
        'right',
        'right',
        'down',
        'down',
        'down',
        'right',
      ],
      expected: {
        completed: true,
        moves: 11,
        portals: 0,
        finalHash: 'f5b29422',
      },
    },
  },
]
