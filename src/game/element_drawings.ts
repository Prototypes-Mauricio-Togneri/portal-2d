import {Direction} from '@/game/direction'
import type {BlockedShares} from '@/game/element_transitions'
import {pieceNumber} from '@/game/piece_number'
import {type BeamKind, type BeamOrientation, type CompiledChamber, NO_ELEMENT, type PlacedKind} from '@/game/rules/compiled_chamber'
import type {ElementKind} from '@/game/rules/element_registry'
import type {RulesState} from '@/game/rules/rules_state'
import {NOT_STORED} from '@/game/rules/state_layout'
import {STRIP_TILE, type SpriteName, TILE_QUARTERS, type TileQuarter} from '@/game/sprite_set'
import type {PiecePlacer, TilePainter} from '@/game/tile_painter'

// How each element type is drawn by the renderer, looked up by kind: the
// rules can't touch the canvas, so drawing stays on the browser side. Each
// element is drawn as its sprite for its state (docs/sprites.md), switched
// off as well as on, except an open door or exit, a fizzler that is off, and
// a laser's or a light barrier's beam that is off, which aren't drawn at
// all; their end plates show where a beam ends, lit or not. Walls, blocked
// walls and open ditches join their neighbours, quarter by quarter (a blocked
// wall a link reaches is drawn in the backdrop as a wall, its blocked surface
// painted over it while it is blocked), and doors, the exit and
// fizzlers are turned to the walls beside them; an arrow's chevron turning
// (an arrow a link turns is drawn every frame over the backdrop, by its own
// drawing), a blocked wall's steel
// sliding apart into the wall beside it or shut, a ditch's grate sliding in
// or out, a door or the exit sliding open or shut, a fizzler crumbling away
// or forming, or a laser or a light barrier fading out or in, is drawn part
// way. Beside them, what moves with time alone: the lasers' glow, pulsing
// with the portals'

/**
 * Draws every element of one type in a state, with the blocked walls, the
 * ditches, the doors, the exit, the fizzlers, the lasers and the light
 * barriers that are changing drawn part way, or every one as the state says
 * when no shares are given.
 */
export type ElementDrawing = (painter: TilePainter, state: RulesState, shares?: BlockedShares | null) => void

/**
 * One end of a beam running a way: where the tile beyond it lies, and how
 * the end plate, drawn at the left end of a beam running left to right, is
 * turned there.
 */
type BeamEnd = {
  readonly dx: number // Column step to the tile beyond the end
  readonly dy: number // Row step to the tile beyond the end (rows grow upwards)
  readonly turn: Direction // How the end plate is turned
}

/**
 * The sprites of a type drawn as a beam.
 */
type BeamSprites = {
  readonly beam: SpriteName // The beam while on, drawn running left to right
  readonly endOn: SpriteName // The end plate while on, drawn at the left end of a beam running left to right
  readonly endOff: SpriteName // The same plate with its slot dark, drawn under endOn
}

/**
 * Whether a tile counts as part of a joined mass: a wall, or an open ditch.
 */
type JoinTest = (x: number, y: number) => boolean

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

/** How far a piece of a crumbling field has shrunk, as a share of its own change, when it has become a full circle: it starts square, so the whole field joins without a seam */
const CRUMBLE_ROUNDED_BY = 0.15

/** Element types that, besides walls and the chamber's edge, line a gap that a door, the exit or a fizzler fills */
const GAP_SIDE_KINDS: readonly PlacedKind[] = [
  'door',
  'exit',
  'fizzler',
  'lightBarrier',
  'ditch',
]

/** The ways a blocked wall's steel slides apart in a run of walls running left to right: its halves go left and right */
const LEVEL_SHUTTER: readonly Direction[] = [
  Direction.LEFT,
  Direction.RIGHT,
]

/** The ways it slides apart in a run running up and down: its halves go up and down */
const UPRIGHT_SHUTTER: readonly Direction[] = [
  Direction.UP,
  Direction.DOWN,
]

/** A laser's sprites */
const LASER_SPRITES: BeamSprites = {
  beam: 'laser_on',
  endOn: 'laser_end_on',
  endOff: 'laser_end_off',
}

/** A light barrier's sprites */
const LIGHT_BARRIER_SPRITES: BeamSprites = {
  beam: 'light_barrier_on',
  endOn: 'light_barrier_end_on',
  endOff: 'light_barrier_end_off',
}

