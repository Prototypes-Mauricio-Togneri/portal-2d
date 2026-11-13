import type {DoorOpenings, DoorSlides} from '@/game/door_slides'
import {drawLaserGlows, ELEMENT_DRAWINGS, glowStrength} from '@/game/element_drawings'
import type {FizzleParticles} from '@/game/fizzle_particles'
import type {CompiledChamber} from '@/game/rules/compiled_chamber'
import {DRAW_LAYERS, type DrawLayer} from '@/game/rules/draw_layer'
import {ELEMENT_REGISTRY} from '@/game/rules/element_registry'
import {PORTAL_COLORS, PortalColor} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {NO_BOX} from '@/game/rules/state_layout'
import type {SpriteName} from '@/game/sprite_set'
import {spriteOf} from '@/game/sprite_sources'
import type {StepTransition} from '@/game/step_animation'
import {subjectPose} from '@/game/subject_pose'
import {TilePainter} from '@/game/tile_painter'

/**
 * A chamber's backdrop as drawn for a tile size.
 */
type Backdrop = {
  readonly chamber: CompiledChamber // The chamber it was drawn for
  readonly tileSize: number // The tile size it was drawn at, in pixels
  readonly layer: TilePainter // The backdrop, on a canvas of its own
}

/** Each portal's sprite */
export const PORTAL_SPRITES: Readonly<Record<PortalColor, SpriteName>> = {
  [PortalColor.BLUE]: 'portal_blue',
  [PortalColor.ORANGE]: 'portal_orange',
}

/** Each open portal's glow */
const PORTAL_GLOWS: Readonly<Record<PortalColor, SpriteName>> = {
  [PortalColor.BLUE]: 'portal_blue_glow',
  [PortalColor.ORANGE]: 'portal_orange_glow',
}

/** How far ahead of the subject's middle a carried box is drawn, the way the subject faces, in tiles */
export const CARRIED_BOX_AHEAD = 0.25

/** The bottom layers, which never change while a chamber is played: drawn once as its backdrop, never each frame */
const BACKDROP_LAYERS: ReadonlySet<DrawLayer> = new Set<DrawLayer>([
  'floor',
  'floorMarks',
  'structure',
])

/**
 * Draws every element type on a layer, in registry order.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 * @param layer - The layer
 * @param openings - How far open the doors and the exit that are sliding are drawn, or null (the default) to draw every one as the state says
 */
function drawElementsOn(painter: TilePainter, state: RulesState, layer: DrawLayer, openings: DoorOpenings | null = null): void {
  for (const definition of ELEMENT_REGISTRY) {
    if (definition.layer === layer) {
      ELEMENT_DRAWINGS[definition.kind](painter, state, openings)
    }
  }
}

/**
 * Draws a chamber's backdrop, the layers that never change while it is
 * played: the background, the floor of every tile and the floor marks, then
 * the walls, painted apart and laid down over the shared drop shadow of
 * their whole mass.
 * @param painter - Paints on the canvas, already sized for the chamber
 * @param state - A state of the chamber; the backdrop is the same for every one
 */
export function drawBackdrop(painter: TilePainter, state: RulesState): void {
  painter.clear()

  for (let x = 0; x < state.chamber.width; x++) {
    for (let y = 0; y < state.chamber.height; y++) {
      painter.drawSprite('floor', x, y)
    }
  }

  drawElementsOn(painter, state, 'floorMarks')

  const structure = painter.createLayer()

  drawElementsOn(structure, state, 'structure')
  painter.drawLayer(structure, true)
}

/**
 * Whether anything in a state moves with time alone, so it is drawn every
 * frame while motion is allowed: a laser that is on or an open portal glows
 * when its glow has a file.
 * @param state - The state drawn
 * @returns True when something glows
 */
export function hasAmbientLife(state: RulesState): boolean {
  const chamber = state.chamber

  if (spriteOf('laser_glow') !== null) {
    for (let i = 0; i < chamber.countOf('laser'); i++) {
      if (state.isBlocked('laser', i)) {
        return true
      }
    }
  }

  return PORTAL_COLORS.some((color) => (state.portalSide(color) !== null) && (spriteOf(PORTAL_GLOWS[color]) !== null))
}

