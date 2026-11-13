import type {BlockableData, ChamberData, LaserData, PositionData} from '@/game/chamber_data'
import {Action} from '@/game/rules/action'

// Development only: the layouts the sprite gallery (sprite_gallery.ts)
// draws besides the real chambers. The specimen is one small chamber with
// every element, loaded with the layout checks, once with everything on and
// once with everything off; the join board is every way walls, or open
// ditches, can meet, read without the layout checks

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
 * @param on - Whether it is blocked: a barrier raised, a ditch open, a door or the exit closed, a fizzler or a laser on
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
 * A laser at a tile.
 * @param x - Column
 * @param y - Row, counted from the bottom
 * @param direction - 'H' or 'V'
 * @param on - Whether it is on
 * @returns The laser's entry
 */
function laser(x: number, y: number, direction: 'H' | 'V', on: boolean): LaserData {
  return {
    x: x,
    y: y,
    direction: direction,
    blocked: on,
  }
}

/**
 * The specimen chamber: 10 × 8 tiles, an inner wall splitting it, with every
 * element. The exit and one door sit in the outer wall, the other door and
 * the fizzler in the inner wall, and a barrier on the inner wall; arrows
 * point all four ways, two lasers cross, one box lies on a button and
 * another on the floor, and the subject stands on a third. Column 4 and
 * row 3 stay clear, so the subject's shots reach the walls.
 * @param on - Whether every element that can be blocked is: barriers raised, ditches open, doors and the exit closed, the fizzler and lasers on
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
      {
        xFrom: 9,
        xTo: 9,
        yFrom: 1,
        yTo: 6,
      },
      at(6, 1),
      {
        xFrom: 6,
        xTo: 6,
        yFrom: 3,
        yTo: 4,
      },
      at(6, 6),
    ],
    doors: [
      blockable(3, 0, on),
      blockable(6, 2, on),
    ],
    fizzlers: [blockable(6, 5, on)],
    barriers: [
      blockable(5, 5, on),
      blockable(6, 3, on),
    ],
    ditches: [
      blockable(2, 5, on),
      blockable(3, 5, on),
    ],
    lasers: [
      laser(7, 4, 'H', on),
      laser(8, 4, 'H', on),
      laser(7, 3, 'V', on),
      laser(7, 4, 'V', on),
      laser(7, 5, 'V', on),
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
        links: [],
      },
    ],
    boxes: [
      at(4, 3),
      at(5, 1),
      at(1, 5),
    ],
  }
}

/**
 * The specimen with everything on: the subject picks up the box it stands
 * on, opens blue on the wall below it and orange on the wall to its left,
 * and is left facing left.
 */
export const SPECIMEN_ON: SpecimenRun = {
  data: specimenData(true),
  actions: [
    Action.INTERACT,
    Action.TURN_DOWN,
    Action.BLUE,
    Action.TURN_LEFT,
    Action.ORANGE,
  ],
}

/**
 * The specimen with everything off: the subject picks up the box it stands
 * on, opens blue on the wall above it and orange on the inner wall to its
 * right, through the lowered barrier there, and is left facing right.
 */
export const SPECIMEN_OFF: SpecimenRun = {
  data: specimenData(false),
  actions: [
    Action.INTERACT,
    Action.BLUE,
    Action.TURN_RIGHT,
    Action.ORANGE,
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