/** How a beam's sprite, drawn running left to right, is turned for each orientation */
const BEAM_TURNS: Readonly<Record<BeamOrientation, Direction>> = {
  H: Direction.UP,
  V: Direction.RIGHT,
}

/** The two ends of a beam running each way: left and right, or top and bottom */
const BEAM_ENDS: Readonly<Record<BeamOrientation, readonly BeamEnd[]>> = {
  H: [
    {
      dx: -1,
      dy: 0,
      turn: Direction.UP,
    },
    {
      dx: 1,
      dy: 0,
      turn: Direction.DOWN,
    },
  ],
  V: [
    {
      dx: 0,
      dy: 1,
      turn: Direction.RIGHT,
    },
    {
      dx: 0,
      dy: -1,
      turn: Direction.LEFT,
    },
  ],
}

/**
 * Reads a laser's or a light barrier's orientation from its entry.
 * @param text - The entry's direction
 * @returns H or V, or null for anything else
 */
function readOrientation(text: string | undefined): BeamOrientation | null {
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
 * Whether a tile lines a gap: a wall, blocked or not, outside the chamber,
 * or a door, the exit, a fizzler, a light barrier or a ditch, in any state.
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
 * forming: each piece rounds off into a circle as it starts, then shrinks
 * away to nothing where it is, fading, in its own time, and comes back the
 * same way in reverse.
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
      roundness: Math.min(own / CRUMBLE_ROUNDED_BY, 1),
    }
  }
}

/**
 * Builds a drawing for a type that slides open and shut in a gap in a wall:
 * each closed element's sprite, turned to the walls beside it; one that is
 * open isn't drawn. One sliding is drawn part way: its sprite cut down the
 * middle, each half slid into the wall beside it.
 * @param kind - The element type
 * @param closedSprite - Its sprite while closed
 * @returns The drawing
 */
function slidingDrawing(kind: SlidingKind, closedSprite: SpriteName): ElementDrawing {
  return (painter, state, shares = null) => {
    const chamber = state.chamber

    for (let i = 0; i < chamber.countOf(kind); i++) {
      const position = chamber.positionOf(kind, i)
      const turn = gapTurn(chamber, position.x, position.y)
      const share = (shares === null) ? null : shares(kind, i)

      if (share !== null) {
        painter.drawSpriteParted(closedSprite, position.x, position.y, turn, 1 - share)
      } else if (state.isBlocked(kind, i)) {
        painter.drawSprite(closedSprite, position.x, position.y, turn)
      }
    }
  }
}

/**
 * Draws the fizzlers that are on, each turned to the walls beside it; one
 * that is off isn't drawn. One crumbling away or forming is drawn part way,
 * in round pieces of its sprite.
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
 * Draws the arrows no link can turn, each turned to its way, into the
 * backdrop. Those a link can turn are drawn every frame by
 * drawTurnableArrows().
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawArrows(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber

  for (let i = 0; i < chamber.countOf('arrow'); i++) {
    const position = chamber.positionOf('arrow', i)
    const direction = chamber.directionOf('arrow', i)

    if ((direction !== null) && (chamber.turnedDirectionOf('arrow', i) === null)) {
      painter.drawSprite('arrow', position.x, position.y, direction)
    }
  }
}

/**
 * How far a sprite drawn facing up is turned to face each way, in radians,
 * clockwise on the canvas.
 */
const WAY_ANGLES: Readonly<Record<Direction, number>> = {
  [Direction.UP]: 0,
  [Direction.RIGHT]: Math.PI / 2,
  [Direction.DOWN]: Math.PI,
  [Direction.LEFT]: -Math.PI / 2,
}

/**
 * The angle of a turnable arrow's chevron part way through its quarter turn,
 * between its turned way and its own way, the short way round.
 * @param turned - The arrow's turned way
 * @param own - The arrow's own way
 * @param share - How far along from its turned way (0) to its own way (1)
 * @returns The angle, in radians, clockwise on the canvas from facing up
 */
