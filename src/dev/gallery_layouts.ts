import type {BeamData, BlockableData, ChamberData, PositionData} from '@/game/chamber_data'
import {Action} from '@/game/rules/action'

// Development only: the layouts the sprite gallery (sprite_gallery.ts)
// draws besides the real chambers. The specimen is one small chamber with
// every element and an antline, loaded with the layout checks, once with
// everything on and once with everything off; the join board is every way
// walls, or open ditches, can meet, read without the layout checks

/**
 * A specimen's actions after its settled start, and what they leave: the
 * subject carrying a box, with both portals open.
 */
export type SpecimenRun = {
  readonly data: ChamberData // The chamber, everything on or everything off
  readonly actions: readonly Action[] // Played from its settled start
}

/**
 * The join board drawn with walls or with open ditches.
 */
export type JoinBoardKind = 'wall' | 'ditch'

/**
 * The join board, top row first: '#' is a wall (or an open ditch) and '.'
 * is floor. Top row, left to right: a lone tile, a horizontal run, a
 * vertical run, an L (an outer and an inner corner) and a diagonal of tiles
 * touching only at their corners. Bottom row: a T, a cross, a solid block
 * and a ring. A row and column of floor all round keeps every shape off the
 * edge, so each is joined only to its own tiles.
 */
const JOIN_BOARD: readonly string[] = [
  '.................',
  '.......#.#.....#.',
  '.#.###.#.#....#..',
  '.......#.###.#...',
  '.................',
  '.###..#..###.###.',
  '..#..###.###.#.#.',
  '..#...#..###.###.',
  '.................',
]

/** Marks a joined tile in JOIN_BOARD */
const JOINED_TILE = '#'

/**
 * A tile at a column and row.
 * @param x - Column
 * @param y - Row, counted from the bottom
 * @returns The position
 */
function at(x: number, y: number): PositionData {
  return {
    x: x,
    y: y,
  }
}

/**
 * An element that can be blocked, at a tile.
 * @param x - Column
 * @param y - Row, counted from the bottom
 * @param on - Whether it is blocked: a blocked wall refusing portals, a ditch open, a door or the exit closed, a fizzler on
 * @returns The element's entry
 */
function blockable(x: number, y: number, on: boolean): BlockableData {
  return {
    x: x,
    y: y,
    blocked: on,
  }
}

/**
 * A laser or a light barrier at a tile, running one way.
 * @param x - Column
 * @param y - Row, counted from the bottom
 * @param direction - 'H' or 'V'
 * @param on - Whether it is on
 * @returns Its entry
 */
function beam(x: number, y: number, direction: 'H' | 'V', on: boolean): BeamData {
  return {
    x: x,
    y: y,
    direction: direction,
    blocked: on,
  }
}

/**
 * The specimen chamber: 10 × 8 tiles, an inner wall splitting it, with every
 * element. The exit and one door sit in the outer wall, whose right side is
 * a blocked wall that always refuses portals, the other door, the fizzler and
 * a blocked wall that refuses them only while on in the inner wall, and two
 * light barriers in the bottom right corner;
 * a strip of slide floor runs along the top left, under the exit;
 * arrows point all four ways, two lasers cross, one box lies on a button,
 * another on the floor, and a third beside the subject, on its left. The
 * switch links the fizzler, never used, so an antline runs between them,
 * unlit while the fizzler is on and lit while it is off. Column 4 and row 3
 * stay clear but for that third box, which lets shots through, so the
 * subject's shots reach the walls.
 * @param on - Whether every element that can be blocked is: the inner blocked wall refusing portals, the light barriers on, ditches open, doors and the exit closed, the fizzler and lasers on
 * @returns The chamber
 */
