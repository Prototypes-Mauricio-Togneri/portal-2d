import type {ChamberData} from '@/game/chamber_data'
import type {ReplayExpectation} from '@/game/replay_data'
import type {Action} from '@/game/rules/action'
import arrowBox from '@scripts/fixtures/arrow_box.json'
import arrowButton from '@scripts/fixtures/arrow_button.json'
import arrowPortal from '@scripts/fixtures/arrow_portal.json'
import arrowSlide from '@scripts/fixtures/arrow_slide.json'
import arrowSwitch from '@scripts/fixtures/arrow_switch.json'
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
import rayDeviceShots from '@scripts/fixtures/ray_device_shots.json'
import rayEmitterButton from '@scripts/fixtures/ray_emitter_button.json'
import rayFloorElements from '@scripts/fixtures/ray_floor_elements.json'
import rayMirrorFizzler from '@scripts/fixtures/ray_mirror_fizzler.json'
import rayMirrorPortal from '@scripts/fixtures/ray_mirror_portal.json'
import rayMirrors from '@scripts/fixtures/ray_mirrors.json'
import rayOwnDoor from '@scripts/fixtures/ray_own_door.json'
import rayPortals from '@scripts/fixtures/ray_portals.json'
import rayReceiverButton from '@scripts/fixtures/ray_receiver_button.json'
import rayReceiverDoor from '@scripts/fixtures/ray_receiver_door.json'
import rayReceiversDoors from '@scripts/fixtures/ray_receivers_doors.json'
import rayRelay from '@scripts/fixtures/ray_relay.json'
import raySlide from '@scripts/fixtures/ray_slide.json'
import rayStoppers from '@scripts/fixtures/ray_stoppers.json'
import rayTwoEmitters from '@scripts/fixtures/ray_two_emitters.json'
import slideArrowsExit from '@scripts/fixtures/slide_arrows_exit.json'
import slideBlockers from '@scripts/fixtures/slide_blockers.json'
import slideButtons from '@scripts/fixtures/slide_buttons.json'
import slideCrossingBlocked from '@scripts/fixtures/slide_crossing_blocked.json'
import slideFizzler from '@scripts/fixtures/slide_fizzler.json'
import slideLane from '@scripts/fixtures/slide_lane.json'
import slideLoop from '@scripts/fixtures/slide_loop.json'
import slidePortals from '@scripts/fixtures/slide_portals.json'
import twoBoxesFizzler from '@scripts/fixtures/two_boxes_fizzler.json'
import twoButtonsOneDoor from '@scripts/fixtures/two_buttons_one_door.json'

