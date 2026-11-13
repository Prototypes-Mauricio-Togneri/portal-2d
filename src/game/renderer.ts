import {ELEMENT_DRAWINGS} from '@/game/element_drawings'
import {DRAW_LAYERS, type DrawLayer} from '@/game/rules/draw_layer'
import {ELEMENT_REGISTRY} from '@/game/rules/element_registry'
import {PortalColor} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {NO_BOX} from '@/game/rules/state_layout'
import type {SpriteName} from '@/game/sprite_set'
import type {StepTransition} from '@/game/step_animation'
import {subjectPose} from '@/game/subject_pose'
import {TilePainter} from '@/game/tile_painter'

/** Each portal's sprite */
const PORTAL_SPRITES: Readonly<Record<PortalColor, SpriteName>> = {
  [PortalColor.BLUE]: 'portal_blue',
  [PortalColor.ORANGE]: 'portal_orange',
}

/** How far ahead of the subject's middle a carried box is drawn, the way the subject faces, in tiles */
const CARRIED_BOX_AHEAD = 0.25

/**
 * Draws a state of the rules onto a canvas from the chamber sprites
 * (docs/sprites.md): the floor, then each draw layer back to front. The core
 * step's layers (floor, portals, subject) are drawn here; every other layer
 * draws its element types in registry order, each by its drawing in
 * ELEMENT_DRAWINGS. Tiles are square, sized to fit the chamber in the screen
 * area, and row 0 is at the bottom. Part way through a step, the subject and
 * a box it carries are drawn at the subject's pose; the rest is drawn as the
 * state after the step.
 */
export class Renderer {
  private readonly painter: TilePainter // Paints the tiles

  /**
   * Takes over a canvas, collapsing it to 0 × 0 until setSize() is called.
   * @param canvas - The canvas to draw on
   * @param screenWidth - Width available to the chamber, in pixels
   * @param screenHeight - Height available to the chamber, in pixels
   * @throws Error when the canvas cannot provide a 2D context
   */
  constructor(canvas: HTMLCanvasElement, screenWidth: number, screenHeight: number) {
    this.painter = new TilePainter(canvas, screenWidth, screenHeight)
  }

  /**
   * Changes the area available to the chamber. Takes effect on the next
   * setSize().
   * @param screenWidth - Width available to the chamber, in pixels
   * @param screenHeight - Height available to the chamber, in pixels
   */
  resize(screenWidth: number, screenHeight: number): void {
    this.painter.resize(screenWidth, screenHeight)
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
    for (let x = 0; x < state.chamber.width; x++) {
      for (let y = 0; y < state.chamber.height; y++) {
        this.painter.drawSprite('floor', x, y)
      }
    }
  }

  /**
   * Draws an open portal over its wall tile, turned to the side it opens to.
   * @param state - The state drawn
   * @param color - The portal
   */
  private drawPortal(state: RulesState, color: PortalColor): void {
    const side = state.portalSide(color)

    if (side !== null) {
      this.painter.drawSprite(PORTAL_SPRITES[color], state.portalX(color), state.portalY(color), side)
    }
  }

  /**
   * Draws the subject turned to the way it faces, and a box it carries at
   * half size in front of it, at its pose: where it stands, or part way
   * through the step being drawn.
   * @param state - The state drawn
   * @param transition - The step being drawn, ending on the state drawn, or null to draw the state as it is
   */
  private drawSubject(state: RulesState, transition: StepTransition | null): void {
    const pose = subjectPose(state, transition, this.painter.blockSize)

    this.painter.drawClippedToTile(pose.clip, () => {
      this.painter.drawSprite('subject', pose.x, pose.y, pose.facing)

      if (state.carriedBox !== NO_BOX) {
        this.painter.drawHalfSprite('box', pose.x, pose.y, pose.facing, CARRIED_BOX_AHEAD)
      }
    })
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
        this.drawSubject(state, transition)
        break
    }

    for (const definition of ELEMENT_REGISTRY) {
      if (definition.layer === layer) {
        ELEMENT_DRAWINGS[definition.kind](this.painter, state)
      }
    }
  }

  /**
   * Draws a whole frame, back to front.
   * @param state - The state to draw
   * @param transition - The step being drawn, ending on the state drawn, or null (the default) to draw the state as it is
   */
  render(state: RulesState, transition: StepTransition | null = null): void {
    this.painter.clear()

    for (const layer of DRAW_LAYERS) {
      this.drawLayer(state, layer, transition)
    }
  }
}
