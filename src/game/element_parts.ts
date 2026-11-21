import {STRIP_TILE, TILE_QUARTERS, type TileQuarter} from '@/game/sprite_set'

// The parts of the element sprites that take the element detail
// (docs/sprites.md), as shapes in a sprite's own 256 px frame, drawn facing
// up: x to the right, y down, the tile's middle at 128. They are read from
// the sprites' sources in art/sprites/, so a change to one of those shapes
// must be followed here

/**
 * A part of an element sprite the element detail is laid over, or the whole
 * sprite.
 */
export type SpritePart = 'whole' | 'boxPlates' | 'mirrorPlates' | 'mirror' | 'buttonPlate' | 'buttonDome' | 'discFace' | 'grateFace' | 'grateBars' | 'grateFrame'

/**
 * A point in a sprite's frame.
 */
type Point = readonly [number, number]

/** The middle of a sprite's tile, in its own frame */
const MIDDLE = 128

/** A box's top left corner block, inside its outline, its inner corner cut (box.svg, scaled 0.8 about the middle) */
const BOX_BLOCK: readonly Point[] = [
  [
    58.4,
    58.4,
  ],
  [
    103.5,
    58.4,
  ],
  [
    103.5,
    82.4,
  ],
  [
    82.4,
    103.5,
  ],
  [
    58.4,
    103.5,
  ],
]

/** A box's top tab, between its two top blocks */
const BOX_TAB: readonly Point[] = corners(115, 58.4, 141, 78.2)

/** The radius of a box's centre disc */
const BOX_DISC = 29.7

/** How far a mirror's frame reaches along its diagonal from the middle, a little past the frame so its edge is kept whole */
const MIRROR_REACH = 62.6

/** Half a mirror's frame's width, a little past the frame */
const MIRROR_HALF_WIDTH = 12.2

/** The radius of a button's or a switch's dome with its rim (button_up.svg: 140-unit grid, scaled 256/140 and 0.85) */
const DOME = 74.9

/** The radius the dome is put back to after the plate is toned, a little past its rim so its edge is kept whole */
const DOME_KEPT = 75.6

/** The radius of the white plate round the dome, out past its dark rim */
const PLATE = 110

/** A button's or a switch's four dark clamps, inner edge first: top left, top right, bottom right, bottom left */
const BUTTON_CLAMPS: readonly (readonly Point[])[] = [
  [
    [
      51.2,
      83.8,
    ],
    [
      85.9,
      47.7,
    ],
    [
      43.9,
      21.4,
    ],
    [
      21.5,
      43.0,
    ],
  ],
  [
    [
      204.6,
      83.3,
    ],
    [
      169.9,
      47.2,
    ],
    [
      211.9,
      20.9,
    ],
    [
      234.3,
      42.5,
    ],
  ],
  [
    [
      204.7,
      172.6,
    ],
    [
      170.0,
      208.6,
    ],
    [
      212.0,
      234.9,
    ],
    [
      234.5,
      213.4,
    ],
  ],
  [
    [
      51.0,
      172.4,
    ],
    [
      85.7,
      208.5,
    ],
    [
      43.7,
      234.8,
    ],
    [
      21.3,
      213.2,
    ],
  ],
]

/** The radius of a turntable's face, inside its lit lip and its cut */
const DISC_FACE = 91.8

/** A grate's plate, under its frame (ditch_bridged.svg) */
const GRATE_PLATE_FROM = 12
const GRATE_PLATE_TO = 244

/** Inside a grate's frame */
const GRATE_INSIDE_FROM = 26
const GRATE_INSIDE_TO = 230

/** A grate's slots: six by six, each this wide, this far apart, the first this far in */
const SLOT_SIZE = 23
const SLOT_PITCH = 32
const SLOT_FIRST = 35
const SLOTS_ACROSS = 6

/** How rounded a grate's slots' corners are */
const SLOT_CORNER = 5

/** How far a pit's side runs into its tile from the rim, from its lit edge down to the shadow on the bottom (ditch.svg) */
const PIT_SIDE = 82

/** Half a tile, in a sprite's frame: where a tile's quarters meet */
const HALF = 128

/** Each part's shape, made the first time it is asked for */
const partPaths = new Map<SpritePart, Path2D>()

/** The sides of each way a pit tile's quarters can be joined, made the first time it is asked for */
const pitSidePaths = new Map<string, Path2D>()

