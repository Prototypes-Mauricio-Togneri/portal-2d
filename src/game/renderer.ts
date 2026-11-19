import {antlinesLitKey, drawAntlines} from '@/game/antline_drawing'
import type {BoxFall} from '@/game/box_fall'
import {drawLaserGlows, drawTurnableArrows, ELEMENT_DRAWINGS, glowStrength} from '@/game/element_drawings'
import type {BlockedShares, ElementTransitions} from '@/game/element_transitions'
import type {FizzleParticles} from '@/game/fizzle_particles'
import type {MissRipple} from '@/game/miss_ripple'
import type {CompiledChamber} from '@/game/rules/compiled_chamber'
import {DRAW_LAYERS, type DrawLayer} from '@/game/rules/draw_layer'
import {ELEMENT_REGISTRY} from '@/game/rules/element_registry'
import {drawPortalOpening, openingGlowShare, type PortalOpenings} from '@/game/portal_openings'
import {PORTAL_COLORS, PortalColor} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {NO_BOX} from '@/game/rules/state_layout'
import type {SpriteName} from '@/game/sprite_set'
import {spriteOf} from '@/game/sprite_sources'
import {shownState, type StepTransition} from '@/game/step_animation'
import {subjectPose, type SubjectPose} from '@/game/subject_pose'
import {TilePainter} from '@/game/tile_painter'

/**
 * A chamber's backdrop as drawn for a tile size.
 */
type Backdrop = {
  readonly chamber: CompiledChamber // The chamber it was drawn for
  readonly tileSize: number // The tile size it was drawn at, in pixels
  readonly layer: TilePainter // The backdrop, on a canvas of its own
  readonly cover: TilePainter | null // What the backdrop lays over its antlines (floor marks, then walls over their shadow), kept apart to draw it again when one changes, or null when the chamber has none
  readonly litKey: string // Which antlines the backdrop shows lit, from antlinesLitKey()
}

/**
 * How far a portal has opened, for the one opening, or null to draw it as
 * it is.
 * @param color - The portal
 * @returns How far it has opened, from 0 to under 1, or null when it isn't opening
 */
type OpeningProgress = (color: PortalColor) => number | null

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

/** How far ahead of the subject's middle the box in the subject's box-holding sprite sits, the way the subject faces, in tiles */
export const CARRIED_BOX_AHEAD = 0.26

/** The side of the box sprite drawn where the subject's box-holding sprite shows its box, as a share of a tile, so the two boxes match */
export const CARRIED_BOX_SIZE = 0.7

/** The bottom layers, which never change while a chamber is played: drawn as its backdrop with the antlines, never each frame. An arrow a link turns, on the floor marks' layer, is left out of it and drawn every frame right over it */
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
 * @param shares - How far blocked the blocked walls, the ditches, the doors, the exit, the fizzlers, the lasers and the light barriers that are changing are drawn, or null (the default) to draw every one as the state says
 */
function drawElementsOn(painter: TilePainter, state: RulesState, layer: DrawLayer, shares: BlockedShares | null = null): void {
  for (const definition of ELEMENT_REGISTRY) {
    if (definition.layer === layer) {
      ELEMENT_DRAWINGS[definition.kind](painter, state, shares)
    }
  }
}

/**
 * Draws the background, the floor of every tile, then the floor layer's
 * elements over it (the slide floors), all under the antlines.
 * @param painter - Paints on the canvas, already sized for the chamber
 * @param state - A state of the chamber
 */
function drawFloor(painter: TilePainter, state: RulesState): void {
  painter.clear()

  for (let x = 0; x < state.chamber.width; x++) {
    for (let y = 0; y < state.chamber.height; y++) {
      painter.drawSprite('floor', x, y)
    }
  }

  drawElementsOn(painter, state, 'floor')
}

/**
 * Draws what the backdrop lays over the antlines: the floor marks, then the
 * walls, painted apart and laid down over the shared drop shadow of their
 * whole mass.
 * @param painter - Paints on the canvas, already sized for the chamber
 * @param state - A state of the chamber
 */
function drawBackdropCover(painter: TilePainter, state: RulesState): void {
  drawElementsOn(painter, state, 'floorMarks')

  const structure = painter.createLayer()

  drawElementsOn(structure, state, 'structure')
  painter.drawLayer(structure, true)
}

/**
 * Draws a chamber's backdrop, the layers that change only when an antline
 * lights up or goes dark while it is played: the background, the floor of
 * every tile and the slide floors, the antlines and the floor marks, then the walls, painted
 * apart and laid down over the shared drop shadow of their whole mass.
 * @param painter - Paints on the canvas, already sized for the chamber
 * @param state - The state whose antlines are drawn; the rest is the same for every state of the chamber
 */
export function drawBackdrop(painter: TilePainter, state: RulesState): void {
  drawFloor(painter, state)
  drawAntlines(painter, state)
  drawBackdropCover(painter, state)
}

