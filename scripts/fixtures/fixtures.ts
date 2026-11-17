import type {ChamberData} from '@/game/chamber_data'
import type {ReplayExpectation} from '@/game/replay_data'
import type {Action} from '@/game/rules/action'
import blockedWall from '@scripts/fixtures/blocked_wall.json'
import boxInReach from '@scripts/fixtures/box_in_reach.json'
import boxLinkedButton from '@scripts/fixtures/box_linked_button.json'
import boxOnSwitchedElement from '@scripts/fixtures/box_on_switched_element.json'
import boxOutOfReach from '@scripts/fixtures/box_out_of_reach.json'
import boxPutDownInFront from '@scripts/fixtures/box_put_down_in_front.json'
import boxPutDownOnOpenDitch from '@scripts/fixtures/box_put_down_on_open_ditch.json'
import buttonBehindCarriedBox from '@scripts/fixtures/button_behind_carried_box.json'
import carriedBoxLink from '@scripts/fixtures/carried_box_link.json'
import crossingLasers from '@scripts/fixtures/crossing_lasers.json'
import fizzlersInARow from '@scripts/fixtures/fizzlers_in_a_row.json'
import lightBarrier from '@scripts/fixtures/light_barrier.json'
import noPortalBehindEndPlate from '@scripts/fixtures/no_portal_behind_end_plate.json'
import noPortalBesideDoor from '@scripts/fixtures/no_portal_beside_door.json'
import openEdge from '@scripts/fixtures/open_edge.json'
import portalOntoBox from '@scripts/fixtures/portal_onto_box.json'
import portalOntoDitch from '@scripts/fixtures/portal_onto_ditch.json'
import portalOntoFizzler from '@scripts/fixtures/portal_onto_fizzler.json'
import portalOntoLaser from '@scripts/fixtures/portal_onto_laser.json'
import twoBoxesFizzler from '@scripts/fixtures/two_boxes_fizzler.json'
import twoButtonsOneDoor from '@scripts/fixtures/two_buttons_one_door.json'

// Short replays on tiny chambers (the JSON files next to this one): each pins
// how the rules play a change from the original rules (docs/elements.md,
// "Changes from the original rules") or an element the original game didn't
// have (the light barrier, the blocked wall that a link switches). The replay
// check runs them. The chambers are read without the layout checks, so the one
// open at the edge still plays

/**
 * A replay pinning one behaviour of the rules.
 */
export type Fixture = {
  readonly name: string // Short id, used in the replay check's report
  readonly behaviour: string // The behaviour it pins, in plain words
  readonly chamber: ChamberData // The tiny chamber it is played on
  readonly actions: readonly Action[] // The presses, in order
  readonly expected: ReplayExpectation // What replaying the presses gives
}

