import {parseReplayFrame} from '@/game/replay_data'
import {readAction} from '@scripts/engine_comparison/compared_action'
import {compareStep, createComparison} from '@scripts/engine_comparison/comparison'
import {type Fixture, FIXTURES} from '@scripts/fixtures/fixtures'

// Plays each behaviour fixture of today's rules on both engines, one settled
// step per key frame (the gaps left out), and checks that exactly the
// intended difference it pins shows, at exactly its step. Fixtures with undo
// or redo are left out: undo lives outside the rules. Three fixtures pin a key
// pressed before a late effect lands; the v2 rules have no frames, so a key
// can't come early, and those fixtures must agree on every step

/**
 * Where a fixture shows the intended difference it pins.
 */
export type PinnedDifference = {
  readonly id: string // The intended difference's id
  readonly step: number // The step, counted from 1, where it shows
}

/**
 * A behaviour fixture of today's rules, and what it shows on both engines.
 */
export type PinnedFixture = {
  readonly fixture: string // The fixture's name in scripts/fixtures/fixtures.ts
  readonly difference: PinnedDifference | null // The difference it shows, or null when the engines agree on every step, since what it pins shows only between frames
}

/** Every fixture of today's rules without undo or redo, in the order of scripts/fixtures/fixtures.ts */
export const PINNED_FIXTURES: readonly PinnedFixture[] = [
  {
    fixture: 'portal_onto_open_ditch',
    difference: {
      id: 'portal_exit_checked',
      step: 4,
    },
  },
  {
    fixture: 'portal_onto_active_laser',
    difference: {
      id: 'portal_exit_checked',
      step: 4,
    },
  },
  {
    fixture: 'portal_onto_closed_exit_completes',
    difference: {
      id: 'closed_exit_by_portal',
      step: 4,
    },
  },
  {
    fixture: 'portal_onto_fizzler_left_next_frame',
    difference: null,
  },
  {
    fixture: 'portal_onto_fizzler_fires_a_frame_late',
    difference: null,
  },
  {
    fixture: 'button_releases_behind_carried_box',
    difference: null,
  },
  {
    fixture: 'carried_box_button_released_last',
    difference: {
      id: 'no_late_effects',
      step: 2,
    },
  },
  {
    fixture: 'fizzler_flag_kept_across_switched_off_fizzler',
    difference: {
      id: 'fizzler_without_flag',
      step: 5,
    },
  },
  {
    fixture: 'walk_out_through_the_edge',
    difference: {
      id: 'edge_is_wall',
      step: 2,
    },
  },
  {
    fixture: 'walk_into_crossing_lasers_first_off',
    difference: {
      id: 'every_laser_blocks',
      step: 3,
    },
  },
  {
    fixture: 'carried_box_link_sends_box_to_start',
    difference: {
      id: 'carried_box_link',
      step: 4,
    },
  },
  {
    fixture: 'box_linked_button_release_throws',
    difference: {
      id: 'box_link_release',
      step: 2,
    },
  },
]

/**
 * Whether a fixture presses undo or redo.
 * @param fixture - The fixture
 * @returns True when a frame is an undo or a redo
 */
function usesHistory(fixture: Fixture): boolean {
  return fixture.frames.some((frame) => typeof parseReplayFrame(frame).input === 'string')
}

/**
 * Plays a fixture on both engines, one settled step per key frame, and lists
 * every intended difference that explained a step.
 * @param fixture - The fixture
 * @returns Each difference, as "<id> at step <n>", in order
 * @throws Error naming the step when v2 throws or no intended difference explains a difference
 */
function findDifferences(fixture: Fixture): string[] {
  const comparison = createComparison(fixture.chamber)
  const result: string[] = []

  for (let i = 0; i < fixture.frames.length; i++) {
    const frame = fixture.frames[i] ?? ''

    try {
      const id = compareStep(comparison, readAction(frame))

      if (id !== null) {
        result.push(`${id} at step ${i + 1}`)
      }
    } catch (error) {
      throw new Error(`step ${i + 1} (${frame}): ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      })
    }
  }

  return result
}

/**
 * Checks that a fixture shows exactly the intended difference it pins, at
 * its step, or none when it pins none.
 * @param pinned - The fixture and what it must show
 * @returns What it showed, in words
 * @throws Error saying what it showed instead
 */
export function checkPinnedFixture(pinned: PinnedFixture): string {
  const fixture = FIXTURES.find((candidate) => candidate.name === pinned.fixture)

  if (fixture === undefined) {
    throw new Error('no fixture of that name in scripts/fixtures/fixtures.ts')
  }

  const wanted = (pinned.difference === null) ? [] : [`${pinned.difference.id} at step ${pinned.difference.step}`]
  const found = findDifferences(fixture)

  if (found.join() !== wanted.join()) {
    const foundText = (found.length > 0) ? found.join(', ') : 'no difference'
    const wantedText = (wanted.length > 0) ? wanted.join(', ') : 'no difference'

    throw new Error(`showed ${foundText} instead of ${wantedText}`)
  }

  return (pinned.difference === null) ? 'agrees on every step' : `${wanted.join()}`
}

/**
 * Lists the fixtures of today's rules that play no undo or redo but are
 * missing from PINNED_FIXTURES, so a new fixture can't go unchecked.
 * @returns Their names
 */
export function findUnpinnedFixtures(): string[] {
  return FIXTURES
    .filter((fixture) => !usesHistory(fixture))
    .filter((fixture) => !PINNED_FIXTURES.some((pinned) => pinned.fixture === fixture.name))
    .map((fixture) => fixture.name)
}
