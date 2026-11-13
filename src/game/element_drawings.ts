import {Direction} from '@/game/direction'
import {NO_ELEMENT} from '@/game/rules/compiled_chamber'
import type {BlockableKind, ElementKind} from '@/game/rules/element_registry'
import type {RulesState} from '@/game/rules/rules_state'
import {STRIP_TILE, type SpriteName} from '@/game/sprite_set'
import type {TilePainter} from '@/game/tile_painter'

// How each element type is drawn by the renderer, looked up by kind: the
// rules can't touch the canvas, so drawing stays on the browser side. Each
// element is drawn as its sprite for its state (docs/sprites.md), switched
// off as well as on

/**
 * Draws every element of one type in a state.
 */
export type ElementDrawing = (painter: TilePainter, state: RulesState) => void

/**
 * Which way a laser runs: H for horizontal, V for vertical.
 */
type LaserOrientation = 'H' | 'V'

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
 * Builds a drawing for a type whose elements can be blocked: each element's
 * sprite for whether it is.
 * @param kind - The element type
 * @param blockedSprite - Its sprite while blocked (a barrier raised, a door or the exit closed, a fizzler on)
 * @param unblockedSprite - Its sprite while not
 * @returns The drawing
 */
function blockableDrawing(kind: Exclude<BlockableKind, 'ditch' | 'laser'>, blockedSprite: SpriteName, unblockedSprite: SpriteName): ElementDrawing {
  return (painter, state) => {
    const chamber = state.chamber

    for (let i = 0; i < chamber.countOf(kind); i++) {
      const position = chamber.positionOf(kind, i)

      painter.drawSprite(state.isBlocked(kind, i) ? blockedSprite : unblockedSprite, position.x, position.y)
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
 * Draws every wall tile inside the chamber, each on its own, as the wall
 * strip's lone tile.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawWalls(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber

  for (let x = 0; x < chamber.width; x++) {
    for (let y = 0; y < chamber.height; y++) {
      if (chamber.isWall(x, y)) {
        painter.drawStripTile('wall', STRIP_TILE.lone, x, y)
      }
    }
  }
}

/**
 * Draws the ditches: an open one on its own, as the ditch strip's lone tile,
 * and a bridged one.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawDitches(painter: TilePainter, state: RulesState): void {
  const chamber = state.chamber

  for (let i = 0; i < chamber.countOf('ditch'); i++) {
    const position = chamber.positionOf('ditch', i)

    if (state.isBlocked('ditch', i)) {
      painter.drawStripTile('ditch', STRIP_TILE.lone, position.x, position.y)
    } else {
      painter.drawSprite('ditch_bridged', position.x, position.y)
    }
  }
}

/**
 * Draws the lasers, on or off, each turned to the way it runs.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
function drawLasers(painter: TilePainter, state: RulesState): void {
  const entries = state.chamber.entriesOf('laser')

  entries.forEach((entry, i) => {
    const orientation = readOrientation(entry.direction)

    if (orientation !== null) {
      painter.drawSprite(state.isBlocked('laser', i) ? 'laser_on' : 'laser_off', entry.x, entry.y, LASER_TURNS[orientation])
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
  door: blockableDrawing('door', 'door_closed', 'door_open'),
  exit: blockableDrawing('exit', 'exit_closed', 'exit_open'),
  button: drawButtons,
  switch: drawSwitches,
  box: drawBoxes,
  fizzler: blockableDrawing('fizzler', 'fizzler_on', 'fizzler_off'),
}
