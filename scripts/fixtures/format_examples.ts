import chamber2 from '@/chambers/chamber_2.json'
import type {ChamberDataV2} from '@/game/chamber_data_v2'
import brokenChamberFields from '@scripts/fixtures/broken_chamber_fields.json'
import brokenChamberLayout from '@scripts/fixtures/broken_chamber_layout.json'
import formatV2Example from '@scripts/fixtures/format_v2_example.json'

// Chamber files for the chamber check (npm run chamber:check), outside the
// catalogue: a format 2 example, typed here without a cast so the build
// fails when it doesn't fit the format, and cases that pin exactly what
// loading a file reports, broken ones included

/** A format 2 chamber using every addition (walls refusing portals, a link group named by a button and a switch, an empty par) and leaving out every list it doesn't need */
export const FORMAT_V2_EXAMPLE: ChamberDataV2 = formatV2Example

/**
 * A chamber file and exactly what loading it must report.
 */
export type ChamberCase = {
  readonly name: string // Short id, used in the chamber check's report
  readonly data: unknown // The file as parsed JSON
  readonly problems: readonly string[] // Every problem it must report, as the check prints them, in order; empty when it must load without any
}

/** Every case the chamber check loads */
export const CHAMBER_CASES: readonly ChamberCase[] = [
  {
    name: 'format_v2_example',
    data: FORMAT_V2_EXAMPLE,
    problems: [],
  },
  {
    name: 'format_1_with_id_0',
    // Format 1 read an id of 0 as no id, so upgrading removes it
    data: {
      ...chamber2,
      exit: {
        ...chamber2.exit,
        id: 0,
      },
    },
    problems: [],
  },
  {
    name: 'newer_format',
    data: {
      version: 3,
    },
    problems: ['error version: format 3 is newer than this game plays (2)'],
  },
  {
    name: 'not_an_object',
    data: 'chamber',
    problems: ['error: the file is not a JSON object'],
  },
  {
    name: 'broken_chamber_fields',
    data: brokenChamberFields,
    problems: [
      'error colour: is not a field of a chamber file here (misspelled?)',
      'error size.width: is less than 1',
      'error subject.direction: is not one of UP, DOWN, LEFT, RIGHT',
      'error exit.y: is missing',
      'error walls[0].takesPortal: is not a field of a chamber file here (misspelled?)',
      'error walls[1]: a rectangle\'s from corner is past its to corner',
      'error boxes: is not a list',
      'error buttons[0].links[0]: is less than 1',
      'error doors[0].y: is not a whole number',
      'error lasers[0].direction: is not one of H, V',
      'error par.moves: is less than 0',
    ],
  },
  {
    name: 'broken_chamber_layout',
    data: brokenChamberLayout,
    problems: [
      'error walls[4] at (0, 2): lists a wall tile that another wall entry already lists',
      'error ditches[1] at (9, 2): is outside the chamber',
      'error exit at (5, 1): the exit can\'t be inside a wall (only one barrier can)',
      'error subject at (2, 3): the subject can only start on plain floor or a button',
      'error boxes[0] at (3, 1): a box can only start on plain floor or a button',
      'error boxes[2] at (4, 2): two boxes start on one tile',
      'error lasers[0] at (1, 1): more than one element on a tile: door (doors[0]), laser (lasers[0]); only two crossing lasers can share one',
      'error doors[0] at (1, 1): id 1 is also used by barriers[0]',
      'error groups[0]: links group groups[1]; a group can only name elements',
      'warning buttons[0] at (2, 1): links a box: pressing sends it back to its start, releasing does nothing to it',
      'error buttons[1] at (3, 2): links id 7, which nothing has',
      'error at (5, 3): the chamber\'s edge is open here: an edge tile needs a wall, a barrier, a door or the exit',
    ],
  },
]