function specimenData(on: boolean): ChamberData {
  return {
    version: 2,
    size: {
      width: 10,
      height: 8,
    },
    subject: {
      x: 4,
      y: 3,
      direction: 'UP',
    },
    exit: blockable(2, 7, on),
    walls: [
      {
        xFrom: 0,
        xTo: 1,
        yFrom: 7,
        yTo: 7,
      },
      {
        xFrom: 3,
        xTo: 9,
        yFrom: 7,
        yTo: 7,
      },
      {
        xFrom: 0,
        xTo: 2,
        yFrom: 0,
        yTo: 0,
      },
      {
        xFrom: 4,
        xTo: 9,
        yFrom: 0,
        yTo: 0,
      },
      {
        xFrom: 0,
        xTo: 0,
        yFrom: 1,
        yTo: 6,
      },
      at(6, 1),
      at(6, 4),
      at(6, 6),
    ],
    blockedWalls: [
      {
        xFrom: 9,
        xTo: 9,
        yFrom: 1,
        yTo: 6,
      },
      blockable(6, 3, on),
    ],
    slideFloors: [
      {
        xFrom: 1,
        xTo: 3,
        yFrom: 6,
        yTo: 6,
      },
    ],
    doors: [
      blockable(3, 0, on),
      blockable(6, 2, on),
    ],
    fizzlers: [
      {
        ...blockable(6, 5, on),
        id: 1,
      },
    ],
    lightBarriers: [
      beam(7, 1, 'H', on),
      beam(8, 1, 'H', on),
    ],
    ditches: [
      blockable(2, 5, on),
      blockable(3, 5, on),
    ],
    lasers: [
      beam(7, 4, 'H', on),
      beam(8, 4, 'H', on),
      beam(7, 3, 'V', on),
      beam(7, 4, 'V', on),
      beam(7, 5, 'V', on),
    ],
    arrows: [
      {
        x: 1,
        y: 1,
        direction: 'UP',
      },
      {
        x: 2,
        y: 1,
        direction: 'RIGHT',
      },
      {
        x: 1,
        y: 2,
        direction: 'DOWN',
      },
      {
        x: 2,
        y: 2,
        direction: 'LEFT',
      },
    ],
    buttons: [
      {
        x: 5,
        y: 1,
        links: [],
      },
      {
        x: 5,
        y: 2,
        links: [],
      },
    ],
    switches: [
      {
        x: 5,
        y: 6,
        links: [1],
      },
    ],
    antlines: [
      {
        link: 1,
        path: [
          at(5, 6),
          at(5, 5),
          at(6, 5),
        ],
      },
    ],
    boxes: [
      at(3, 3),
      at(5, 1),
      at(1, 5),
    ],
  }
}

/**
 * The specimen with everything on: the subject opens blue on the wall below
 * it and orange on the wall to its left, its shot flying over the box beside
 * it, then picks that box up (shooting takes free hands), and is left facing
 * left.
 */
export const SPECIMEN_ON: SpecimenRun = {
  data: specimenData(true),
  actions: [
    Action.TURN_DOWN,
    Action.BLUE,
    Action.TURN_LEFT,
    Action.ORANGE,
    Action.INTERACT,
  ],
}

/**
 * The specimen with everything off: the subject opens blue on the wall above
 * it and orange on the blocked wall in the inner wall to its right, which
 * takes portals while off, then turns to the box beside it and picks it up
 * (shooting takes free hands), and is left facing left.
 */
export const SPECIMEN_OFF: SpecimenRun = {
  data: specimenData(false),
  actions: [
    Action.BLUE,
    Action.TURN_RIGHT,
    Action.ORANGE,
    Action.TURN_LEFT,
    Action.INTERACT,
  ],
}

/**
 * The join board as a chamber: its marked tiles as walls or as open
 * ditches, the rest floor. The subject and the exit, which a chamber must
 * have, sit in the bottom corners, and the gallery draws neither.
 * @param kind - Whether the marked tiles are walls or open ditches
 * @returns The chamber, which fails the layout checks (its edge isn't enclosed), so read it without them
 */
export function joinBoardData(kind: JoinBoardKind): ChamberData {
  const height = JOIN_BOARD.length
  const width = JOIN_BOARD[0]?.length ?? 0
  const tiles: PositionData[] = []

  JOIN_BOARD.forEach((row, rowIndex) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === JOINED_TILE) {
        tiles.push(at(x, height - 1 - rowIndex))
      }
    }
  })

  return {
    version: 2,
    size: {
      width: width,
      height: height,
    },
    subject: {
      x: 0,
      y: 0,
      direction: 'UP',
    },
    exit: at(width - 1, 0),
    walls: (kind === 'wall') ? tiles : [],
    ditches: (kind === 'ditch') ? tiles : [],
  }
}
