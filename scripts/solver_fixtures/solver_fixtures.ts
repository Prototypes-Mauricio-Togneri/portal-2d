import type {ChamberData} from '@/game/chamber_data'
import type {ReplayExpectation} from '@/game/replay_data'
import type {Action} from '@/game/rules/action'
import arrowTrap from '@scripts/solver_fixtures/arrow_trap.json'
import boxOnButton from '@scripts/solver_fixtures/box_on_button.json'
import boxThroughPortal from '@scripts/solver_fixtures/box_through_portal.json'
import fizzlerBox from '@scripts/solver_fixtures/fizzler_box.json'
import freeHands from '@scripts/solver_fixtures/free_hands.json'
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
  // left, so the only crossings land on (1,1) or (5,1). (5,1) is a dead end
  // below the exit at (5,2), reached on foot only through the exit, so the
  // first crossing walks left from (1,1), which takes at least 3 moves to
  // reach; the crossing and the step up onto the exit make 5 moves, the
  // least, and a crossing needs both portals. Without a crossing (0 or 1
  // portal) the subject walks round the top, at least the 6 tiles between it
  // and the exit
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
        'up',
      ],
      expected: {
        completed: true,
        moves: 5,
        portals: 2,
        finalHash: '25eacbf6',
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
      ],
      expected: {
        completed: true,
        moves: 6,
        portals: 0,
        finalHash: '4d6f36bc',
      },
    },
  },
  // The ditch cuts the box's side from the button and the exit, so the box
  // reaches the button only carried through the one crossing, walking left
  // from (1,1) into (0,1) and out at (5,1), which needs both portals. The box
  // at (2,2) isn't next to (1,1), so the subject needs at least 1 move to a
  // tile next to it, (2,1) or (1,2), where it picks the box up facing it,
  // and 1 back to (1,1); then 1 to cross, coming out at (5,1) facing the
  // button, where it puts the box down without a move; then 2 up to the
  // exit: 5, so one route is both optimums
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
        'turnUp',
        'interact',
        'left',
        'left',
        'interact',
        'up',
        'up',
      ],
      expected: {
        completed: true,
        moves: 5,
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
        'turnUp',
        'interact',
        'left',
        'left',
        'interact',
        'up',
        'up',
      ],
      expected: {
        completed: true,
        moves: 5,
        portals: 2,
        finalHash: '8a928f4b',
      },
    },
  },
  // No wall takes portals and the button is far from the door, so the box
  // must be on the button when the subject steps into the doorway. The
  // subject picks the box at (3,1) up facing it from a tile next to it,
  // (2,1) or (3,2), each 3 moves away, and puts it down on the button facing
  // it from a tile next to it, (2,1) or (1,2). From the start to where it
  // picks the box up, then to where it puts it down, then through (3,3) to
  // the exit: from (2,1) for both, 3 + 0 + 6 = 9, and any other pair at
  // least 11. So 9 moves with no portal
  {
    name: 'box_on_button',
    covers: 'A box left on a button holds open the door the subject must pass on its way to the exit.',
    chamber: boxOnButton,
    fewestMoves: {
      actions: [
        'down',
        'down',
        'right',
        'interact',
        'turnLeft',
        'interact',
        'up',
        'up',
        'right',
        'right',
        'right',
        'right',
      ],
      expected: {
        completed: true,
        moves: 9,
        portals: 0,
        finalHash: '83f1c2dd',
      },
    },
    fewestPortals: {
      actions: [
        'down',
        'down',
        'right',
        'interact',
        'turnLeft',
        'interact',
        'up',
        'up',
        'right',
        'right',
        'right',
        'right',
      ],
      expected: {
        completed: true,
        moves: 9,
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
  // The box must reach the button at (4,1) without entering the fizzler at
  // (2,1), which sends a carried box back and takes no box put down. It is
  // put down on the button facing it, from (5,1) or from (3,1), reached
  // without the fizzler only through (5,1); so it is carried to (5,1). The
  // subject picks it up facing it from the start, with no move: (1,3), the
  // only other tile next to it, is at least 12 moves away round the loop,
  // since the box keeps the subject off (1,2). Carried from (1,1) to (5,1),
  // round the loop that is 10 moves, or 7 when crossing row 4 through the
  // portal faces (0,4) and (6,4); then 1 more onto the exit. So 8 moves with
  // both portals, and 11 moves with none (one portal crosses nothing). The
  // box is put down at (2,4) for the shots, which take free hands and fly
  // over it, and picked up again, which costs no move
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
        'interact',
        'orange',
        'turnLeft',
        'blue',
        'turnRight',
        'interact',
        'left',
        'down',
        'down',
        'down',
        'turnLeft',
        'interact',
        'right',
      ],
      expected: {
        completed: true,
        moves: 8,
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
        'turnLeft',
        'interact',
        'right',
      ],
      expected: {
        completed: true,
        moves: 11,
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
  // No wall takes portals. The exit at (5,0) is open only while the button
  // at (7,1) is held, and isn't next to it, so the box at (2,2) must be left
  // on the button. The one-way arrow at (3,2) is the only way right and can't
  // be crossed back, so the subject carries the box across. The switch at
  // (4,3), which opens the door at (7,2) to the button, refuses while the
  // subject carries the box, and the box is put down on the button only
  // from (7,2), facing it, the button's one neighbour that isn't wall. So
  // the subject walks from the start to the switch, at least 4 moves, then
  // to (7,2), at least 4, then to the exit, at least 6: 14. The route takes
  // each leg's shortest walk: it picks the box up facing it from the start,
  // puts it down facing (5,2) from (4,2), and from (5,3), after the switch,
  // picks it up again facing it. 14 moves, the same route for both pars
  {
    name: 'free_hands',
    covers: 'Putting a box down to free the hands: the switch that opens the door to the button refuses while the subject carries the box, which a one-way arrow made it bring along.',
    chamber: freeHands,
    fewestMoves: {
      actions: [
        'interact',
        'right',
        'right',
        'right',
        'interact',
        'up',
        'interact',
        'right',
        'turnDown',
        'interact',
        'right',
        'right',
        'down',
        'interact',
        'up',
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
        finalHash: '4c7fd45d',
      },
    },
    fewestPortals: {
      actions: [
        'interact',
        'right',
        'right',
        'right',
        'interact',
        'up',
        'interact',
        'right',
        'turnDown',
        'interact',
        'right',
        'right',
        'down',
        'interact',
        'up',
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
        finalHash: '4c7fd45d',
      },
    },
  },
]
