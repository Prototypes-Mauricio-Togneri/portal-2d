import {Direction} from '@/game/direction'
import type {BlockedShares} from '@/game/element_transitions'
import {pieceNumber} from '@/game/piece_number'
import {type CompiledChamber, NO_ELEMENT, type PlacedKind} from '@/game/rules/compiled_chamber'
import type {BlockableKind, ElementKind} from '@/game/rules/element_registry'
import type {RulesState} from '@/game/rules/rules_state'
import {STRIP_TILE, type SpriteName, TILE_QUARTERS, type TileQuarter} from '@/game/sprite_set'
import type {PiecePlacer, TilePainter} from '@/game/tile_painter'

// How each element type is drawn by the renderer, looked up by kind: the
// rules can't touch the canvas, so drawing stays on the browser side. Each
// element is drawn as its sprite for its state (docs/sprites.md), switched
// off as well as on, except a fizzler or a laser that is off, which isn't
// drawn at all. Walls and open ditches join their neighbours, quarter by
// quarter, and doors, the exit and fizzlers are turned to the walls beside
// them; a door or the exit sliding open or shut, or a fizzler crumbling away
// or forming, is drawn part way. Beside them, what moves with time alone:
// the lasers' glow, pulsing with the portals'

/**
 * Draws every element of one type in a state, with the doors, the exit and
 * the fizzlers that are changing drawn part way, or every one as the state
 * says when no shares are given.
 */
export type ElementDrawing = (painter: TilePainter, state: RulesState, shares?: BlockedShares | null) => void

/**
 * Which way a laser runs: H for horizontal, V for vertical.
 */
type LaserOrientation = 'H' | 'V'

/**
 * Whether a tile counts as part of a joined mass: a wall, or an open ditch.
 */
type JoinTest = (x: number, y: number) => boolean

/**
 * The element types that fill a gap in a wall, turned to the walls beside them.
 */
type GapKind = 'door' | 'exit' | 'fizzler'

/**
 * The element types that slide open and shut.
 */
type SlidingKind = 'door' | 'exit'

/**
 * Where the neighbours of a quarter lie: the column step to the tile beside
 * its corner left or right, and the row step to the one above or below. The
 * diagonal between them is both steps.
 */
type QuarterCorner = {
  readonly dx: number // Column step: -1 for a left quarter, 1 for a right one
  readonly dy: number // Row step: 1 for a top quarter, -1 for a bottom one (rows grow upwards)
}

/** Where each quarter's corner points */
const QUARTER_CORNERS: Readonly<Record<TileQuarter, QuarterCorner>> = {
  topLeft: {
    dx: -1,
    dy: 1,
  },
  topRight: {
    dx: 1,
    dy: 1,
  },
  bottomLeft: {
    dx: -1,
    dy: -1,
  },
  bottomRight: {
    dx: 1,
    dy: -1,
  },
}

/** How long one slow pulse of the glows takes, in milliseconds */
const GLOW_PERIOD_MILLISECONDS = 3600

/** The glows' faintest strength in a pulse, the brightest being 1 */
const GLOW_FAINTEST = 0.6

/** Pieces across a fizzler's tile as its field crumbles away or forms */
const FIELD_PIECES_ACROSS = 7

/** The latest a piece of a crumbling field starts to shrink, as a share of the whole change, so the field crumbles away bit by bit */
const LATEST_CRUMBLE_START = 0.55

/** Element types that, besides walls and the chamber's edge, line a gap that a door, the exit or a fizzler fills */
const GAP_SIDE_KINDS: readonly PlacedKind[] = [
  'door',
  'exit',
  'fizzler',
  'barrier',
  'ditch',
]

/** How a laser's sprite, drawn running left to right, is turned for each orientation */
const LASER_TURNS: Readonly<Record<LaserOrientation, Direction>> = {
  H: Direction.UP,
  V: Direction.RIGHT,
}

/**
 * Reads a laser's orientation from its entry.
 * @param text - The entry's direction
 * @returns H or V, or null for anything else
 */
