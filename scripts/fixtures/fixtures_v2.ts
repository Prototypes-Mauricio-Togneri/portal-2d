import type {ChamberData} from '@/game/chamber_data'
import type {ReplayExpectation, ReplayStep} from '@/game/replay_data'
import boxLinkedButton from '@scripts/fixtures/box_linked_button.json'
import buttonBehindCarriedBox from '@scripts/fixtures/button_behind_carried_box.json'
import carriedBoxLink from '@scripts/fixtures/carried_box_link.json'
import crossingLasers from '@scripts/fixtures/crossing_lasers.json'
import fizzlersInARow from '@scripts/fixtures/fizzlers_in_a_row.json'
import openEdge from '@scripts/fixtures/open_edge.json'
import portalOntoClosedExit from '@scripts/fixtures/portal_onto_closed_exit.json'
import portalOntoDitch from '@scripts/fixtures/portal_onto_ditch.json'
import portalOntoFizzler from '@scripts/fixtures/portal_onto_fizzler.json'
import portalOntoLaser from '@scripts/fixtures/portal_onto_laser.json'
import twoButtonsOneDoor from '@scripts/fixtures/two_buttons_one_door.json'

// Short replays on the v2 rules, on the tiny chambers of today's behaviour
// fixtures (the JSON files next to this one): each pins how v2 plays a
// change from today's rules (docs/elements.md, "Changes from the original
// rules"), and a few pin how undo and redo replay. The replay check runs
// them. Unlike today's fixtures (fixtures.ts), they stay once today's rules
// are deleted. The chambers are read without the layout checks, so the one
// open at the edge still plays

/**
 * A replay pinning one behaviour of the v2 rules.
 */
export type FixtureV2 = {
  readonly name: string // Short id, used in the replay check's report
  readonly behaviour: string // The behaviour it pins, in plain words
  readonly chamber: ChamberData // The tiny chamber it is played on
  readonly actions: readonly ReplayStep[] // The presses, in order
  readonly expected: ReplayExpectation // What replaying the presses gives
}

/** Every fixture of the v2 rules, run by the replay check */
export const FIXTURES_V2: readonly FixtureV2[] = [
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
    name: 'portal_onto_closed_exit_refused',
    behaviour: 'Coming out of a portal onto the closed exit is refused, so the chamber is not completed.',
    chamber: portalOntoClosedExit,
    actions: [
      'blue',
      'up',
      'orange',
      'up',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 2,
      finalHash: 'af6e425b',
    },
  },
  {
    name: 'portal_onto_fizzler_fizzles_at_once',
    behaviour: 'Coming out of a portal onto an active fizzler fizzles in the same step, so stepping off at once still loses both portals.',
    chamber: portalOntoFizzler,
    actions: [
      'blue',
      'up',
      'orange',
      'up',
      'left',
    ],
    expected: {
      completed: false,
      moves: 3,
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
      finalHash: '4d0e555b',
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
      finalHash: 'f87d5783',
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
      'right',
      'interact',
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
    name: 'undo_back_to_start',
    behaviour: 'Undo takes back every step, through a portal crossing and a box carried off a button, to the start (the hash of replaying no presses). One more undo changes nothing, and undone moves and portals still count.',
    chamber: buttonBehindCarriedBox,
    actions: [
      'interact',
      'turnUp',
      'blue',
      'right',
      'turnDown',
      'orange',
      'down',
      'undo',
      'undo',
      'undo',
      'undo',
      'undo',
      'undo',
      'undo',
      'undo',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 2,
      finalHash: 'df038ff1',
    },
  },
  {
    name: 'redo_until_a_new_step',
    behaviour: 'Redo takes undone steps again until a new step, which forgets the rest: the run ends where the first five presses alone end, and redo then changes nothing. Redo counts no moves or portals.',
    chamber: buttonBehindCarriedBox,
    actions: [
      'interact',
      'turnUp',
      'blue',
      'right',
      'turnDown',
      'orange',
      'down',
      'undo',
      'undo',
      'undo',
      'undo',
      'undo',
      'redo',
      'redo',
      'turnDown',
      'redo',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 2,
      finalHash: '984c90e5',
    },
  },
  {
    name: 'undo_after_carrying_a_box_off_a_button',
    behaviour: 'Undo after carrying a box off a button brings back the state after the pick-up, the button pressed and its door open (the hash of replaying the first press alone).',
    chamber: buttonBehindCarriedBox,
    actions: [
      'interact',
      'right',
      'undo',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: 'c71db24b',
    },
  },
]
