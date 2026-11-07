import type {ChamberData} from '@/game/chamber_data'
import type {ReplayExpectation} from '@/game/replay_data'
import boxLinkedButton from '@scripts/fixtures/box_linked_button.json'
import buttonBehindCarriedBox from '@scripts/fixtures/button_behind_carried_box.json'
import crossingLasers from '@scripts/fixtures/crossing_lasers.json'
import fizzlersInARow from '@scripts/fixtures/fizzlers_in_a_row.json'
import openEdge from '@scripts/fixtures/open_edge.json'
import portalOntoClosedExit from '@scripts/fixtures/portal_onto_closed_exit.json'
import portalOntoDitch from '@scripts/fixtures/portal_onto_ditch.json'
import portalOntoFizzler from '@scripts/fixtures/portal_onto_fizzler.json'
import portalOntoLaser from '@scripts/fixtures/portal_onto_laser.json'
import twoButtonsOneDoor from '@scripts/fixtures/two_buttons_one_door.json'

// Short replays that pin today's odd behaviour, each on a tiny chamber made
// for it (the JSON files next to this one), outside the catalogue, and a few
// that pin how undo and redo replay. The replay check runs them; phase F of
// stage 01 uses each odd-behaviour fixture as evidence for the intended change
// it pins (undo and redo live outside the rules, so the undo fixtures are not
// among them)

/**
 * How a fixture ends when the rules throw, as live play does when its frame
 * loop stops.
 */
export type FixtureFailure = {
  readonly error: string // The message of the error the rules throw
}

/**
 * A replay pinning one odd behaviour of today's rules.
 */
export type Fixture = {
  readonly name: string // Short id, used in the replay check's report
  readonly behaviour: string // The behaviour it pins, in plain words
  readonly chamber: ChamberData // The tiny chamber it is played on
  readonly frames: readonly string[] // The key frames, in the replay text form
  readonly expected: ReplayExpectation | FixtureFailure // What replaying the frames gives
}

// Frames with a gap of 2 are ordinary presses; a gap of 0 or 1 is the timing
// the fixture is about