/** The parts whose shape has holes, filled by the even-odd rule */
const EVEN_ODD_PARTS: ReadonlySet<SpritePart> = new Set<SpritePart>([
  'grateFace',
  'grateBars',
  'grateFrame',
])

/**
 * The four corners of a rectangle, clockwise on the canvas from its top left.
 * @param left - Left edge
 * @param top - Top edge
 * @param right - Right edge
 * @param bottom - Bottom edge
 * @returns Its corners
 */
function corners(left: number, top: number, right: number, bottom: number): Point[] {
  return [
    [
      left,
      top,
    ],
    [
      right,
      top,
    ],
    [
      right,
      bottom,
    ],
    [
      left,
      bottom,
    ],
  ]
}

/**
 * A point turned a number of quarter turns clockwise about the tile's middle.
 * @param point - The point
 * @param quarters - Quarter turns, clockwise on the canvas
 * @returns The point turned
 */
function turned(point: Point, quarters: number): Point {
  let dx = point[0] - MIDDLE
  let dy = point[1] - MIDDLE

  for (let i = 0; i < quarters; i++) {
    const across = -dy

    dy = dx
    dx = across
  }

  return [
    MIDDLE + dx,
    MIDDLE + dy,
  ]
}

/**
 * Adds a polygon to a path, wound clockwise on the canvas whichever way its
 * points run, so polygons added to one path add up under the non-zero rule.
 * @param path - The path
 * @param points - Its corners
 */
function addPolygon(path: Path2D, points: readonly Point[]): void {
  let twiceArea = 0

  points.forEach((point, i) => {
    const next = points[(i + 1) % points.length] ?? point

    twiceArea += (point[0] * next[1]) - (next[0] * point[1])
  })

  // On the canvas, with y down, a clockwise polygon has a positive area
  const ordered = (twiceArea < 0) ? [...points].reverse() : points

  ordered.forEach((point, i) => (i === 0) ? path.moveTo(point[0], point[1]) : path.lineTo(point[0], point[1]))
  path.closePath()
}

/**
 * Adds a polygon and its three quarter turns about the tile's middle.
 * @param path - The path
 * @param points - The polygon, as drawn at its top or top left
 */
function addFourWays(path: Path2D, points: readonly Point[]): void {
  for (let quarters = 0; quarters < 4; quarters++) {
    addPolygon(path, points.map((point) => turned(point, quarters)))
  }
}

/**
 * Adds a circle about the tile's middle, clockwise on the canvas, or the
 * other way round to cut a hole under the non-zero rule.
 * @param path - The path
 * @param radius - Its radius
 * @param hole - Whether it is wound the other way round
 */
function addCircle(path: Path2D, radius: number, hole = false): void {
  path.moveTo(MIDDLE + radius, MIDDLE)
  path.arc(MIDDLE, MIDDLE, radius, 0, Math.PI * 2, hole)
}

/**
 * Adds a grate's slots.
 * @param path - The path
 */
function addSlots(path: Path2D): void {
  for (let row = 0; row < SLOTS_ACROSS; row++) {
    for (let column = 0; column < SLOTS_ACROSS; column++) {
      path.roundRect(SLOT_FIRST + (column * SLOT_PITCH), SLOT_FIRST + (row * SLOT_PITCH), SLOT_SIZE, SLOT_SIZE, SLOT_CORNER)
    }
  }
}

/**
 * Makes a part's shape.
 * @param part - The part, not the whole sprite
 * @returns Its shape
 */
