import {ChamberTiles} from '@scripts/engine_comparison/chamber_tiles'
import {startClassicRun} from '@scripts/engine_comparison/classic_run'
import {readAction} from '@scripts/engine_comparison/compared_action'
import {playStep} from '@scripts/engine_comparison/compared_run'
import {type ComparedStep, INTENDED_DIFFERENCES} from '@scripts/engine_comparison/intended_differences'
import {type Fixture, FIXTURES} from '@scripts/fixtures/fixtures'

// Checks the checks that recognise intended differences before v2 exists:
// each behaviour fixture that plays one key at a time is played on today's
// rules, and exactly its own intended difference must be recognised, at
// exactly its step. Fixtures that need keys before the state settles wait
// for frame-by-frame replays (stage 01, phase F)

/**
 * A behaviour fixture that plays one key at a time, and the intended
 * difference it pins.
 */
export type RecognisedFixture = {
  readonly fixture: string // The fixture's name in scripts/fixtures/fixtures.ts
  readonly difference: string // The id of the intended difference it pins
  readonly step: number // The step, counted from 1, where the difference shows
}

/** Every fixture the self-test plays */
export const RECOGNISED_FIXTURES: readonly RecognisedFixture[] = [
  {
    fixture: 'portal_onto_open_ditch',
    difference: 'portal_exit_checked',
    step: 4,
  },
  {
    fixture: 'portal_onto_active_laser',
    difference: 'portal_exit_checked',
    step: 4,
  },
  {
    fixture: 'portal_onto_closed_exit_completes',
    difference: 'closed_exit_by_portal',
    step: 4,
  },
  {
    fixture: 'box_linked_button_release_throws',
    difference: 'box_link_release',
    step: 2,
  },
  {
    fixture: 'fizzler_flag_kept_across_switched_off_fizzler',
    difference: 'fizzler_without_flag',
    step: 5,
  },
  {
    fixture: 'carried_box_button_released_last',
    difference: 'no_late_effects',
    step: 2,
  },
  {
    fixture: 'walk_out_through_the_edge',
    difference: 'edge_is_wall',
    step: 2,
  },
  {
    fixture: 'walk_into_crossing_lasers_first_off',
    difference: 'every_laser_blocks',
    step: 3,
  },
]

/**
 * Plays a fixture on today's rules one key at a time and lists every
 * intended difference recognised on the way. Each check reads only today's
 * side of a step, so today's outcome stands in for v2's.
 * @param fixture - The fixture
 * @returns Each recognition, as "<id> at step <n>", in order
 * @throws Error when a frame is not one key
 */
function findRecognitions(fixture: Fixture): string[] {
  const tiles = new ChamberTiles(fixture.chamber)
  const run = startClassicRun(fixture.chamber)
  const result: string[] = []

  for (let i = 0; i < fixture.frames.length; i++) {
    const action = readAction(fixture.frames[i] ?? '')
    const before = run.view
    const outcome = playStep(run, action)
    const step: ComparedStep = {
      tiles: tiles,
      action: action,
      before: before,
      classic: outcome,
      v2: outcome,
    }

    for (const difference of INTENDED_DIFFERENCES) {
      if ((difference.recognise !== null) && difference.recognise(step)) {
        result.push(`${difference.id} at step ${i + 1}`)
      }
    }

    // The rules threw, so the chamber can't be played on
    if (outcome.error !== null) {
      break
    }
  }

  return result
}

/**
 * Checks that a fixture is recognised as its own intended difference, at its
 * step, and as nothing else anywhere.
 * @param expected - The fixture and what must be recognised in it
 * @throws Error saying what was recognised instead
 */
export function checkRecognisedFixture(expected: RecognisedFixture): void {
  const fixture = FIXTURES.find((candidate) => candidate.name === expected.fixture)

  if (fixture === undefined) {
    throw new Error('no fixture of that name in scripts/fixtures/fixtures.ts')
  }

  const wanted = `${expected.difference} at step ${expected.step}`
  const found = findRecognitions(fixture)

  if ((found.length !== 1) || (found[0] !== wanted)) {
    const foundText = (found.length > 0) ? found.join(', ') : 'nothing'

    throw new Error(`recognised ${foundText} instead of ${wanted}`)
  }
}