function readOrientation(text: string | undefined): LaserOrientation | null {
  return ((text === 'H') || (text === 'V')) ? text : null
}

/**
 * Picks the strip tile a quarter of a joined tile is taken from, by the two
 * tiles beside its corner and the diagonal between them (docs/sprites.md,
 * joins).
 * @param joins - Whether a tile is part of the same mass
 * @param x - The tile's column
 * @param y - The tile's row
 * @param tileQuarter - The quarter
 * @returns The strip tile, from STRIP_TILE
 */
function stripTileFor(joins: JoinTest, x: number, y: number, tileQuarter: TileQuarter): number {
  const corner = QUARTER_CORNERS[tileQuarter]
  const vertical = joins(x, y + corner.dy)
  const horizontal = joins(x + corner.dx, y)

  if (!vertical && !horizontal) {
    return STRIP_TILE.lone
  }

  if (!vertical) {
    return STRIP_TILE.horizontalRun
  }

  if (!horizontal) {
    return STRIP_TILE.verticalRun
  }

  return joins(x + corner.dx, y + corner.dy) ? STRIP_TILE.solid : STRIP_TILE.innerCorners
}

/**
 * Draws a tile of a joined mass, each quarter from the strip tile its
 * neighbours pick.
 * @param painter - Paints on the canvas
 * @param name - The strip's sprite
 * @param joins - Whether a tile is part of the same mass
 * @param x - Column
 * @param y - Row
 */
function drawJoinedTile(painter: TilePainter, name: SpriteName, joins: JoinTest, x: number, y: number): void {
  for (const tileQuarter of TILE_QUARTERS) {
    painter.drawStripQuarter(name, stripTileFor(joins, x, y, tileQuarter), tileQuarter, x, y)
  }
}

/**
 * Whether a tile lines a gap: a wall, outside the chamber, or a door, the
 * exit, a fizzler, a barrier or a ditch, in any state.
 * @param chamber - The chamber
 * @param x - Column
 * @param y - Row
 * @returns True when it lines a gap
 */
function linesGap(chamber: CompiledChamber, x: number, y: number): boolean {
  return chamber.isWall(x, y) || GAP_SIDE_KINDS.some((kind) => chamber.elementAt(kind, x, y) !== NO_ELEMENT)
}

/**
 * Which way a door, the exit or a fizzler is turned: its sprite is drawn
 * with the walls on its left and right, and given a quarter turn when more
 * of what lines the gap lies above and below it than left and right.
 * @param chamber - The chamber
 * @param x - The element's column
 * @param y - The element's row
 * @returns Up when drawn as it is, right for a quarter turn
 */
function gapTurn(chamber: CompiledChamber, x: number, y: number): Direction {
  const across = Number(linesGap(chamber, x - 1, y)) + Number(linesGap(chamber, x + 1, y))
  const along = Number(linesGap(chamber, x, y + 1)) + Number(linesGap(chamber, x, y - 1))

  return (along > across) ? Direction.RIGHT : Direction.UP
}

/**
 * Places the pieces of a fizzler's field part way through crumbling away or
 * forming: each piece shrinks away to nothing where it is, fading, in its own
 * time, and comes back the same way in reverse.
 * @param share - How much of the field is left, from 0 (gone) to 1 (whole)
 * @param seed - The fizzler's number, so its pieces keep their own times whichever way it changes
 * @returns Where each piece is drawn, or null for one gone
 */
function crumblePlacer(share: number, seed: number): PiecePlacer {
  return (_, __, index) => {
    const start = LATEST_CRUMBLE_START * pieceNumber(seed, index, 0)
    const own = Math.min(Math.max(((1 - share) - start) / (1 - start), 0), 1)

    if (own >= 1) {
      return null
    }

    return {
      dx: 0,
      dy: 0,
      scale: 1 - own,
      alpha: 1 - (own * own),
    }
  }
}