function makePart(part: Exclude<SpritePart, 'whole'>): Path2D {
  const path = new Path2D()

  switch (part) {
    case 'boxPlates':
      addFourWays(path, BOX_BLOCK)
      addFourWays(path, BOX_TAB)
      addCircle(path, BOX_DISC)
      break
    case 'mirrorPlates':
      addFourWays(path, BOX_BLOCK)
      addFourWays(path, BOX_TAB)
      break
    case 'mirror': {
      // Along the diagonal from the bottom left corner to the top right
      const along = Math.SQRT1_2 * MIRROR_REACH
      const across = Math.SQRT1_2 * MIRROR_HALF_WIDTH

      addPolygon(path, [
        [
          MIDDLE - along - across,
          MIDDLE + along - across,
        ],
        [
          MIDDLE + along - across,
          MIDDLE - along - across,
        ],
        [
          MIDDLE + along + across,
          MIDDLE - along + across,
        ],
        [
          MIDDLE - along + across,
          MIDDLE + along + across,
        ],
      ])
      break
    }
    case 'buttonPlate':
      // The white plate round the dome and the four clamps, every one wound the same way, so they add up
      addCircle(path, PLATE)
      addCircle(path, DOME, true)

      for (const clamp of BUTTON_CLAMPS) {
        addPolygon(path, clamp)
      }

      break
    case 'buttonDome':
      addCircle(path, DOME_KEPT)
      break
    case 'discFace':
      addCircle(path, DISC_FACE)
      break
    case 'grateFace':
      addPolygon(path, corners(GRATE_PLATE_FROM, GRATE_PLATE_FROM, GRATE_PLATE_TO, GRATE_PLATE_TO))
      addSlots(path)
      break
    case 'grateBars':
      addPolygon(path, corners(GRATE_INSIDE_FROM, GRATE_INSIDE_FROM, GRATE_INSIDE_TO, GRATE_INSIDE_TO))
      addSlots(path)
      break
    case 'grateFrame':
      addPolygon(path, corners(GRATE_PLATE_FROM, GRATE_PLATE_FROM, GRATE_PLATE_TO, GRATE_PLATE_TO))
      addPolygon(path, corners(GRATE_INSIDE_FROM, GRATE_INSIDE_FROM, GRATE_INSIDE_TO, GRATE_INSIDE_TO))
      break
  }

  return path
}

/**
 * A part's shape in a sprite's frame, made once and kept.
 * @param part - The part, not the whole sprite
 * @returns Its shape
 */
export function partPath(part: Exclude<SpritePart, 'whole'>): Path2D {
  let path = partPaths.get(part)

  if (path === undefined) {
    path = makePart(part)
    partPaths.set(part, path)
  }

  return path
}

/**
 * The rule a part's shape is filled and clipped by.
 * @param part - The part
 * @returns Even-odd for a shape with holes (a grate's slots, its frame), else non-zero
 */
export function partRule(part: SpritePart): CanvasFillRule {
  return EVEN_ODD_PARTS.has(part) ? 'evenodd' : 'nonzero'
}

/**
 * The sides an open pit tile shows, from the strip tile each of its quarters
 * is drawn from (element_drawings): along each edge of a quarter with no
 * open ditch beyond it, the side running down from the rim, the two sides of
 * a lone corner meeting on its diagonal. An inner corner's short sides, cut
 * off by the tile's edges, take none.
 * @param quarters - The strip tile of each quarter, from STRIP_TILE, by quarter
 * @returns The sides, in the tile's frame of 256 px
 */
export function pitSides(quarters: Readonly<Record<TileQuarter, number>>): Path2D {
  const key = TILE_QUARTERS.map((quarter) => quarters[quarter]).join('')
  const kept = pitSidePaths.get(key)

  if (kept !== undefined) {
    return kept
  }

  const path = new Path2D()

  pitSidePaths.set(key, path)

  for (const quarter of TILE_QUARTERS) {
    const strip = quarters[quarter]
    // Drawn as the top left quarter, then mirrored to its own
    const right = (quarter === 'topRight') || (quarter === 'bottomRight')
    const bottom = (quarter === 'bottomLeft') || (quarter === 'bottomRight')
    const place = (points: readonly Point[]): Point[] => points.map((point): Point => [
      right ? 256 - point[0] : point[0],
      bottom ? 256 - point[1] : point[1],
    ])
    const lone = strip === STRIP_TILE.lone

    if (lone || (strip === STRIP_TILE.horizontalRun)) {
      // Along the row above or below, mitred where a lone corner's other side meets it
      addPolygon(path, place([
        [
          0,
          0,
        ],
        [
          HALF,
          0,
        ],
        [
          HALF,
          PIT_SIDE,
        ],
        [
          lone ? PIT_SIDE : 0,
          PIT_SIDE,
        ],
      ]))
    }

    if (lone || (strip === STRIP_TILE.verticalRun)) {
      addPolygon(path, place([
        [
          0,
          0,
        ],
        [
          PIT_SIDE,
          lone ? PIT_SIDE : 0,
        ],
        [
          PIT_SIDE,
          HALF,
        ],
        [
          0,
          HALF,
        ],
      ]))
    }
  }

  return path
}