function turningAngle(turned: Direction, own: Direction, share: number): number {
  const start = WAY_ANGLES[turned]
  // The validator keeps every turn a quarter turn, so this is ±π/2 once
  // brought into (-π, π]
  let difference = WAY_ANGLES[own] - start

  if (difference > Math.PI) {
    difference -= 2 * Math.PI
  } else if (difference <= -Math.PI) {
    difference += 2 * Math.PI
  }

  return start + (difference * share)
}

/**
 * Draws the arrows a link can turn, every frame over the backdrop, since a
 * link turns them while a chamber is played: each its turntable, which never
 * turns, then its chevron at the way it points now, or part way through its
 * quarter turn while it is turning.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 * @param shares - How far towards their own way the arrows that are turning are drawn, or null (the default) to draw every one at the way it points
 */
export function drawTurnableArrows(painter: TilePainter, state: RulesState, shares: BlockedShares | null = null): void {
  const chamber = state.chamber

  for (let i = 0; i < chamber.countOf('arrow'); i++) {
    const turned = chamber.turnedDirectionOf('arrow', i)
    const own = chamber.directionOf('arrow', i)

    if ((turned === null) || (own === null)) {
      continue
    }

    const position = chamber.positionOf('arrow', i)
    const share = (shares === null) ? null : shares('arrow', i)
    const way = state.pointingWay('arrow', i)

    painter.drawSprite('turntable', position.x, position.y)

    if (share !== null) {
      painter.drawSpriteRotated('turntable_arrow', position.x, position.y, turningAngle(turned, own, share))
    } else if (way !== null) {
      painter.drawSprite('turntable_arrow', position.x, position.y, way)
    }
  }
}

/**
 * Whether a tile is part of the chamber's mass of walls, blocked walls
 * included; outside the chamber counts as open, so the walls along its edge
 * are bevelled on their outer side too.
 * @param chamber - The chamber
 * @returns The join test
 */
function wallJoins(chamber: CompiledChamber): JoinTest {
  return (x, y) => (x >= 0) && (y >= 0) && (x < chamber.width) && (y < chamber.height) && chamber.isWall(x, y)
}

/**
 * Whether a blocked wall can change, because a link reaches it.
 * @param chamber - The chamber
 * @param index - The blocked wall's index in the chamber's blocked wall list
 * @returns True when a link reaches it
 */
function isSwitchable(chamber: CompiledChamber, index: number): boolean {
  return chamber.stateLayout.flagOffset('blockedWall', index) !== NOT_STORED
}

/**
 * Draws every wall tile inside the chamber, joined to the walls around it,
 * for the backdrop, which is the same in every state. A blocked wall no link
 * reaches is drawn from its own strip while blocked, and one a link reaches
 * as a wall, its blocked surface painted over it in a later layer while it
 * is blocked; both kinds join every wall alike, so they make one mass.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawWalls(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber
  const joins = wallJoins(chamber)

  for (let x = 0; x < chamber.width; x++) {
    for (let y = 0; y < chamber.height; y++) {
      if (!chamber.isWall(x, y)) {
        continue
      }

      const blockedWall = chamber.elementAt('blockedWall', x, y)
      const blocked = (blockedWall !== NO_ELEMENT) && (!isSwitchable(chamber, blockedWall)) && state.isBlocked('blockedWall', blockedWall)

      drawJoinedTile(painter, blocked ? 'blocked_wall' : 'wall', joins, x, y)
    }
  }
}

/**
 * Which ways a blocked wall's steel slides apart: into the walls beside it,
 * so along the run of walls it lies in, the way more walls lie beside it,
 * as a door is turned; left and right when as many lie each way.
 * @param joins - Whether a tile is part of the mass of walls
 * @param x - The blocked wall's column
 * @param y - The blocked wall's row
 * @returns The ways its two halves slide
 */
function shutterWays(joins: JoinTest, x: number, y: number): readonly Direction[] {
  const beside = Number(joins(x - 1, y)) + Number(joins(x + 1, y))
  const aboveBelow = Number(joins(x, y + 1)) + Number(joins(x, y - 1))

  return (aboveBelow > beside) ? UPRIGHT_SHUTTER : LEVEL_SHUTTER
}

/**
 * Draws the blocked surface over each blocked wall a link reaches while it is
 * blocked, joined like the wall drawn beneath it in the backdrop, whose
 * shape it keeps, so only the surface changes. One changing is drawn part
 * way: its surface cut down the middle, each half slid into the wall beside
 * it. Only a one-tile blocked wall can be linked.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 * @param shares - How far blocked the blocked walls that are changing are drawn, or null (the default) to draw every one as the state says
 */
