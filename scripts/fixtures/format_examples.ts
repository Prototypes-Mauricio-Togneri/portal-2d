import type {ChamberData} from '@/game/chamber_data'
import brokenAntlines from '@scripts/fixtures/broken_antlines.json'
import brokenChamberFields from '@scripts/fixtures/broken_chamber_fields.json'
import brokenChamberLayout from '@scripts/fixtures/broken_chamber_layout.json'
import formatV2Example from '@scripts/fixtures/format_v2_example.json'
import lightBarrierDirection from '@scripts/fixtures/light_barrier_direction.json'
import lightBarrierInWall from '@scripts/fixtures/light_barrier_in_wall.json'
import lightBarrierSharedTile from '@scripts/fixtures/light_barrier_shared_tile.json'

// Chamber files for the chamber check (npm run chamber:check), outside the
// catalogue: a format 2 example, typed here without a cast so the build
// fails when it doesn't fit the format, and cases that pin exactly what
// loading a file reports, broken ones included

/** A format 2 chamber using every addition (blocked walls, one tile of them linked, a link group named by a button and a switch, an antline to an element the group stands for and one to an element named directly, an empty par) and leaving out every list it doesn't need */
export const FORMAT_V2_EXAMPLE: ChamberData = formatV2Example

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
    name: 'newer_format',
    // The example in every field but the version, so only the version is reported
    data: {
      ...FORMAT_V2_EXAMPLE,
      version: 3,
    },
    problems: ['error version: is not 2, the only format this game reads'],
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
      'error walls[0].takesPortals: is not a field of a chamber file here (misspelled?)',
      'error walls[1]: a rectangle\'s from corner is past its to corner',
      'error boxes: is not a list',
      'error buttons[0].links[0]: is less than 1',
      'error doors[0].y: is not a whole number',
      'error lasers[0].direction: is not one of H, V',
      'error antlines[0].link: is less than 1',
      'error antlines[1].path: is missing',
      'error antlines[2].path: needs at least 2 corners',
      'error antlines[3].colour: is not a field of a chamber file here (misspelled?)',
      'error antlines[3].path[0].y: is missing',
      'error par.moves: is less than 0',
    ],
  },
  {
    name: 'broken_chamber_layout',
    data: brokenChamberLayout,
    problems: [
      'error walls[4] at (0, 2): lists a wall tile that another wall entry already lists',
      'error ditches[1] at (9, 2): is outside the chamber',
      'error exit at (5, 1): the exit can\'t be inside a wall',
      'error subject at (2, 3): the subject can only start on plain floor or a button',
      'error boxes[0] at (3, 1): a box can only start on plain floor or a button',
      'error boxes[2] at (4, 2): two boxes start on one tile',
      'error lasers[0] at (1, 1): more than one element on a tile: door (doors[0]), laser (lasers[0]); only two crossing lasers can share one',
      'error doors[0] at (1, 1): id 1 is also used by blockedWalls[0]',
      'error groups[0]: links group groups[1]; a group can only name elements',
      'warning buttons[0] at (2, 1): links a box: pressing sends it back to its start, releasing does nothing to it',
      'error buttons[1] at (3, 2): links id 7, which nothing has',
      'error at (5, 3): the chamber\'s edge is open here: an edge tile needs a wall, a blocked wall, a door or the exit',
    ],
  },
  {
    name: 'light_barrier_in_wall',
    // A light barrier stands only on the floor
    data: lightBarrierInWall,
    problems: ['error lightBarriers[0] at (2, 0): a light barrier can\'t be inside a wall'],
  },
  {
    name: 'light_barrier_shared_tile',
    // A light barrier is a fixed element of its own, and a switch's link reaches it, so the overlap is the only problem
    data: lightBarrierSharedTile,
    problems: ['error doors[0] at (3, 1): more than one element on a tile: lightBarrier (lightBarriers[0]), door (doors[0]); only two crossing lasers can share one'],
  },
  {
    name: 'light_barrier_direction',
    // A light barrier runs one way, like a laser: the way is required, and an arrow's way isn't one
    data: lightBarrierDirection,
    problems: [
      'error lightBarriers[0].direction: is missing',
      'error lightBarriers[1].direction: is not one of H, V',
    ],
  },
  {
    name: 'broken_antlines',
    // Each antline but the last has one problem; the last starts on a switch that links its door through a group, which is right
    data: brokenAntlines,
    problems: [
      'error antlines[0]: links id 9, which nothing has',
      'error antlines[1]: links group groups[0]; an antline leads to one element',
      'error antlines[2] at (6, 1): is outside the chamber',
      'error antlines[3] at (2, 2): shares neither a row nor a column with the corner before it',
      'error antlines[4] at (1, 1): repeats the corner before it',
      'error antlines[5] at (2, 1): starts on no button or switch that links id 1',
      'error antlines[6] at (1, 1): starts on no button or switch that links id 2',
      'error antlines[7] at (4, 1): ends away from id 1, which is at (5, 2)',
    ],
  },
]
