import {Direction} from '@/game/direction'
import {BOX_STYLE, ELEMENT_DRAWINGS} from '@/game/element_drawings'
import {PALETTE} from '@/game/palette'
import {DRAW_LAYERS, type DrawLayer} from '@/game/rules/draw_layer'
import {ELEMENT_REGISTRY} from '@/game/rules/element_registry'
import {PortalColor} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import type {StepTransition} from '@/game/step_animation'
import {TilePainter} from '@/game/tile_painter'

/**
 * The colours and edge width of a portal, drawn as half its wall tile.
 */
type PortalStyle = {
  readonly fillColor: string // Body colour
  readonly borderColor: string // Edge colour
  readonly borderWidth: number // Edge width in pixels
}

/** A floor tile's edge width, in pixels */
const FLOOR_BORDER_WIDTH = 0.1

/** The subject's edge width, in pixels */
const SUBJECT_BORDER_WIDTH = 0.1

/** Each portal's look */
const PORTAL_STYLES: Readonly<Record<PortalColor, PortalStyle>> = {
  [PortalColor.BLUE]: {
    fillColor: PALETTE.bluePortalFill,
    borderColor: PALETTE.bluePortalBorder,
    borderWidth: 1,
  },
  [PortalColor.ORANGE]: {
    fillColor: PALETTE.orangePortalFill,
    borderColor: PALETTE.orangePortalBorder,
    borderWidth: 1,
  },
}

/**
 * Draws a state of the rules onto a canvas: the floor, then each draw layer
 * back to front. The core step's layers (floor, portals, subject) are drawn
 * here; every other layer draws its element types in registry order, each by
 * its drawing in ELEMENT_DRAWINGS. Tiles are square, sized to fit the chamber
 * in the screen area, and row 0 is at the bottom.
 */
export class Renderer {
  private readonly painter: TilePainter // Paints the tiles

  /**
   * Takes over a canvas, collapsing it to 0 × 0 until setSize() is called.
   * @param canvas - The canvas to draw on
   * @param screenWidth - Width available to the chamber, in pixels
   * @param screenHeight - Height available to the chamber, in pixels
   * @param pixelRatio - Canvas pixels per page pixel, such as the screen's device pixel ratio; 1 by default
   * @throws Error when the canvas cannot provide a 2D context
   */
  constructor(canvas: HTMLCanvasElement, screenWidth: number, screenHeight: number, pixelRatio = 1) {
    this.painter = new TilePainter(canvas, screenWidth, screenHeight, pixelRatio)
  }

  /**
   * Changes the area available to the chamber and the pixel ratio. Takes
   * effect on the next setSize().
   * @param screenWidth - Width available to the chamber, in pixels
   * @param screenHeight - Height available to the chamber, in pixels
   * @param pixelRatio - Canvas pixels per page pixel; 1 by default
   */
  resize(screenWidth: number, screenHeight: number, pixelRatio = 1): void {
    this.painter.resize(screenWidth, screenHeight, pixelRatio)
  }

  /**
   * Sizes the tiles and the canvas for a chamber. Clears the canvas.
   * @param width - Chamber width, in tiles
   * @param height - Chamber height, in tiles
   */
  setSize(width: number, height: number): void {
    this.painter.setSize(width, height)
  }

  /**
   * Draws the floor of every tile.
   * @param state - The state drawn
   */
  private drawFloor(state: RulesState): void {
    const size = this.painter.blockSize

    for (let x = 0; x < state.chamber.width; x++) {
      for (let y = 0; y < state.chamber.height; y++) {
        this.painter.drawBlock(x, y, size, size, PALETTE.floorFill, PALETTE.floorBorder, FLOOR_BORDER_WIDTH)
      }
    }
  }

  /**
   * Draws an open portal as the half of its wall tile on the side it opens to.
   * @param state - The state drawn
   * @param color - The portal
   */
  private drawPortal(state: RulesState, color: PortalColor): void {
    const side = state.portalSide(color)

    if (side === null) {
      return
    }

    const x = state.portalX(color)
    const y = state.portalY(color)
    const size = this.painter.blockSize
    const style = PORTAL_STYLES[color]

    switch (side) {
      case Direction.UP:
        this.painter.drawBlockUp(x, y, size, size, style.fillColor, style.borderColor, style.borderWidth)
        break

      case Direction.DOWN:
        this.painter.drawBlockDown(x, y, size, size, style.fillColor, style.borderColor, style.borderWidth)
        break

      case Direction.LEFT:
        this.painter.drawBlockLeft(x, y, size, size, style.fillColor, style.borderColor, style.borderWidth)
        break

      case Direction.RIGHT:
        this.painter.drawBlockRight(x, y, size, size, style.fillColor, style.borderColor, style.borderWidth)
        break
    }
  }

  /**
   * Draws the subject with a triangle showing where it faces, in the box
   * colour while it carries one.
   * @param state - The state drawn
   */
  private drawSubject(state: RulesState): void {
    const x = state.subjectX
    const y = state.subjectY
    const size = this.painter.blockSize

    this.painter.drawBlock(x, y, size, size, PALETTE.subjectFill, PALETTE.subjectBorder, SUBJECT_BORDER_WIDTH)
    this.painter.drawTriangleTowards(state.facing, x, y, state.isCarrying ? BOX_STYLE.fillColor : PALETTE.subjectArrow)
  }

  /**
   * Draws one layer: the core step's own, or every element type on it, in
   * registry order.
   * @param state - The state drawn
   * @param layer - The layer
   * @param transition - The step being drawn, ending on the state drawn, or null to draw the state as it is
   */
  private drawLayer(state: RulesState, layer: DrawLayer, transition: StepTransition | null): void {
    switch (layer) {
      case 'floor':
        this.drawFloor(state)
        break

      case 'portals':
        this.drawPortal(state, PortalColor.BLUE)
        this.drawPortal(state, PortalColor.ORANGE)
        break

      case 'subject':
        this.drawSubject(state)
        break
    }

    for (const definition of ELEMENT_REGISTRY) {
      if (definition.layer === layer) {
        ELEMENT_DRAWINGS[definition.kind](this.painter, state, transition)
      }
    }
  }

  /**
   * Draws a whole frame, back to front.
   * @param state - The state to draw
   * @param transition - The step being drawn, ending on the state drawn, or null (the default) to draw the state as it is
   */
  render(state: RulesState, transition: StepTransition | null = null): void {
    // Drawn at whatever opacity the previous frame left set; the floor then
    // covers all of it
    this.painter.clear()

    for (const layer of DRAW_LAYERS) {
      this.drawLayer(state, layer, transition)
    }
  }
}