function drawBlockedWalls(painter: TilePainter, state: RulesState, shares: BlockedShares | null = null): void {
  const chamber = state.chamber
  const joins = wallJoins(chamber)

  for (let i = 0; i < chamber.countOf('blockedWall'); i++) {
    if (!isSwitchable(chamber, i)) {
      continue
    }

    const position = chamber.positionOf('blockedWall', i)
    const share = (shares === null) ? null : shares('blockedWall', i)
    const drawSurface = (): void => drawJoinedTile(painter, 'blocked_wall', joins, position.x, position.y)

    if (share !== null) {
      for (const way of shutterWays(joins, position.x, position.y)) {
        painter.drawTileSlid(position.x, position.y, way, true, (1 - share) / 2, drawSurface)
      }
    } else if (state.isBlocked('blockedWall', i)) {
      drawSurface()
    }
  }
}

/**
 * Which way a ditch's grate slides in from, and back out to: never from
 * another ditch, so it comes from under the floor or a wall. The way follows
 * the ditches beside it, as a door is turned: in a row of ditches running
 * left to right, from above, or from below when a ditch lies above; else from
 * the left, or from the right when a ditch lies left.
 * @param chamber - The chamber
 * @param x - The ditch's column
 * @param y - The ditch's row
 * @returns The way its grate lies while the ditch is open
 */
function grateSide(chamber: CompiledChamber, x: number, y: number): Direction {
  const isDitch = (column: number, row: number): boolean => chamber.elementAt('ditch', column, row) !== NO_ELEMENT
  const beside = Number(isDitch(x - 1, y)) + Number(isDitch(x + 1, y))
  const aboveBelow = Number(isDitch(x, y + 1)) + Number(isDitch(x, y - 1))

  if (beside > aboveBelow) {
    return isDitch(x, y + 1) ? Direction.DOWN : Direction.UP
  }

  return isDitch(x - 1, y) ? Direction.RIGHT : Direction.LEFT
}

/**
 * Draws the ditches: an open one joined to the open ditches around it, and
 * a bridged one on its own, which ends the pit. One changing is drawn as
 * part of the pit, so the shaft shows under its grate, with the grate part
 * way slid in from its side.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 * @param shares - How far blocked the ditches that are changing are drawn, or null (the default) to draw every one as the state says
 */
function drawDitches(painter: TilePainter, state: RulesState, shares: BlockedShares | null = null): void {
  const chamber = state.chamber
  const shareOf = (index: number): number | null => (shares === null) ? null : shares('ditch', index)
  const joins: JoinTest = (x, y) => {
    const index = chamber.elementAt('ditch', x, y)

    return (index !== NO_ELEMENT) && (state.isBlocked('ditch', index) || (shareOf(index) !== null))
  }

  for (let i = 0; i < chamber.countOf('ditch'); i++) {
    const position = chamber.positionOf('ditch', i)
    const share = shareOf(i)

    if (share !== null) {
      drawJoinedTile(painter, 'ditch', joins, position.x, position.y)
      painter.drawTileSlid(position.x, position.y, grateSide(chamber, position.x, position.y), false, share, () => painter.drawSprite('ditch_bridged', position.x, position.y))
    } else if (state.isBlocked('ditch', i)) {
      drawJoinedTile(painter, 'ditch', joins, position.x, position.y)
    } else {
      painter.drawSprite('ditch_bridged', position.x, position.y)
    }
  }
}

/**
 * Builds a drawing for a type drawn as a beam, a laser or a light barrier:
 * the beams of those that are on, each turned to the way it runs; one that
 * is off isn't drawn, and one fading out or in is drawn see-through.
 * Then, over every beam, the end plates at both ends of each run, on or off.
 * @param kind - The type
 * @param sprites - Its sprites
 * @returns The drawing
 */