// Short replays on tiny chambers (the JSON files next to this one): each pins
// how the rules play a change from the original rules (docs/elements.md,
// "Changes from the original rules") or an element the original game didn't
// have (the light barrier, the blocked wall that a link switches, the slide
// floor, the arrow that a link turns, and the emitter, its ray, the receiver
// and the mirror box). The replay check runs them. The chambers are read without the layout
// checks, so the one open at the edge still plays

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
  {
    name: 'slide_stops_at_wall',
    behaviour: 'Stepping onto slide floor keeps the subject moving the same way, tile by tile, until a wall stops it on the last slide floor tile, all in one step that counts as one move.',
    chamber: slideLane,
    actions: ['right'],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: 'df4f72c1',
    },
  },
  {
    name: 'slide_stops_on_plain_floor',
    behaviour: 'A slide that runs off the slide floor stops on the first plain floor tile it enters.',
    chamber: slideLane,
    actions: [
      'up',
      'right',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: '378464c6',
    },
  },
  {
    name: 'slide_floor_to_plain_floor_steps',
    behaviour: 'At rest on slide floor, a move onto plain floor steps one tile and stops there, though plain floor lies beyond.',
    chamber: slideLane,
    actions: [
      'right',
      'up',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: 'ef4c0399',
    },
  },
  {
    name: 'slide_floor_to_slide_floor_slides',
    behaviour: 'At rest on slide floor, a move onto the next slide floor tile slides again, here back along the whole lane onto the plain floor at its end.',
    chamber: slideLane,
    actions: [
      'right',
      'left',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: 'af728a9b',
    },
  },
  {
    name: 'slide_floor_turn_stays',
    behaviour: 'Turning in place on slide floor only turns the subject: it doesn\'t slide.',
    chamber: slideLane,
    actions: [
      'right',
      'turnLeft',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: 'e70b37d8',
    },
  },
  {
    name: 'slide_carries_box',
    behaviour: 'A carried box slides with the subject to the tile where the slide stops, and from there it is put down on slide floor as on plain floor.',
    chamber: slideLane,
    actions: [
      'up',
      'interact',
      'right',
      'turnDown',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: '1f302d65',
    },
  },
  {
    name: 'slide_through_portal_slides_on',
    behaviour: 'A slide into a portal comes out of the other one and, coming out onto slide floor, slides on the way it came out, stopping on the first plain floor tile.',
    chamber: slidePortals,
    actions: [
      'blue',
      'turnUp',
      'orange',
      'right',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 2,
      finalHash: '8e19bd54',
    },
  },
  {
    name: 'portal_onto_slide_floor_slides',
    behaviour: 'Walking from plain floor into a portal that comes out onto slide floor slides on from there, the way the subject came out.',
    chamber: slidePortals,
    actions: [
      'turnLeft',
      'blue',
      'turnUp',
      'orange',
      'left',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 2,
      finalHash: 'fc8d324b',
    },
  },
  {
    name: 'slide_through_portal_onto_plain_floor_stops',
    behaviour: 'A slide into a portal that comes out onto plain floor stops on that tile.',
    chamber: slidePortals,
    actions: [
      'blue',
      'up',
      'turnRight',
      'orange',
      'down',
      'right',
    ],
    expected: {
      completed: false,
      moves: 3,
      portals: 2,
      finalHash: '6d6c50b5',
    },
  },
  {
    name: 'slide_back_to_start_no_move',
    behaviour: 'A slide that a portal brings back onto the tile it started from counts no move: the subject ends where it started, facing the way it came out of the portal in the floor, unlike a refused move, which would leave it facing the way pressed.',
    chamber: slidePortals,
    actions: [
      'turnDown',
      'blue',
      'turnRight',
      'orange',
      'right',
    ],
    expected: {
      completed: false,
      moves: 0,
      portals: 2,
      finalHash: '88a62f1f',
    },
  },
  {
    name: 'slide_crossing_blocked_stops_silently',
    behaviour: 'Mid-slide, a portal that would bring the subject out onto a tile it can\'t enter (here an open ditch) stops the slide in front of that portal, silently, where a crossing tried from rest would be refused.',
    chamber: slideCrossingBlocked,
    actions: [
      'blue',
      'turnUp',
      'orange',
      'right',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 2,
      finalHash: '11eb7c0e',
    },
  },
  {
    name: 'slide_loop_refused',
    behaviour: 'A slide that would enter the same tile the same way twice, looping through two portals, is refused as a whole: the subject stays where it was, only turned the way pressed, and no move counts.',
    chamber: slideLoop,
    actions: [
      'turnLeft',
      'blue',
      'turnRight',
      'orange',
      'turnUp',
      'right',
    ],
    expected: {
      completed: false,
      moves: 0,
      portals: 2,
      finalHash: '1809a085',
    },
  },
  {
    name: 'slide_through_fizzler',
    behaviour: 'A fizzler that is on, passed mid-slide, closes both portals and sends the carried box back to its start, and the slide goes on past it.',
    chamber: slideFizzler,
    actions: [
      'turnLeft',
      'blue',
      'turnDown',
      'orange',
      'turnUp',
      'interact',
      'right',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 2,
      finalHash: 'b94cf858',
    },
  },
  {
    name: 'slide_stops_before_wrong_way_arrow',
    behaviour: 'A slide stops in front of an arrow pointing another way, as a step would.',
    chamber: slideArrowsExit,
    actions: ['right'],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '736c8686',
    },
  },
  {
    name: 'slide_stops_on_arrow',
    behaviour: 'A slide enters an arrow pointing its way and stops on it, though slide floor lies beyond, since an arrow isn\'t slide floor.',
    chamber: slideArrowsExit,
    actions: [
      'up',
      'up',
      'right',
    ],
    expected: {
      completed: false,
      moves: 3,
      portals: 0,
      finalHash: '60f666bb',
    },
  },
  {
    name: 'slide_onto_open_exit_completes',
    behaviour: 'A slide that enters the open exit stops there, though slide floor lies beyond, and completes the chamber.',
    chamber: slideArrowsExit,
    actions: [
      'up',
      'up',
      'up',
      'up',
      'right',
    ],
    expected: {
      completed: true,
      moves: 5,
      portals: 0,
      finalHash: '43cb3598',
    },
  },
  {
    name: 'slide_stops_before_open_ditch',
    behaviour: 'A slide stops in front of an open ditch.',
    chamber: slideBlockers,
    actions: ['left'],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '4060a23a',
    },
  },
  {
    name: 'slide_stops_before_laser',
    behaviour: 'A slide stops in front of a laser that is on.',
    chamber: slideBlockers,
    actions: ['right'],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '17b1da87',
    },
  },
  {
    name: 'slide_stops_before_light_barrier',
    behaviour: 'A slide stops in front of a light barrier that is on.',
    chamber: slideBlockers,
    actions: [
      'up',
      'up',
      'left',
    ],
    expected: {
      completed: false,
      moves: 3,
      portals: 0,
      finalHash: '3a893384',
    },
  },
  {
    name: 'slide_stops_before_box',
    behaviour: 'A slide stops in front of a resting box, as a step does.',
    chamber: slideBlockers,
    actions: [
      'up',
      'up',
      'right',
    ],
    expected: {
      completed: false,
      moves: 3,
      portals: 0,
      finalHash: '47bc9ac1',
    },
  },
  {
    name: 'slide_passes_button',
    behaviour: 'Sliding over a button doesn\'t press it, so neither of its doors changes: the closed one stays closed, and the open one, which a press and a release on the way would have closed, stays open.',
    chamber: slideButtons,
    actions: ['right'],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '6ba2cb65',
    },
  },
  {
    name: 'slide_stops_on_button',
    behaviour: 'A slide that stops on a button presses it, and the door it opens opens in the same step.',
    chamber: slideButtons,
    actions: [
      'up',
      'up',
      'right',
    ],
    expected: {
      completed: false,
      moves: 3,
      portals: 0,
      finalHash: 'eef8f80b',
    },
  },
  {
    name: 'arrow_turned_back_under_subject',
    behaviour: 'A button turns an arrow while pressed; stepping off it onto the arrow, entered its turned way, turns the arrow back under the subject, which turns with it and can then leave only the arrow\'s own way.',
    chamber: arrowButton,
    actions: [
      'right',
      'right',
      'right',
      'left',
      'up',
    ],
    expected: {
      completed: false,
      moves: 3,
      portals: 0,
      finalHash: 'f49345ce',
    },
  },
  {
    name: 'arrow_turned_back_when_released',
    behaviour: 'An arrow a button turned turns back to its own way when the button comes up, so it is entered its own way again.',
    chamber: arrowButton,
    actions: [
      'right',
      'left',
      'down',
      'right',
      'right',
      'up',
    ],
    expected: {
      completed: false,
      moves: 6,
      portals: 0,
      finalHash: '7e35f401',
    },
  },
  {
    name: 'arrow_turned_by_switch_for_good',
    behaviour: 'A switch turns an arrow for good: leaving the switch doesn\'t turn it back.',
    chamber: arrowSwitch,
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
      finalHash: '00ab08f6',
    },
  },
  {
    name: 'arrow_turns_subject_with_it',
    behaviour: 'A box put down on a button turns the arrow the subject stands on, and the subject turns with it, so its shot flies the arrow\'s new way.',
    chamber: arrowBox,
    actions: [
      'turnUp',
      'interact',
      'right',
      'interact',
      'blue',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 1,
      finalHash: '1593b241',
    },
  },
  {
    name: 'slide_stops_on_turned_arrow',
    behaviour: 'A slide enters an arrow turned to point its way and stops on it.',
    chamber: arrowSlide,
    actions: ['right'],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: 'fa742c4c',
    },
  },
  {
    name: 'slide_stops_before_turned_back_arrow',
    behaviour: 'Once its button comes up, the arrow points its own way again, so a slide stops in front of it.',
    chamber: arrowSlide,
    actions: [
      'turnDown',
      'interact',
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
    name: 'portal_onto_turned_arrow',
    behaviour: 'Coming out of a portal onto an arrow turned to point the way out is allowed.',
    chamber: arrowPortal,
    actions: [
      'blue',
      'turnRight',
      'orange',
      'left',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 2,
      finalHash: '45ad93be',
    },
  },
  {
    name: 'portal_onto_turned_back_arrow_refused',
    behaviour: 'Once its button comes up, the arrow points its own way again, so coming out of a portal onto it the other way is refused.',
    chamber: arrowPortal,
    actions: [
      'turnDown',
      'interact',
      'turnUp',
      'interact',
      'turnLeft',
      'blue',
      'turnRight',
      'orange',
      'left',
    ],
    expected: {
      completed: false,
      moves: 0,
      portals: 2,
      finalHash: 'dc93eaa2',
    },
  },
  {
    name: 'ray_lights_receiver_from_start',
    behaviour: 'An emitter is on unless its file says otherwise, so the chamber\'s start settles with its ray lighting the receiver across the room, which opens the door it links.',
    chamber: rayReceiverDoor,
    actions: [],
    expected: {
      completed: false,
      moves: 0,
      portals: 0,
      finalHash: 'b31ae90f',
    },
  },
  {
    name: 'subject_cuts_ray',
    behaviour: 'The subject stepping into a ray stops it on its tile, so the receiver goes dark and closes its door in the same step.',
    chamber: rayReceiverDoor,
    actions: ['up'],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: 'fcf61e06',
    },
  },
  {
    name: 'subject_leaves_ray',
    behaviour: 'The subject stepping out of a ray lets it on to the receiver, which lights and opens its door again.',
    chamber: rayReceiverDoor,
    actions: [
      'up',
      'down',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: 'e7fc11b6',
    },
  },
  {
    name: 'box_put_down_cuts_ray',
    behaviour: 'A box put down in a ray stops it there, so the receiver goes dark and closes its door.',
    chamber: rayReceiverDoor,
    actions: [
      'turnLeft',
      'interact',
      'turnUp',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 0,
      portals: 0,
      finalHash: 'e9fc8b8f',
    },
  },
  {
    name: 'box_picked_up_from_ray',
    behaviour: 'Picking the box up again lets the ray on past its tile, so the receiver lights and opens its door.',
    chamber: rayReceiverDoor,
    actions: [
      'turnLeft',
      'interact',
      'turnUp',
      'interact',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 0,
      portals: 0,
      finalHash: '852f2908',
    },
  },
  {
    name: 'ray_held_door_closes_behind_subject',
    behaviour: 'A door that starts open lets its own receiver\'s ray through; stepping into that ray in front of it darkens the receiver, the door closes and then stops the ray itself, so it stays closed once the subject steps away.',
    chamber: rayOwnDoor,
    actions: [
      'up',
      'up',
      'down',
    ],
    expected: {
      completed: false,
      moves: 3,
      portals: 0,
      finalHash: '3c9bd467',
    },
  },
  {
    name: 'ray_passes_floor_elements',
    behaviour: 'A ray passes an open ditch, a fizzler, a laser, a button and an arrow, all of them on, and lights the receiver beyond them.',
    chamber: rayFloorElements,
    actions: [],
    expected: {
      completed: false,
      moves: 0,
      portals: 0,
      finalHash: 'b5747409',
    },
  },
  {
    name: 'ray_stopped_by_door_exit_barrier',
    behaviour: 'A closed door, the closed exit and a light barrier that is on each stop a ray, so none of the three receivers lights.',
    chamber: rayStoppers,
    actions: [],
    expected: {
      completed: false,
      moves: 0,
      portals: 0,
      finalHash: 'caf52de2',
    },
  },
  {
    name: 'ray_through_portals',
    behaviour: 'A ray into a portal comes out of the other one, away from its wall, and lights a receiver on that side once the subject steps out of it.',
    chamber: rayPortals,
    actions: [
      'blue',
      'down',
      'down',
      'left',
      'left',
      'turnDown',
      'orange',
      'left',
    ],
    expected: {
      completed: false,
      moves: 5,
      portals: 2,
      finalHash: '481cfc3f',
    },
  },
  {
    name: 'ray_into_lone_portal_stops',
    behaviour: 'A ray into a portal while the other one is closed stops at its wall.',
    chamber: rayPortals,
    actions: [
      'blue',
      'down',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 1,
      finalHash: '4187e968',
    },
  },
  {
    name: 'shots_at_devices_miss',
    behaviour: 'An emitter or a receiver takes no portal on any face: a shot at the emitter\'s side and its firing face, and at the receiver\'s side and its listening face, each misses.',
    chamber: rayDeviceShots,
    actions: [
      'blue',
      'down',
      'right',
      'orange',
      'down',
      'right',
      'turnUp',
      'blue',
      'right',
      'up',
      'up',
      'up',
      'left',
      'turnDown',
      'orange',
    ],
    expected: {
      completed: false,
      moves: 9,
      portals: 0,
      finalHash: '8e71471d',
    },
  },
  {
    name: 'slide_through_ray_changes_nothing',
    behaviour: 'A slide passing through a ray doesn\'t cut it: rays count only once the step settles.',
    chamber: raySlide,
    actions: ['right'],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '71e98203',
    },
  },
  {
    name: 'slide_stopping_in_ray_cuts_it',
    behaviour: 'A slide that stops in a ray cuts it there, so the receiver goes dark and closes its door.',
    chamber: raySlide,
    actions: [
      'down',
      'right',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: '0ed0f7b0',
    },
  },
  {
    name: 'mirror_boxes_turn_rays',
    behaviour: 'A mirror box turns a ray a quarter turn: a / turns a ray going right up, a \\ turns one going right down, each onto a receiver.',
    chamber: rayMirrors,
    actions: [],
    expected: {
      completed: false,
      moves: 0,
      portals: 0,
      finalHash: 'aeab30da',
    },
  },
  {
    name: 'mirror_box_through_portal',
    behaviour: 'A mirror box keeps its mirror through a portal: carried through one and put down in a ray, it turns the ray up onto a receiver.',
    chamber: rayMirrorPortal,
    actions: [
      'blue',
      'right',
      'right',
      'right',
      'turnDown',
      'orange',
      'up',
      'left',
      'left',
      'interact',
      'down',
      'left',
      'left',
      'interact',
    ],
    expected: {
      completed: false,
      moves: 9,
      portals: 2,
      finalHash: 'a5f2b072',
    },
  },
  {
    name: 'fizzled_mirror_box_turns_ray_again',
    behaviour: 'Picking up a mirror box lets the ray it turned run on to the subject, so its receiver goes dark; a fizzler destroying the carried box sends it back to its start, where it turns the ray onto the receiver again.',
    chamber: rayMirrorFizzler,
    actions: [
      'interact',
      'down',
      'right',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: '5ba34694',
    },
  },
  {
    name: 'receiver_relays_to_emitter',
    behaviour: 'A receiver linked to an emitter switches it on as it lights, so a second ray lights a second receiver, which opens a door, all while the start settles.',
    chamber: rayRelay,
    actions: [],
    expected: {
      completed: false,
      moves: 0,
      portals: 0,
      finalHash: '8403ff97',
    },
  },
  {
    name: 'cut_relay_darkens_both',
    behaviour: 'Cutting the first ray darkens its receiver, which switches the second emitter off, so the second receiver goes dark and closes the door in the same step.',
    chamber: rayRelay,
    actions: ['up'],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '56f5ea14',
    },
  },
  {
    name: 'button_switches_emitter_on',
    behaviour: 'A button going down switches on the emitter it links, which starts off, and its ray lights a receiver that opens a door.',
    chamber: rayEmitterButton,
    actions: ['left'],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: 'bb4f5f11',
    },
  },
  {
    name: 'button_switches_emitter_off',
    behaviour: 'The button coming up switches the emitter off again, so the receiver goes dark and closes its door.',
    chamber: rayEmitterButton,
    actions: [
      'left',
      'right',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: 'cd40f601',
    },
  },
  {
    name: 'receivers_hold_each_others_doors',
    behaviour: 'Two rays, each through the door the other\'s receiver opens: a button opening the first door lights the first receiver, which opens the second door, which lights the second receiver, and settling ends with both lit.',
    chamber: rayReceiversDoors,
    actions: ['left'],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '24877157',
    },
  },
  {
    name: 'receivers_let_go_together',
    behaviour: 'The button coming up closes the first door, which darkens the first receiver, which closes the second door, and settling ends with both dark.',
    chamber: rayReceiversDoors,
    actions: [
      'left',
      'right',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: '7bbf365e',
    },
  },
  {
    name: 'receiver_and_button_latest_wins',
    behaviour: 'A lit receiver and a button link one door: the button coming up closes it, the latest change, though the receiver stays lit.',
    chamber: rayReceiverButton,
    actions: [
      'left',
      'right',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: 'df21f199',
    },
  },
  {
    name: 'receiver_lit_by_either_emitter',
    behaviour: 'A receiver stays lit while either of two rays reaches it: picking up the mirror box that turned one ray onto it lets the other run straight to it.',
    chamber: rayTwoEmitters,
    actions: ['interact'],
    expected: {
      completed: false,
      moves: 0,
      portals: 0,
      finalHash: 'eca8b041',
    },
  },
  {
    name: 'receiver_dark_when_neither_reaches',
    behaviour: 'Stepping onto the mirror box\'s tile stops both rays, so the receiver goes dark and closes its door.',
    chamber: rayTwoEmitters,
    actions: [
      'interact',
      'down',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '88c6c019',
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
