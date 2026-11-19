import type {ChamberData} from '@/game/chamber_data'
import arrowTurnedDirectionValue from '@scripts/fixtures/arrow_turned_direction_value.json'
import brokenAntlines from '@scripts/fixtures/broken_antlines.json'
import brokenArrows from '@scripts/fixtures/broken_arrows.json'
import brokenDeviceFields from '@scripts/fixtures/broken_device_fields.json'
import brokenDevices from '@scripts/fixtures/broken_devices.json'
import brokenChamberFields from '@scripts/fixtures/broken_chamber_fields.json'
import brokenChamberLayout from '@scripts/fixtures/broken_chamber_layout.json'
import brokenSlideFloors from '@scripts/fixtures/broken_slide_floors.json'
import formatV2Example from '@scripts/fixtures/format_v2_example.json'
import lightBarrierDirection from '@scripts/fixtures/light_barrier_direction.json'
import lightBarrierInWall from '@scripts/fixtures/light_barrier_in_wall.json'
import lightBarrierSharedTile from '@scripts/fixtures/light_barrier_shared_tile.json'
import slideFloorRectangle from '@scripts/fixtures/slide_floor_rectangle.json'
import subjectOnBox from '@scripts/fixtures/subject_on_box.json'

// Chamber files for the chamber check (npm run chamber:check), outside the
// catalogue: a format 2 example, typed here without a cast so the build
// fails when it doesn't fit the format, and cases that pin exactly what
// loading a file reports, broken ones included

/** A format 2 chamber using every addition (blocked walls, one tile of them linked, an emitter and a receiver that links it, slide floors, a tile and a rectangle, a mirror box, an arrow a link turns, a link group named by a button and a switch, an antline to an element the group stands for and one to an element named directly, an empty par) and leaving out every list it doesn't need */
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
      'error at (5, 3): the chamber\'s edge is open here: an edge tile needs a wall, a blocked wall, an emitter, a receiver, a door or the exit',
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
    name: 'subject_on_box',
    // A box keeps the subject off its tile, so the two never start on one
    data: subjectOnBox,
    problems: ['error subject at (1, 1): the subject can\'t start on a box'],
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
      'error antlines[5] at (2, 1): starts on no button, switch or receiver that links id 1',
      'error antlines[6] at (1, 1): starts on no button, switch or receiver that links id 2',
      'error antlines[7] at (4, 1): ends away from id 1, which is at (5, 2)',
    ],
  },
  {
    name: 'slide_floor_rectangle',
    // Slide floors are listed as walls are, so a rectangle's corners are read the same way
    data: slideFloorRectangle,
    problems: ['error slideFloors[0]: a rectangle\'s from corner is past its to corner'],
  },
  {
    name: 'broken_slide_floors',
    // The second row's slide floor shares its tiles with the subject's start, a button with a box's start, a fizzler, a laser and a light barrier, which is right; the first row's shares each of its tiles with an element it can't
    data: brokenSlideFloors,
    problems: [
      'error slideFloors[3] at (2, 3): lists a slide floor tile that another slide floor entry already lists',
      'error slideFloors[4] at (0, 3): a slide floor can\'t be inside a wall',
      'error slideFloors[0] at (1, 1): a slide floor can\'t share a tile with a ditch',
      'error slideFloors[0] at (2, 1): a slide floor can\'t share a tile with a door',
      'error slideFloors[0] at (3, 1): a slide floor can\'t share a tile with the exit',
      'error slideFloors[0] at (4, 1): a slide floor can\'t share a tile with an arrow',
      'error slideFloors[0] at (5, 1): a slide floor can\'t share a tile with a switch',
    ],
  },
  {
    name: 'broken_arrows',
    // Each arrow but the last is wrong about how it turns; the last, an id and a quarter turn, is right
    data: brokenArrows,
    problems: [
      'error arrows[0] at (1, 1): an arrow with a turned way needs an id, or nothing can turn it',
      'error arrows[1] at (2, 1): an arrow with an id needs a turned way, or a link to it changes nothing',
      'error arrows[2] at (3, 1): an arrow\'s turned way can\'t be its own way',
      'error arrows[3] at (4, 1): an arrow\'s turned way must be a quarter turn from its own way, not a half turn',
    ],
  },
  {
    name: 'broken_devices',
    // Each emitter and receiver but the second receiver faces the wrong way, is listed twice or links wrongly; the second receiver, facing the floor and linking a box, only warns
    data: brokenDevices,
    problems: [
      'error emitters[2] at (6, 1): lists a wall tile that another wall entry already lists',
      'error emitters[0] at (0, 1): faces outside the chamber: it fires onto a floor tile inside it',
      'error emitters[1] at (0, 3): faces a wall at (0, 4): it fires onto a floor tile',
      'error receivers[0] at (2, 4): faces outside the chamber: it listens on a floor tile inside it',
      'error receivers[2] at (6, 3): faces a wall at (6, 4): it listens on a floor tile',
      'error receivers[0] at (2, 4): links id 9, which nothing has',
      'warning receivers[1] at (4, 0): links a box: lighting sends it back to its start, going dark does nothing to it',
      'warning receivers[2] at (6, 3): links a box: lighting sends it back to its start, going dark does nothing to it',
    ],
  },
  {
    name: 'broken_device_fields',
    // An emitter faces one of the four ways and has no colour, a receiver needs its links, and a box's mirror is one of two
    data: brokenDeviceFields,
    problems: [
      'error emitters[0].colour: is not a field of a chamber file here (misspelled?)',
      'error emitters[0].direction: is not one of UP, DOWN, LEFT, RIGHT',
      'error receivers[0].links: is missing',
      'error boxes[0].mirror: is not one of /, \\',
    ],
  },
  {
    name: 'arrow_turned_direction_value',
    // An arrow's turned way is one of the four ways, like its own
    data: arrowTurnedDirectionValue,
    problems: ['error arrows[0].turnedDirection: is not one of UP, DOWN, LEFT, RIGHT'],
  },
]
