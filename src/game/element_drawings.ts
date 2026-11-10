import {PALETTE} from '@/game/palette'
import {NO_ELEMENT} from '@/game/rules/compiled_chamber'
import type {BlockableKind, ElementKind} from '@/game/rules/element_registry'
import type {RulesState} from '@/game/rules/rules_state'
import type {StepTransition} from '@/game/step_animation'
import {boxCarriedThrough, subjectPose} from '@/game/subject_pose'
import type {LineOrientation, TilePainter} from '@/game/tile_painter'

// How each element type is drawn by the renderer, looked up by kind: the
// rules can't touch the canvas, so drawing stays on the browser side. The
// original game's drawing code, colours (named in the palette) and sizes;
// a settled state's look stays frozen until stage 03 reworks it, which so
// far only adds the frames part way through a step

/**
 * Draws every element of one type in a state, given the step being drawn,
 * if any, whose `to` is that state.
 */
export type ElementDrawing = (painter: TilePainter, state: RulesState, transition: StepTransition | null) => void

/**
 * The colours and edge width of a tile drawn as a filled block.
 */
type BlockStyle = {
  readonly fillColor: string // Body colour
  readonly borderColor: string // Edge colour
  readonly borderWidth: number // Edge width in pixels
}

/** A wall tile */
const WALL_STYLE: BlockStyle = {
  fillColor: PALETTE.wallFill,
  borderColor: PALETTE.wallBorder,
  borderWidth: 0.1,
}

/** A door, and the exit, while closed */
const DOOR_STYLE: BlockStyle = {
  fillColor: PALETTE.doorFill,
  borderColor: PALETTE.doorBorder,
  borderWidth: 0.1,
}

/** A floor button */
const BUTTON_STYLE: BlockStyle = {
  fillColor: PALETTE.buttonFill,
  borderColor: PALETTE.buttonBorder,
  borderWidth: 0.1,
}

/** A switch */
const SWITCH_STYLE: BlockStyle = {
  fillColor: PALETTE.switchFill,
  borderColor: PALETTE.switchBorder,
  borderWidth: 0.1,
}

/** A box; its fill also colours the subject's facing triangle while it carries one */
export const BOX_STYLE: BlockStyle = {
  fillColor: PALETTE.boxFill,
  borderColor: PALETTE.boxBorder,
  borderWidth: 0.1,
}

/** A fizzler while it is on, drawn at half opacity */
const FIZZLER_STYLE: BlockStyle = {
  fillColor: PALETTE.fizzlerFill,
  borderColor: PALETTE.fizzlerBorder,
  borderWidth: 0.1,
}

/** Opacity of a fizzler */
const FIZZLER_OPACITY = 0.5

/** The beam is this many times thinner than a tile */
const LASER_WIDTH_RATIO = 6

/**
 * Reads a laser's orientation from its entry.
 * @param text - The entry's direction
 * @returns H or V, or null for anything else
 */
function readOrientation(text: string | undefined): LineOrientation | null {
  return ((text === 'H') || (text === 'V')) ? text : null
}

/**
 * Fills a whole tile in a block style.
 * @param painter - Paints on the canvas
 * @param x - Column
 * @param y - Row
 * @param style - The block's colours and edge
 * @param opacity - Alpha; absent means opaque
 */
function drawStyledBlock(painter: TilePainter, x: number, y: number, style: BlockStyle, opacity?: number): void {
  painter.drawBlock(x, y, painter.blockSize, painter.blockSize, style.fillColor, style.borderColor, style.borderWidth, opacity)
}

/**
 * Builds a drawing that fills the tile of every element of a type, or only
 * of those that are blocked.
 * @param kind - The element type
 * @param style - The block's colours and edge
 * @param onlyBlocked - The same type when only its blocked elements are drawn, or null to draw them all
 * @param opacity - Alpha; absent means opaque
 * @returns The drawing
 */
function blockDrawing(kind: Exclude<ElementKind, 'wall' | 'box'>, style: BlockStyle, onlyBlocked: BlockableKind | null, opacity?: number): ElementDrawing {
  return (painter, state) => {
    const chamber = state.chamber

    for (let i = 0; i < chamber.countOf(kind); i++) {
      if ((onlyBlocked === null) || state.isBlocked(onlyBlocked, i)) {
        const position = chamber.positionOf(kind, i)

        drawStyledBlock(painter, position.x, position.y, style, opacity)
      }
    }
  }
}