/**
 * Draws a backdrop from its parts: the floor, a state's antlines, then the
 * cover laid over them.
 * @param layer - The backdrop's layer, drawn over in full
 * @param cover - The floor marks and the walls over their shadow, from drawBackdropCover()
 * @param state - The state whose antlines are drawn
 */
function composeBackdrop(layer: TilePainter, cover: TilePainter, state: RulesState): void {
  drawFloor(layer, state)
  drawAntlines(layer, state)
  layer.drawLayer(cover, false)
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
 * (docs/sprites.md): the chamber's backdrop (floor and slide floors, antlines,
 * floor marks and walls), drawn once per chamber and tile size, and again when an
 * antline lights up or goes dark, and copied every frame, then each
 * other draw layer back to front. The core step's layers (floor, portals,
 * subject) are drawn here; every other layer draws its element types in
 * registry order, each by its drawing in ELEMENT_DRAWINGS. Tiles are square,
 * sized to fit the chamber in the screen area, but no larger than a chamber of
 * the minimum size would get, and row 0 is at the bottom.
 * Part way through a step, the subject and a box it carries are drawn at the
 * subject's pose; the rest is drawn as the state after the step, but for the
 * blocked walls' steel still sliding apart or shut, the ditches' grates still
 * sliding in or out, the doors and the exit still sliding open or shut, the
 * fizzlers still crumbling away or forming and the lasers and light barriers
 * still fading out or in, drawn part way, and a portal opening drawn part way open. Last, over everything, the lasers' and portals' glows are added
 * to what lies beneath, pulsing, an opening portal's rising with it, what a fizzle took breaks up and a missed
 * shot ripples where it stopped; at no time given, nothing changes over
 * time, the glows hold steady and nothing breaks up or ripples.
 */
export class Renderer {
  private readonly painter: TilePainter // Paints the tiles
  private backdrop: Backdrop | null = null // The backdrop last drawn, kept while the chamber and tile size stay the same