/**
 * Builds a drawing for a type whose elements can be blocked: each element's
 * sprite for whether it is.
 * @param kind - The element type
 * @param blockedSprite - Its sprite while blocked (a barrier raised, a door or the exit closed, a fizzler on)
 * @param unblockedSprite - Its sprite while not
 * @returns The drawing
 */
function blockableDrawing(kind: Exclude<BlockableKind, 'ditch' | 'laser' | GapKind>, blockedSprite: SpriteName, unblockedSprite: SpriteName): ElementDrawing {
  return (painter, state) => {
    const chamber = state.chamber

    for (let i = 0; i < chamber.countOf(kind); i++) {
      const position = chamber.positionOf(kind, i)

      painter.drawSprite(state.isBlocked(kind, i) ? blockedSprite : unblockedSprite, position.x, position.y)
    }
  }
}

/**
 * Builds a drawing for a type that slides open and shut in a gap in a wall:
 * each element's sprite for whether it is closed, turned to the walls beside
 * it. One sliding is drawn part way: its open sprite, under its closed one
 * cut down the middle with each half slid into the wall beside it.
 * @param kind - The element type
 * @param closedSprite - Its sprite while closed
 * @param openSprite - Its sprite while open
 * @returns The drawing
 */
function slidingDrawing(kind: SlidingKind, closedSprite: SpriteName, openSprite: SpriteName): ElementDrawing {
  return (painter, state, shares = null) => {
    const chamber = state.chamber

    for (let i = 0; i < chamber.countOf(kind); i++) {
      const position = chamber.positionOf(kind, i)
      const turn = gapTurn(chamber, position.x, position.y)
      const share = (shares === null) ? null : shares(kind, i)

      if (share === null) {
        painter.drawSprite(state.isBlocked(kind, i) ? closedSprite : openSprite, position.x, position.y, turn)
      } else {
        painter.drawSprite(openSprite, position.x, position.y, turn)
        painter.drawSpriteParted(closedSprite, position.x, position.y, turn, 1 - share)
      }
    }
  }
}

/**
 * Draws the fizzlers that are on, each turned to the walls beside it; one
 * that is off isn't drawn. One crumbling away or forming is drawn part way,
 * in pieces of its sprite.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 * @param shares - How far on the fizzlers that are changing are drawn, or null (the default) to draw every one as the state says
 */
function drawFizzlers(painter: TilePainter, state: RulesState, shares: BlockedShares | null = null): void {
  const chamber = state.chamber

  for (let i = 0; i < chamber.countOf('fizzler'); i++) {
    const position = chamber.positionOf('fizzler', i)
    const turn = gapTurn(chamber, position.x, position.y)
    const share = (shares === null) ? null : shares('fizzler', i)

    if (share !== null) {
      painter.drawSpritePieces('fizzler_on', position.x + 0.5, position.y + 0.5, 1, turn, FIELD_PIECES_ACROSS, crumblePlacer(share, i))
    } else if (state.isBlocked('fizzler', i)) {
      painter.drawSprite('fizzler_on', position.x, position.y, turn)
    }
  }
}