/**
 * Draws the arrows as triangles on the floor.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawArrows(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber

  for (let i = 0; i < chamber.countOf('arrow'); i++) {
    const position = chamber.positionOf('arrow', i)
    const direction = chamber.directionOf('arrow', i)

    if (direction !== null) {
      painter.drawTriangleTowards(direction, position.x, position.y, PALETTE.arrow)
    }
  }
}

/**
 * Draws every wall tile inside the chamber.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawWalls(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber

  for (let x = 0; x < chamber.width; x++) {
    for (let y = 0; y < chamber.height; y++) {
      if (chamber.isWall(x, y)) {
        drawStyledBlock(painter, x, y, WALL_STYLE)
      }
    }
  }
}

/**
 * Draws the raised barriers as a radial gradient, lighter at the centre.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawBarriers(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber
  const size = painter.blockSize

  for (let i = 0; i < chamber.countOf('barrier'); i++) {
    if (!state.isBlocked('barrier', i)) {
      continue
    }

    const position = chamber.positionOf('barrier', i)
    const finalPosition = painter.getFinalPosition(position.x, position.y)
    const x = finalPosition.x + (size / 2)
    const y = finalPosition.y - size + (size / 2)
    const gradient = painter.createRadialGradient(x, y, size, PALETTE.barrierCenter, PALETTE.barrierEdge)

    painter.renderBlock(finalPosition.x, finalPosition.y, size, size, gradient, null, 0)
  }
}

/**
 * Draws the open ditches.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawDitches(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber

  for (let i = 0; i < chamber.countOf('ditch'); i++) {
    if (state.isBlocked('ditch', i)) {
      const position = chamber.positionOf('ditch', i)

      painter.drawBlock(position.x, position.y, painter.blockSize, painter.blockSize, PALETTE.ditch, null, 0)
    }
  }
}

/**
 * Draws the lasers that are on, as a line through their tile.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawLasers(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber
  const entries = chamber.entriesOf('laser')

  entries.forEach((entry, i) => {
    const orientation = readOrientation(entry.direction)

    if ((orientation !== null) && state.isBlocked('laser', i)) {
      painter.drawLine(orientation, entry.x, entry.y, painter.blockSize, painter.blockSize, PALETTE.laser, PALETTE.laser, 0, 1, LASER_WIDTH_RATIO)
    }
  })
}

/**
 * Draws one box, shrunk to a quarter when on a button so the button shows.
 * @param painter - Paints on the canvas
 * @param x - Column, part way between two while it is carried through a step
 * @param y - Row, part way between two while it is carried through a step
 * @param onButton - Whether its tile holds a button
 */
function drawBox(painter: TilePainter, x: number, y: number, onButton: boolean): void {
  if (onButton) {
    painter.drawMiniBlock(x, y, painter.blockSize, painter.blockSize, BOX_STYLE.fillColor, BOX_STYLE.borderColor, BOX_STYLE.borderWidth)
  } else {
    drawStyledBlock(painter, x, y, BOX_STYLE)
  }
}

/**
 * Draws the boxes, shrunk to a quarter when on a button so the button shows.
 * A box carried through the step being drawn moves with the subject, which
 * covers it.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 * @param transition - The step being drawn, ending on the state drawn, or null to draw the state as it is
 */
function drawBoxes(painter: TilePainter, state: RulesState, transition: StepTransition | null): void {
  const chamber = state.chamber
  const carried = boxCarriedThrough(state, transition)

  for (let i = 0; i < chamber.stateLayout.boxCount; i++) {
    const x = state.boxX(i)
    const y = state.boxY(i)
    const onButton = chamber.elementAt('button', x, y) !== NO_ELEMENT

    if (i === carried) {
      const pose = subjectPose(state, transition, painter.blockSize)

      painter.drawClippedToTile(pose.clip, () => {
        drawBox(painter, pose.x, pose.y, onButton)
      })
    } else {
      drawBox(painter, x, y, onButton)
    }
  }
}

/** How each element type is drawn */
export const ELEMENT_DRAWINGS: Readonly<Record<ElementKind, ElementDrawing>> = {
  arrow: drawArrows,
  wall: drawWalls,
  barrier: drawBarriers,
  ditch: drawDitches,
  laser: drawLasers,
  door: blockDrawing('door', DOOR_STYLE, 'door'),
  exit: blockDrawing('exit', DOOR_STYLE, 'exit'),
  button: blockDrawing('button', BUTTON_STYLE, null),
  switch: blockDrawing('switch', SWITCH_STYLE, null),
  box: drawBoxes,
  fizzler: blockDrawing('fizzler', FIZZLER_STYLE, 'fizzler', FIZZLER_OPACITY),
}