function beamDrawing(kind: BeamKind, sprites: BeamSprites): ElementDrawing {
  return (painter, state, shares = null) => {
    const entries = state.chamber.entriesOf(kind)

    entries.forEach((entry, i) => {
      const orientation = readOrientation(entry.direction)
      const share = (shares === null) ? null : shares(kind, i)

      if (orientation === null) {
        return
      }

      if (share !== null) {
        painter.drawSpriteFaded(sprites.beam, entry.x, entry.y, BEAM_TURNS[orientation], share)
      } else if (state.isBlocked(kind, i)) {
        painter.drawSprite(sprites.beam, entry.x, entry.y, BEAM_TURNS[orientation])
      }
    })

    // The end plates go over every beam, so a crossing beam never covers one
    entries.forEach((entry, i) => {
      const orientation = readOrientation(entry.direction)

      if (orientation !== null) {
        const share = (shares === null) ? null : shares(kind, i)

        drawBeamEnds(painter, state.chamber, kind, sprites, entry.x, entry.y, orientation, (share !== null) ? share : (state.isBlocked(kind, i) ? 1 : 0))
      }
    })
  }
}

/**
 * Draws a beam's end plate at each of its ends that ends its run, where the
 * tile beyond holds no beam of its type running the same way: unlit, with
 * the lit one over it as far as the beam is on.
 * @param painter - Paints on the canvas
 * @param chamber - The chamber
 * @param kind - The beam's type
 * @param sprites - Its type's sprites
 * @param x - The beam's column
 * @param y - The beam's row
 * @param orientation - The way it runs
 * @param shine - How far on it is drawn, from 0 (off) to 1 (on)
 */
function drawBeamEnds(painter: TilePainter, chamber: CompiledChamber, kind: BeamKind, sprites: BeamSprites, x: number, y: number, orientation: BeamOrientation, shine: number): void {
  for (const end of BEAM_ENDS[orientation]) {
    if (!chamber.hasBeamAt(kind, x + end.dx, y + end.dy, orientation)) {
      painter.drawSprite(sprites.endOff, x, y, end.turn)

      if (shine > 0) {
        painter.drawSpriteFaded(sprites.endOn, x, y, end.turn, shine)
      }
    }
  }
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
 * turned to the way it runs; the glow of one fading out or in fades with it.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 * @param strength - How strongly the glows shine, from glowStrength()
 * @param shares - How far on the lasers that are changing are drawn, or null (the default) to draw every one as the state says
 */
export function drawLaserGlows(painter: TilePainter, state: RulesState, strength: number, shares: BlockedShares | null = null): void {
  state.chamber.entriesOf('laser').forEach((entry, i) => {
    const orientation = readOrientation(entry.direction)
    const share = (shares === null) ? null : shares('laser', i)
    const shine = (share !== null) ? share : (state.isBlocked('laser', i) ? 1 : 0)

    if ((orientation !== null) && (shine > 0)) {
      painter.drawSpriteAdded('laser_glow', entry.x, entry.y, BEAM_TURNS[orientation], strength * shine)
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
 * Draws the slide floors, every tile of each entry, a rectangle's included.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawSlideFloors(painter: TilePainter, state: RulesState): void {
  for (const entry of state.chamber.entriesOf('slideFloor')) {
    for (let x = entry.x; x <= (entry.xTo ?? entry.x); x++) {
      for (let y = entry.y; y <= (entry.yTo ?? entry.y); y++) {
        painter.drawSprite('slide_floor', x, y)
      }
    }
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
 * Draws the boxes that lie in the chamber, on a button as on the floor. A
 * carried box is drawn with the subject.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawBoxes(painter: TilePainter, state: RulesState): void {
  for (let i = 0; i < state.chamber.stateLayout.boxCount; i++) {
    if (i === state.carriedBox) {
      continue
    }

    painter.drawSprite('box', state.boxX(i), state.boxY(i))
  }
}

/** How each element type is drawn */
export const ELEMENT_DRAWINGS: Readonly<Record<ElementKind, ElementDrawing>> = {
  slideFloor: drawSlideFloors,
  arrow: drawArrows,
  wall: drawWalls,
  blockedWall: drawBlockedWalls,
  lightBarrier: beamDrawing('lightBarrier', LIGHT_BARRIER_SPRITES),
  ditch: drawDitches,
  laser: beamDrawing('laser', LASER_SPRITES),
  door: slidingDrawing('door', 'door_closed'),
  exit: slidingDrawing('exit', 'exit_closed'),
  button: drawButtons,
  switch: drawSwitches,
  box: drawBoxes,
  fizzler: drawFizzlers,
}