/** Every behaviour fixture, run by the replay check */
export const FIXTURES: readonly Fixture[] = [
  {
    name: 'portal_onto_open_ditch_refused',
    behaviour: 'Coming out of a portal onto an open ditch is refused, so the subject stays in front of the portal it walked into.',
    chamber: portalOntoDitch,
    actions: [
      'blue',
      'turnLeft',
      'orange',
      'left',
    ],
    expected: {
      completed: false,
      moves: 0,
      portals: 2,
      finalHash: 'b7a5e3c2',
    },
  },
  {
    name: 'portal_onto_active_laser_refused',
    behaviour: 'Coming out of a portal into an active laser is refused, so the subject stays in front of the portal it walked into.',
    chamber: portalOntoLaser,
    actions: [
      'blue',
      'turnLeft',
      'orange',
      'left',
    ],
    expected: {
      completed: false,
      moves: 0,
      portals: 2,
      finalHash: 'b7a5e3c2',
    },
  },
  {
    name: 'portal_onto_box_refused',
    behaviour: 'Coming out of a portal onto a tile where a box rests is refused, so the subject stays in front of the portal it walked into.',
    chamber: portalOntoBox,
    actions: [
      'blue',
      'turnLeft',
      'orange',
      'left',
    ],
    expected: {
      completed: false,
      moves: 0,
      portals: 2,
      finalHash: '35439ece',
    },
  },
  {
    name: 'portal_onto_fizzler_fizzles_at_once',
    behaviour: 'Coming out of a portal into a fizzler that the crossing itself switches on, by leaving the button that held it off, fizzles in the same step, so stepping off at once still loses both portals.',
    chamber: portalOntoFizzler,
    actions: [
      'blue',
      'turnLeft',
      'orange',
      'left',
      'left',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 2,
      finalHash: 'e3e6fbbd',
    },
  },
  {
    name: 'carried_box_off_button_closes_door_at_once',
    behaviour: 'Carrying a box off a button releases it in the same step, so the door it held open is closed before the subject reaches it.',
    chamber: buttonBehindCarriedBox,
    actions: [
      'interact',
      'right',
      'right',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: 'c9ff4773',
    },
  },
  {
    name: 'carried_box_buttons_in_list_order',
    behaviour: 'Carrying a box off a button onto a second button linked to the same door judges the buttons in list order, so the door ends open and the subject walks into the doorway.',
    chamber: twoButtonsOneDoor,
    actions: [
      'interact',
      'right',
      'right',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: 'dd686733',
    },
  },
  {
    name: 'fizzler_rule_every_step',
    behaviour: 'Nothing remembers having been inside a field: a portal shot from a switched-off fizzler closes as the subject walks into the next field that is on.',
    chamber: fizzlersInARow,
    actions: [
      'right',
      'right',
      'turnUp',
      'blue',
      'right',
    ],
    expected: {
      completed: false,
      moves: 3,
      portals: 1,
      finalHash: 'be0730bd',
    },
  },
  {
    name: 'edge_is_wall',
    behaviour: 'Outside the chamber\'s edge is wall, so the subject can\'t walk out through an open tile on the edge.',
    chamber: openEdge,
    actions: [
      'right',
      'right',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '75364d6f',
    },
  },
  {
    name: 'crossing_lasers_either_blocks',
    behaviour: 'Of two lasers crossing on a tile, the one still on keeps the subject out after the first listed is switched off.',
    chamber: crossingLasers,
    actions: [
      'right',
      'interact',
      'right',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '090aa887',
    },
  },
  {
    name: 'carried_box_link_does_nothing',
    behaviour: 'Stepping onto a button linked to the box the subject carries leaves the box with the subject, so the button under the box\'s start tile stays up and its door closed.',
    chamber: carriedBoxLink,
    actions: [
      'interact',
      'right',
      'right',
      'right',
    ],
    expected: {
      completed: false,
      moves: 3,
      portals: 0,
      finalHash: '8db96a5a',
    },
  },
  {
    name: 'box_linked_button_release_does_nothing',
    behaviour: 'Releasing a button linked to a box does nothing to the box.',
    chamber: boxLinkedButton,
    actions: [
      'right',
      'right',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: 'ebac8183',
    },
  },
  {
    name: 'no_shot_while_carrying',
    behaviour: 'A shot while carrying a box is refused and opens no portal; with the box put down in front, the same shot opens it.',
    chamber: buttonBehindCarriedBox,
    actions: [
      'interact',
      'turnUp',
      'blue',
      'turnLeft',
      'interact',
      'turnUp',
      'blue',
    ],
    expected: {
      completed: false,
      moves: 0,
      portals: 1,
      finalHash: '96921406',
    },
  },
  {
    name: 'no_box_put_down_on_a_box',
    behaviour: 'A tile holds one box: carrying a box, the subject can\'t put it down on the tile it faces where another box rests, so interact is refused and it keeps carrying the box.',
    chamber: twoBoxesFizzler,
    actions: [
      'interact',
      'left',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '3362c1d2',
    },
  },
  {
    name: 'box_sent_home_sends_box_home',
    behaviour: 'A carried box destroyed by a fizzler goes back to its start tile, and the other box, put down there, goes back to its own start: a tile never holds two boxes.',
    chamber: twoBoxesFizzler,
    actions: [
      'interact',
      'turnRight',
      'interact',
      'left',
      'interact',
      'right',
      'turnLeft',
      'interact',
      'turnRight',
      'interact',
      'right',
      'right',
    ],
    expected: {
      completed: false,
      moves: 4,
      portals: 0,
      finalHash: '42dcec07',
    },
  },
  {
    name: 'box_picked_up_from_faced_tile',
    behaviour: 'Interact picks up the box on the tile the subject faces, without a move: the box comes into its hands, so the button it held is released and its door closes at once.',
    chamber: boxInReach,
    actions: ['interact'],
    expected: {
      completed: false,
      moves: 0,
      portals: 0,
      finalHash: '9cf3eda3',
    },
  },
  {
    name: 'box_blocks_walking',
    behaviour: 'Walking into a resting box only turns the subject to face it, silently: the subject never steps onto the box\'s tile.',
    chamber: boxInReach,
    actions: [
      'turnLeft',
      'right',
      'right',
    ],
    expected: {
      completed: false,
      moves: 0,
      portals: 0,
      finalHash: '94b860e2',
    },
  },
  {
    name: 'box_out_of_reach',
    behaviour: 'Interact leaves a faced box where it is, silently, when something on its tile besides the box would keep a move that way off it (an arrow pointing another way, a laser that is on) or a fizzler there is on.',
    chamber: boxOutOfReach,
    actions: [
      'interact',
      'turnLeft',
      'interact',
      'turnRight',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 0,
      portals: 0,
      finalHash: 'fb502ec1',
    },
  },
  {
    name: 'box_reached_from_fizzler_destroyed',
    behaviour: 'A box picked up from the tile faced while the subject stands in a fizzler that is on is destroyed in the same step: it goes back to its start and isn\'t carried.',
    chamber: boxOutOfReach,
    actions: [
      'down',
      'turnRight',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '2a0205de',
    },
  },
  {
    name: 'no_portal_beside_door_or_exit',
    behaviour: 'A wall side facing a door or the exit takes no portal, even open: a shot past the open exit at the wall behind it misses, and so does one from inside the open door at its frame, while the wall facing plain floor above takes one.',
    chamber: noPortalBesideDoor,
    actions: [
      'blue',
      'right',
      'right',
      'up',
      'turnLeft',
      'orange',
      'up',
      'blue',
    ],
    expected: {
      completed: false,
      moves: 4,
      portals: 1,
      finalHash: '2764e9cf',
    },
  },
  {
    name: 'fizzler_on_closes_portal_facing_it',
    behaviour: 'A portal shot past a fizzler while it is off, onto the wall behind it, closes when the fizzler switches on.',
    chamber: portalOntoFizzler,
    actions: [
      'blue',
      'up',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 1,
      finalHash: 'adeb77c9',
    },
  },
  {
    name: 'no_portal_behind_end_plate',
    behaviour: 'The wall at the end of a run of lasers or light barriers, behind its end plate, takes no portal, on or off: a shot along the lasers that are on misses, and so does one from inside the light barrier that is off at the wall it runs into, while the wall alongside the lasers takes one.',
    chamber: noPortalBehindEndPlate,
    actions: [
      'blue',
      'left',
      'turnUp',
      'orange',
      'down',
      'right',
      'right',
      'right',
      'turnUp',
      'blue',
    ],
    expected: {
      completed: false,
      moves: 5,
      portals: 1,
      finalHash: 'f6c42292',
    },
  },
  {
    name: 'light_barrier_switches_off_and_on',
    behaviour: 'A light barrier that is on stops a shot and the subject; switched off by a button, it lets both through, and it is on again once the button is released.',
    chamber: lightBarrier,
    actions: [
      'orange',
      'right',
      'blue',
      'right',
      'right',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 1,
      finalHash: '9b3c0610',
    },
  },
  {
    name: 'blocked_wall_switches_off_and_on',
    behaviour: 'A blocked wall refuses a portal; unblocked by a button, it takes one, and once the button is released it is blocked again and the portal on it closes, staying closed when the button goes down again.',
    chamber: blockedWall,
    actions: [
      'orange',
      'right',
      'orange',
      'right',
      'left',
    ],
    expected: {
      completed: false,
      moves: 3,
      portals: 1,
      finalHash: 'fb67a237',
    },
  },
  {
    name: 'box_breaks_up_in_closing_door',
    behaviour: 'A box put down in an open doorway, from the tile before it, goes back to its start when the door closes on it: here the button holding the door open is released by the subject picking up the other box from it.',
    chamber: boxOnSwitchedElement,
    actions: [
      'interact',
      'turnRight',
      'interact',
      'left',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '39ab4f49',
    },
  },
  {
    name: 'box_falls_into_opening_ditch',
    behaviour: 'A box put down on a bridged ditch goes back to its start when the ditch opens under it.',
    chamber: boxOnSwitchedElement,
    actions: [
      'interact',
      'right',
      'interact',
      'left',
      'left',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 3,
      portals: 0,
      finalHash: '39ab4f49',
    },
  },
  {
    name: 'box_breaks_up_in_laser_turning_on',
    behaviour: 'A box put down in a laser that is off goes back to its start when the laser turns on.',
    chamber: boxOnSwitchedElement,
    actions: [
      'interact',
      'right',
      'right',
      'interact',
      'left',
      'left',
      'left',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 5,
      portals: 0,
      finalHash: '39ab4f49',
    },
  },
  {
    name: 'box_breaks_up_in_light_barrier_turning_on',
    behaviour: 'A box put down in a light barrier that is off goes back to its start when the light barrier turns on.',
    chamber: boxOnSwitchedElement,
    actions: [
      'interact',
      'right',
      'right',
      'right',
      'interact',
      'left',
      'left',
      'left',
      'left',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 7,
      portals: 0,
      finalHash: '39ab4f49',
    },
  },
  {
    name: 'box_breaks_up_in_fizzler_turning_on',
    behaviour: 'A box put down in a fizzler that is off goes back to its start when the fizzler turns on, though the subject is outside it.',
    chamber: boxOnSwitchedElement,
    actions: [
      'interact',
      'right',
      'right',
      'right',
      'right',
      'interact',
      'left',
      'left',
      'left',
      'left',
      'left',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 9,
      portals: 0,
      finalHash: '39ab4f49',
    },
  },
  {
    name: 'box_sent_home_under_subject',
    behaviour: 'A box sent back to its start while the subject stands there lands under it (here the box put in the open doorway, destroyed as the subject, standing on its start, picks up the other box from the button holding the door open). With free hands, interact doesn\'t pick up the box underfoot; the subject walks off, can\'t walk back onto it, and picks it up from beside, facing it.',
    chamber: boxOnSwitchedElement,
    actions: [
      'interact',
      'turnRight',
      'interact',
      'left',
      'interact',
      'interact',
      'turnUp',
      'interact',
      'right',
      'left',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: '91d68c0b',
    },
  },
  {
    name: 'box_not_put_down_facing_open_ditch',
    behaviour: 'A carried box is never put down on an open ditch: facing one, here opened by picking up the box from the button bridging it, interact is refused and the box stays carried.',
    chamber: boxPutDownOnOpenDitch,
    actions: [
      'interact',
      'turnRight',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 0,
      portals: 0,
      finalHash: '4d0e555b',
    },
  },
  {
    name: 'box_put_down_in_front',
    behaviour: 'Interact puts a carried box down on the tile the subject faces: from beside a button, it holds the button down, and the door it opens lets the subject through.',
    chamber: boxPutDownInFront,
    actions: [
      'interact',
      'left',
      'interact',
      'right',
      'right',
      'right',
      'right',
      'right',
    ],
    expected: {
      completed: false,
      moves: 6,
      portals: 0,
      finalHash: '6193fc1b',
    },
  },
  {
    name: 'box_not_put_down_facing_wall',
    behaviour: 'A carried box is never put down on the subject\'s own tile: facing a wall, interact is refused and the box stays carried.',
    chamber: boxPutDownInFront,
    actions: [
      'interact',
      'turnUp',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 0,
      portals: 0,
      finalHash: '13ad7228',
    },
  },
  {
    name: 'box_not_put_down_facing_exit',
    behaviour: 'A carried box is never put down on the exit: facing the open exit, interact is refused and the box stays carried.',
    chamber: boxPutDownInFront,
    actions: [
      'interact',
      'left',
      'turnUp',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '384488c0',
    },
  },
  {
    name: 'box_not_put_down_facing_switch',
    behaviour: 'A carried box is never put down on a switch: facing one, interact is refused and the box stays carried.',
    chamber: boxPutDownInFront,
    actions: [
      'interact',
      'turnRight',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 0,
      portals: 0,
      finalHash: 'c9ff4773',
    },
  },
  {
    name: 'box_kept_on_switch',
    behaviour: 'Standing on a switch, interact with a box in hand is refused, though the tile faced could take the box: the subject keeps carrying it.',
    chamber: boxPutDownInFront,
    actions: [
      'interact',
      'right',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '803703a3',
    },
  },
  {
    name: 'box_not_put_down_facing_a_box',
    behaviour: 'A carried box is never put down where another box rests: facing one, here holding a button down, interact is refused and the box stays carried.',
    chamber: boxOnSwitchedElement,
    actions: [
      'interact',
      'left',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: 'f3176963',
    },
  },
  {
    name: 'box_not_put_down_facing_fizzler',
    behaviour: 'A carried box is never put down in a fizzler that is on: facing one, interact is refused and the box stays carried.',
    chamber: twoBoxesFizzler,
    actions: [
      'interact',
      'right',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: 'ed3e6ba3',
    },
  },
]

/**
 * A fixture chamber, named after the first fixture played on it.
 */
export type FixtureChamber = {
  readonly name: string // The first fixture's name
  readonly chamber: ChamberData // The tiny chamber
}

/**
 * Lists each fixture chamber once, for the checks that run on every chamber
 * rather than on a fixture's presses.
 * @returns The chambers, in the order the fixtures first use them
 */
export function listFixtureChambers(): FixtureChamber[] {
  const seen = new Set<ChamberData>()
  const chambers: FixtureChamber[] = []

  for (const fixture of FIXTURES) {
    if (!seen.has(fixture.chamber)) {
      seen.add(fixture.chamber)
      chambers.push({
        name: fixture.name,
        chamber: fixture.chamber,
      })
    }
  }

  return chambers
}