  /**
   * Takes over a canvas, collapsing it to 0 × 0 until setSize() is called.
   * @param canvas - The canvas to draw on
   * @param screenWidth - Width available to the chamber, in pixels
   * @param screenHeight - Height available to the chamber, in pixels
   * @param minimumTiles - Fewest tiles the tiles are sized for each way; a smaller chamber is drawn with the tiles a chamber this size would get, leaving the rest of the area empty
   * @throws Error when the canvas cannot provide a 2D context
   */
  constructor(canvas: HTMLCanvasElement, screenWidth: number, screenHeight: number, minimumTiles = 1) {
    this.painter = new TilePainter(canvas, screenWidth, screenHeight, minimumTiles)
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
   * changes. When an antline lights up or goes dark, the backdrop is drawn
   * again from its floor, the antlines and its cover, kept apart, so the
   * walls' shadow isn't made again.
   * @param state - The state drawn
   * @returns The backdrop's layer
   */
  private backdropOf(state: RulesState): TilePainter {
    const tileSize = this.painter.blockSize
    const litKey = antlinesLitKey(state)
    const backdrop = this.backdrop

    if ((backdrop === null) || (backdrop.chamber !== state.chamber) || (backdrop.tileSize !== tileSize)) {
      const layer = this.painter.createLayer()
      const cover = (state.chamber.antlines.length > 0) ? this.painter.createLayer() : null

      if (cover === null) {
        drawBackdrop(layer, state)
      } else {
        drawBackdropCover(cover, state)
        composeBackdrop(layer, cover, state)
      }

      this.backdrop = {
        chamber: state.chamber,
        tileSize: tileSize,
        layer: layer,
        cover: cover,
        litKey: litKey,
      }

      return layer
    }

    if ((backdrop.cover !== null) && (backdrop.litKey !== litKey)) {
      composeBackdrop(backdrop.layer, backdrop.cover, state)
      this.backdrop = {
        ...backdrop,
        litKey: litKey,
      }
    }

    return backdrop.layer
  }

  /**
   * Draws an open portal over its wall tile, turned to the side it opens to,
   * part way open while it is opening.
   * @param state - The state drawn
   * @param color - The portal
   * @param opening - How far the portal opening is drawn, or null to draw both open
   */
  private drawPortal(state: RulesState, color: PortalColor, opening: OpeningProgress | null): void {
    const side = state.portalSide(color)

    if (side === null) {
      return
    }

    const progress = (opening === null) ? null : opening(color)

    if (progress === null) {
      this.painter.drawSprite(PORTAL_SPRITES[color], state.portalX(color), state.portalY(color), side)
    } else {
      drawPortalOpening(this.painter, PORTAL_SPRITES[color], state.portalX(color), state.portalY(color), side, progress)
    }
  }

  /**
   * Draws the subject turned to the way it faces, holding a box it carries
   * or else its portal gun, at its pose: where it stands, or part way
   * through the step being drawn.
   * @param state - The state drawn, which says whether it carries a box
   * @param pose - Where it is drawn, from subjectPose()
   */
  private drawSubject(state: RulesState, pose: SubjectPose): void {
    const sprite = (state.carriedBox === NO_BOX) ? 'subject_holding_gun' : 'subject_holding_box'

    this.painter.drawClippedToTile(pose.clip, () => {
      this.painter.drawSprite(sprite, pose.x, pose.y, pose.facing)
    })
  }

  /**
   * Draws one layer above the backdrop: the core step's own, or every
   * element type on it, in registry order. The shadows of the raised things
   * on it go down before any of them, so touching ones don't shade each other.
   * @param state - The state drawn
   * @param layer - The layer
   * @param pose - Where the subject is drawn, from subjectPose()
   * @param shares - How far blocked the blocked walls, the ditches, the doors, the exit, the fizzlers, the lasers and the light barriers that are changing are drawn, or null to draw every one as the state says
   * @param opening - How far the portal opening is drawn, or null to draw both open
   */
  private drawLayer(state: RulesState, layer: DrawLayer, pose: SubjectPose, shares: BlockedShares | null, opening: OpeningProgress | null): void {
    this.painter.drawShadowsFirst(() => {
      switch (layer) {
        case 'portals':
          this.drawPortal(state, PortalColor.BLUE, opening)
          this.drawPortal(state, PortalColor.ORANGE, opening)
          break

        case 'subject':
          this.drawSubject(state, pose)
          break
      }

      drawElementsOn(this.painter, state, layer, shares)
    })
  }

  /**
   * Draws the glows of the lasers that are on, those fading out or in part
   * way, and of the open portals, each added to what lies beneath, a portal
   * opening rising with it.
   * @param state - The state drawn
   * @param strength - How strongly they shine, from glowStrength()
   * @param shares - How far on the lasers that are changing are drawn, or null to draw every one as the state says
   * @param opening - How far the portal opening is drawn, or null to draw both open
   */
  private drawGlows(state: RulesState, strength: number, shares: BlockedShares | null, opening: OpeningProgress | null): void {
    drawLaserGlows(this.painter, state, strength, shares)

    for (const color of PORTAL_COLORS) {
      const side = state.portalSide(color)
      const progress = (opening === null) ? null : opening(color)
      const share = (progress === null) ? 1 : openingGlowShare(progress)

      if ((side !== null) && (share > 0)) {
        this.painter.drawSpriteAdded(PORTAL_GLOWS[color], state.portalX(color), state.portalY(color), side, strength * share)
      }
    }
  }

  /**
   * Draws a whole frame, back to front: the backdrop, the arrows a link
   * turns, every layer above it,
   * with the boxes falling into ditches over the ditches and a portal
   * opening part way open, then the glows, the pieces of what a fizzle took
   * and a missed shot's ripple. Part way along a slide, everything but the
   * subject's pose is drawn as the state on the last tile it has reached
   * (shownState), and the state after the step once the slide ends.
   * @param state - The state to draw
   * @param transition - The step being drawn, ending on the state drawn, or null (the default) to draw the state as it is
   * @param time - Now, in milliseconds on the frame clock, for what moves with time alone, or null (the default) to hold it still
   * @param fizzle - What a fizzle took, breaking up, or null (the default) when nothing can
   * @param changes - The arrows, the blocked walls, the ditches, the doors, the exit, the fizzlers, the lasers and the light barriers changing over time, or null (the default) when none can
   * @param ripple - Where the latest missed shot stopped, rippling, or null (the default) when none can
   * @param fall - The boxes falling into ditches, or null (the default) when none can
   * @param openings - The portals opening, or null (the default) when none can
   */
  render(state: RulesState, transition: StepTransition | null = null, time: number | null = null, fizzle: FizzleParticles | null = null, changes: ElementTransitions | null = null, ripple: MissRipple | null = null, fall: BoxFall | null = null, openings: PortalOpenings | null = null): void {
    // A canvas not yet sized for a chamber has nothing to draw
    if (this.painter.blockSize <= 0) {
      return
    }

    const shown = ((transition === null) || (transition.to !== state)) ? state : shownState(transition)
    const pose = subjectPose(state, transition, this.painter.blockSize)
    const shares: BlockedShares | null = ((time !== null) && (changes !== null)) ? (kind, index) => changes.blockedAt(kind, index, time) : null
    const opening: OpeningProgress | null = ((time !== null) && (openings !== null)) ? (color) => openings.progressAt(shown, color, time) : null

    this.painter.drawLayer(this.backdropOf(shown), false)
    drawTurnableArrows(this.painter, shown, shares)

    for (const layer of DRAW_LAYERS) {
      if (!BACKDROP_LAYERS.has(layer)) {
        this.drawLayer(shown, layer, pose, shares, opening)
      }

      // Down in the pit, over the grate sliding away and under everything standing on the floor
      if ((layer === 'blockers') && (time !== null) && (fall !== null)) {
        fall.draw(this.painter, time)
      }
    }

    this.drawGlows(shown, glowStrength(time), shares, opening)

    if ((time !== null) && (fizzle !== null)) {
      fizzle.draw(this.painter, time)
    }

    if ((time !== null) && (ripple !== null)) {
      ripple.draw(this.painter, time)
    }
  }
}
