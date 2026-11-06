import type {ChamberData} from '@/game/chamber_data'
import type {ReplayExpectation} from '@/game/replay_data'
import boxLinkedButton from '@scripts/fixtures/box_linked_button.json'
import buttonBehindCarriedBox from '@scripts/fixtures/button_behind_carried_box.json'
import portalOntoClosedExit from '@scripts/fixtures/portal_onto_closed_exit.json'
import portalOntoDitch from '@scripts/fixtures/portal_onto_ditch.json'
import portalOntoFizzler from '@scripts/fixtures/portal_onto_fizzler.json'
import portalOntoLaser from '@scripts/fixtures/portal_onto_laser.json'

// Short replays that pin today's odd behaviour, each on a tiny chamber made
// for it (the JSON files next to this one), outside the catalogue. The replay
// check runs them; phase F of stage 01 uses each as evidence for the intended
// change it pins

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
  readonly behaviour: string // The odd behaviour it pins, in plain words
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