/** Every fixture, run by the replay check */
export const FIXTURES: readonly Fixture[] = [
  {
    name: 'portal_onto_open_ditch',
    behaviour: 'Coming out of a portal skips the walking checks, so the subject ends up standing on an open ditch.',
    chamber: portalOntoDitch,
    frames: [
      '2:blue',
      '2:^left',
      '2:orange',
      '2:left',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 2,
      finalHash: '0a44c420',
    },
  },
  {
    name: 'portal_onto_active_laser',
    behaviour: 'Coming out of a portal skips the walking checks, so the subject ends up standing in an active laser.',
    chamber: portalOntoLaser,
    frames: [
      '2:blue',
      '2:^left',
      '2:orange',
      '2:left',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 2,
      finalHash: '568eda34',
    },
  },
  {
    name: 'portal_onto_closed_exit_completes',
    behaviour: 'Coming out of a portal onto the closed exit puts the subject on it, which completes the chamber.',
    chamber: portalOntoClosedExit,
    frames: [
      '2:blue',
      '2:up',
      '2:orange',
      '2:up',
    ],
    expected: {
      completed: true,
      moves: 2,
      portals: 2,
      finalHash: 'cd97559d',
    },
  },
  {
    name: 'portal_onto_fizzler_left_next_frame',
    behaviour: 'Coming out of a portal onto an active fizzler only fizzles on the next frame, so stepping off on that very frame keeps both portals.',
    chamber: portalOntoFizzler,
    frames: [
      '2:blue',
      '2:up',
      '2:orange',
      '2:up',
      '0:left',
    ],
    expected: {
      completed: false,
      moves: 3,
      portals: 2,
      finalHash: '0bef0ac7',
    },
  },
  {
    name: 'portal_onto_fizzler_fires_a_frame_late',
    behaviour: 'Coming out of a portal onto an active fizzler and staying one frame fizzles then, removing both portals.',
    chamber: portalOntoFizzler,
    frames: [
      '2:blue',
      '2:up',
      '2:orange',
      '2:up',
      '1:left',
    ],
    expected: {
      completed: false,
      moves: 3,
      portals: 2,
      finalHash: '2df54b1d',
    },
  },
  {
    name: 'button_releases_behind_carried_box',
    behaviour: 'A button is released a frame after its box is carried off it, so the subject reaches the door it holds open and the door closes on the subject and box.',
    chamber: buttonBehindCarriedBox,
    frames: [
      '2:interact',
      '2:right',
      '0:right',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: '68dd897f',
    },
  },
  {
    name: 'carried_box_button_released_last',
    behaviour: 'Carrying a box off a button onto a second button linked to the same door releases the first button after the second is pressed, whatever their order, so the door ends closed and the subject can\'t walk through.',
    chamber: twoButtonsOneDoor,
    frames: [
      '2:interact',
      '2:right',
      '2:right',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: '9d41bfc1',
    },
  },
  {
    name: 'fizzler_flag_kept_across_switched_off_fizzler',
    behaviour: 'Stepping from a field onto a switched-off fizzler still counts as inside a field, so a portal shot from there survives walking into the next field.',
    chamber: fizzlersInARow,
    frames: [
      '2:right',
      '2:right',
      '2:^up',
      '2:blue',
      '2:right',
    ],
    expected: {
      completed: false,
      moves: 3,
      portals: 1,
      finalHash: '577471a5',
    },
  },
  {
    name: 'walk_out_through_the_edge',
    behaviour: 'Nothing checks the chamber\'s edge, so the subject walks out of the chamber through an open tile on it.',
    chamber: openEdge,
    frames: [
      '2:right',
      '2:right',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: '103272ce',
    },
  },
  {
    name: 'walk_into_crossing_lasers_first_off',
    behaviour: 'Of two lasers crossing on a tile, only the first listed keeps the subject out, so with that one switched off it walks into the other, which is still on.',
    chamber: crossingLasers,
    frames: [
      '2:right',
      '2:interact',
      '2:right',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 0,
      finalHash: 'ea8bf645',
    },
  },
  {
    name: 'undo_back_to_start',
    behaviour: 'Undo takes back every step, through a portal crossing and a box carried off a button, to the settled start (the hash of replaying no frames). One more undo changes nothing, and undone moves and portals still count.',
    chamber: buttonBehindCarriedBox,
    frames: [
      '2:interact',
      '2:^up',
      '2:blue',
      '2:right',
      '2:^down',
      '2:orange',
      '2:down',
      '2:undo',
      '2:undo',
      '2:undo',
      '2:undo',
      '2:undo',
      '2:undo',
      '2:undo',
      '2:undo',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 2,
      finalHash: '9e8ac45a',
    },
  },
  {
    name: 'redo_until_a_new_step',
    behaviour: 'Redo takes undone steps again until a new step, which forgets the rest: the run ends where the first five steps alone end, and redo then changes nothing. Redo counts no moves or portals.',
    chamber: buttonBehindCarriedBox,
    frames: [
      '2:interact',
      '2:^up',
      '2:blue',
      '2:right',
      '2:^down',
      '2:orange',
      '2:down',
      '2:undo',
      '2:undo',
      '2:undo',
      '2:undo',
      '2:undo',
      '2:redo',
      '2:redo',
      '2:^down',
      '2:redo',
    ],
    expected: {
      completed: false,
      moves: 2,
      portals: 2,
      finalHash: '60db926f',
    },
  },
  {
    name: 'undo_before_a_late_effect',
    behaviour: 'Undo on the frame after carrying a box off a button, before the button releases, goes back to the settled state before the step, so the door it holds open never closes.',
    chamber: buttonBehindCarriedBox,
    frames: [
      '2:interact',
      '2:right',
      '0:undo',
    ],
    expected: {
      completed: false,
      moves: 1,
      portals: 0,
      finalHash: 'ee0ec821',
    },
  },
  {
    name: 'box_linked_button_release_throws',
    behaviour: 'Releasing a button linked to a box throws, because a box cannot be deactivated.',
    chamber: boxLinkedButton,
    frames: [
      '2:right',
      '2:right',
    ],
    expected: {
      error: 'Box 1 cannot be deactivated',
    },
  },
]