/**
 * Draws a state of the rules onto a canvas from the chamber sprites
 * (docs/sprites.md): the chamber's backdrop (floor, floor marks and walls),
 * drawn once per chamber and tile size and copied every frame, then each
 * other draw layer back to front. The core step's layers (floor, portals,
 * subject) are drawn here; every other layer draws its element types in
 * registry order, each by its drawing in ELEMENT_DRAWINGS. Tiles are square,
 * sized to fit the chamber in the screen area, and row 0 is at the bottom.
 * Part way through a step, the subject and a box it carries are drawn at the
 * subject's pose; the rest is drawn as the state after the step, but for the
 * doors and the exit still sliding open or shut, drawn part way. Last, over
 * everything, the lasers' and portals' glows are added to what lies beneath,
 * pulsing, and what a fizzle took and the fizzlers switched off break up; at
 * no time given, nothing slides, the glows hold steady and nothing breaks up.
 */
export class Renderer {
  private readonly painter: TilePainter // Paints the tiles
  private backdrop: Backdrop | null = null // The backdrop last drawn, kept while the chamber and tile size stay the same

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
   * The backdrop of a state's chamber at the current tile size, drawn the
   * first time it is asked for and kept until the chamber or the tile size
   * changes.
   * @param state - The state drawn
   * @returns The backdrop's layer
   */
  private backdropOf(state: RulesState): TilePainter {
    const tileSize = this.painter.blockSize

    if ((this.backdrop === null) || (this.backdrop.chamber !== state.chamber) || (this.backdrop.tileSize !== tileSize)) {
      const layer = this.painter.createLayer()

      drawBackdrop(layer, state)
      this.backdrop = {
        chamber: state.chamber,
        tileSize: tileSize,
        layer: layer,
      }
    }

    return this.backdrop.layer
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
   * Draws one layer above the backdrop: the core step's own, or every
   * element type on it, in registry order. The shadows of the raised things
   * on it go down before any of them, so touching ones don't shade each other.
   * @param state - The state drawn
   * @param layer - The layer
   * @param transition - The step being drawn, ending on the state drawn, or null to draw the state as it is
   * @param openings - How far open the doors and the exit that are sliding are drawn, or null to draw every one as the state says
   */
  private drawLayer(state: RulesState, layer: DrawLayer, transition: StepTransition | null, openings: DoorOpenings | null): void {
    this.painter.drawShadowsFirst(() => {
      switch (layer) {
        case 'portals':
          this.drawPortal(state, PortalColor.BLUE)
          this.drawPortal(state, PortalColor.ORANGE)
          break

        case 'subject':
          this.drawSubject(state, transition)
          break
      }

      drawElementsOn(this.painter, state, layer, openings)
    })
  }

  /**
   * Draws the glows of the lasers that are on and of the open portals, each
   * added to what lies beneath.
   * @param state - The state drawn
   * @param strength - How strongly they shine, from glowStrength()
   */
  private drawGlows(state: RulesState, strength: number): void {
    drawLaserGlows(this.painter, state, strength)

    for (const color of PORTAL_COLORS) {
      const side = state.portalSide(color)

      if (side !== null) {
        this.painter.drawSpriteAdded(PORTAL_GLOWS[color], state.portalX(color), state.portalY(color), side, strength)
      }
    }
  }

  /**
   * Draws a whole frame, back to front: the backdrop, every layer above it,
   * then the glows and the pieces of what a fizzle took and of the fizzlers
   * switched off.
   * @param state - The state to draw
   * @param transition - The step being drawn, ending on the state drawn, or null (the default) to draw the state as it is
   * @param time - Now, in milliseconds on the frame clock, for what moves with time alone, or null (the default) to hold it still
   * @param fizzle - What a fizzle took and the fizzlers switched off, breaking up, or null (the default) when nothing can
   * @param doors - The doors and the exit sliding open or shut, or null (the default) when none can
   */
  render(state: RulesState, transition: StepTransition | null = null, time: number | null = null, fizzle: FizzleParticles | null = null, doors: DoorSlides | null = null): void {
    // A canvas not yet sized for a chamber has nothing to draw
    if (this.painter.blockSize <= 0) {
      return
    }

    const openings: DoorOpenings | null = ((time !== null) && (doors !== null)) ? (kind, index) => doors.openingAt(kind, index, time) : null

    this.painter.drawLayer(this.backdropOf(state), false)

    for (const layer of DRAW_LAYERS) {
      if (!BACKDROP_LAYERS.has(layer)) {
        this.drawLayer(state, layer, transition, openings)
      }
    }

    this.drawGlows(state, glowStrength(time))

    if ((time !== null) && (fizzle !== null)) {
      fizzle.draw(this.painter, time)
    }
  }
}