/**
 * Draws the arrows, each turned to its way.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawArrows(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber

  for (let i = 0; i < chamber.countOf('arrow'); i++) {
    const position = chamber.positionOf('arrow', i)
    const direction = chamber.directionOf('arrow', i)

    if (direction !== null) {
      painter.drawSprite('arrow', position.x, position.y, direction)
    }
  }
}

/**
 * Draws every wall tile inside the chamber, joined to the walls around it;
 * outside the chamber counts as open, so the walls along its edge are
 * bevelled on their outer side too.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawWalls(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber
  const joins: JoinTest = (x, y) => (x >= 0) && (y >= 0) && (x < chamber.width) && (y < chamber.height) && chamber.isWall(x, y)

  for (let x = 0; x < chamber.width; x++) {
    for (let y = 0; y < chamber.height; y++) {
      if (chamber.isWall(x, y)) {
        drawJoinedTile(painter, 'wall', joins, x, y)
      }
    }
  }
}

/**
 * Draws the ditches: an open one joined to the open ditches around it, and
 * a bridged one on its own, which ends the pit.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawDitches(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber
  const joins: JoinTest = (x, y) => {
    const index = chamber.elementAt('ditch', x, y)

    return (index !== NO_ELEMENT) && state.isBlocked('ditch', index)
  }

  for (let i = 0; i < chamber.countOf('ditch'); i++) {
    const position = chamber.positionOf('ditch', i)

    if (state.isBlocked('ditch', i)) {
      drawJoinedTile(painter, 'ditch', joins, position.x, position.y)
    } else {
      painter.drawSprite('ditch_bridged', position.x, position.y)
    }
  }
}

/**
 * Draws the lasers that are on, each turned to the way it runs; one that is
 * off isn't drawn.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawLasers(painter: TilePainter, state: RulesState): void {
  const entries = state.chamber.entriesOf('laser')

  entries.forEach((entry, i) => {
    const orientation = readOrientation(entry.direction)

    if ((orientation !== null) && state.isBlocked('laser', i)) {
      painter.drawSprite('laser_on', entry.x, entry.y, LASER_TURNS[orientation])
    }
  })
}

/**
 * How strongly the glows shine at a time: a slow pulse between their
 * faintest and full strength, or halfway when nothing moves.
 * @param time - Now, in milliseconds on the frame clock, or null to hold the glows steady
 * @returns The strength, from GLOW_FAINTEST to 1
 */
export function glowStrength(time: number | null): number {
  const wave = (time === null) ? 0.5 : 0.5 + (0.5 * Math.sin(2 * Math.PI * time / GLOW_PERIOD_MILLISECONDS))

  return GLOW_FAINTEST + ((1 - GLOW_FAINTEST) * wave)
}

/**
 * Draws the glow of every laser that is on, added to what lies beneath,
 * turned to the way it runs.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 * @param strength - How strongly the glows shine, from glowStrength()
 */
export function drawLaserGlows(painter: TilePainter, state: RulesState, strength: number): void {
  state.chamber.entriesOf('laser').forEach((entry, i) => {
    const orientation = readOrientation(entry.direction)

    if ((orientation !== null) && state.isBlocked('laser', i)) {
      painter.drawSpriteAdded('laser_glow', entry.x, entry.y, LASER_TURNS[orientation], strength)
    }
  })
}

/**
 * Draws the buttons, pressed or released.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawButtons(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber

  for (let i = 0; i < chamber.countOf('button'); i++) {
    const position = chamber.positionOf('button', i)

    painter.drawSprite(state.isButtonPressed(i) ? 'button_pressed' : 'button_up', position.x, position.y)
  }
}

/**
 * Draws the switches.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawSwitches(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber

  for (let i = 0; i < chamber.countOf('switch'); i++) {
    const position = chamber.positionOf('switch', i)

    painter.drawSprite('switch', position.x, position.y)
  }
}

/**
 * Draws the boxes that lie in the chamber, at half size on a button so the
 * button shows. A carried box is drawn with the subject.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawBoxes(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber

  for (let i = 0; i < chamber.stateLayout.boxCount; i++) {
    if (i === state.carriedBox) {
      continue
    }

    const x = state.boxX(i)
    const y = state.boxY(i)

    if (chamber.elementAt('button', x, y) === NO_ELEMENT) {
      painter.drawSprite('box', x, y)
    } else {
      painter.drawHalfSprite('box', x, y, Direction.UP, 0)
    }
  }
}

/** How each element type is drawn */
export const ELEMENT_DRAWINGS: Readonly<Record<ElementKind, ElementDrawing>> = {
  arrow: drawArrows,
  wall: drawWalls,
  barrier: blockableDrawing('barrier', 'barrier_raised', 'barrier_lowered'),
  ditch: drawDitches,
  laser: drawLasers,
  door: slidingDrawing('door', 'door_closed', 'door_open'),
  exit: slidingDrawing('exit', 'exit_closed', 'exit_open'),
  button: drawButtons,
  switch: drawSwitches,
  box: drawBoxes,
  fizzler: drawFizzlers,
}
