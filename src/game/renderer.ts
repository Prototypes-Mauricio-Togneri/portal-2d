import {antlinesLitKey, drawAntlines} from '@/game/antline_drawing'
import type {BoxFall} from '@/game/box_fall'
import {DELTAS, Direction} from '@/game/direction'
import {heldLook, lookOf} from '@/game/element_detail'
import {drawLaserGlows, drawTurnableArrows, ELEMENT_DRAWINGS, glowStrength} from '@/game/element_drawings'
import type {BlockedShares, ElementTransitions} from '@/game/element_transitions'
import {drawExitShadow} from '@/game/exit_shadow'
import type {FizzleParticles} from '@/game/fizzle_particles'
import type {MissRipple} from '@/game/miss_ripple'
import {PALETTE} from '@/game/palette'
import {drawRayGlows, drawRays, paintRayGlows, rayRuns} from '@/game/ray_drawing'
import type {CompiledChamber, Mirror} from '@/game/rules/compiled_chamber'
import {DRAW_LAYERS, type DrawLayer} from '@/game/rules/draw_layer'
import {ELEMENT_REGISTRY} from '@/game/rules/element_registry'
import {drawPortalOpening, openingGlowShare, type PortalOpenings} from '@/game/portal_openings'
import {PORTAL_COLORS, PortalColor} from '@/game/rules/portal_color'
import {traceRays} from '@/game/rules/rays'
import type {RulesState} from '@/game/rules/rules_state'
import {NO_BOX} from '@/game/rules/state_layout'
import type {SpriteName} from '@/game/sprite_set'
import {spriteOf} from '@/game/sprite_sources'
import {shownState, type StepTransition} from '@/game/step_animation'
import {subjectPose, type SubjectPose} from '@/game/subject_pose'
import type {SubjectTurn} from '@/game/subject_turn'
import {drawFloorTone, drawWallTone} from '@/game/surface_tone'
import {TilePainter} from '@/game/tile_painter'
import {drawFloorWear, drawWallWear} from '@/game/wear_marks'

/**
 * A chamber's backdrop as drawn for a tile size.
 */
type Backdrop = {
  readonly chamber: CompiledChamber // The chamber it was drawn for
  readonly tileSize: number // The tile size it was drawn at, in pixels
  readonly layer: TilePainter // The backdrop, on a canvas of its own
  readonly floor: TilePainter | null // What the backdrop lays under its antlines (the floor, the slide floors, their surface detail and the open exit's shadow), kept apart to draw it again when one changes, or null when the chamber has none
  readonly cover: TilePainter | null // What the backdrop lays over its antlines (floor marks, then walls over their shadow), kept apart to draw it again when one changes, or null when the chamber has none
  readonly litKey: string // Which antlines the backdrop shows lit, from antlinesLitKey()
}

/**
 * The rays' glow as painted for a tile size, kept while the rays stay where
 * they are, since it never moves with time.
 */
type RayGlow = {
  readonly key: string // Where the rays ran and the tile size it was painted for
  readonly layer: TilePainter // The glow, on a canvas of its own
}

/**
 * The layer the subject is drawn on while the chamber is completed, kept
 * from frame to frame while the chamber and the tile size stay the same.
 */
type SubjectLayer = {
  readonly chamber: CompiledChamber // The chamber it was sized for
  readonly tileSize: number // The tile size it was sized for, in pixels
  readonly layer: TilePainter // The layer, on a canvas of its own
}

/**
 * The runs of the rays as drawn.
 */
type RayRuns = ReturnType<typeof rayRuns>

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

/** How far the mirror marked on a carried mirror box reaches from its middle, each way across and up, in tiles */
const CARRIED_MIRROR_REACH = 0.13

/**
 * One stroke of the mirror marked on a carried mirror box.
 */
type MirrorStroke = {
  readonly colour: string // Its colour, from the palette
  readonly width: number // Its width, in tiles; never under a pixel
}

/** The strokes the mirror marked on a carried mirror box is drawn with, bottom to top: its frame, its glass and its glint */
const CARRIED_MIRROR_STROKES: readonly MirrorStroke[] = [
  {
    colour: PALETTE.carriedMirrorFrame,
    width: 0.07,
  },
  {
    colour: PALETTE.carriedMirrorGlass,
    width: 0.045,
  },
  {
    colour: PALETTE.carriedMirrorGlint,
    width: 0.012,
  },
]

/** The runs of a chamber with no rays */
const NO_RUNS: RayRuns = []

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
 * elements over it (the slide floors), then the floor's surface detail,
 * its tones and its wear marks, and last the open exit's shadow, drawn by
 * code, all under the antlines. The closed exit's sprite hides the shadow.
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
  drawFloorTone(painter, state.chamber)
  drawFloorWear(painter, state.chamber)
  drawExitShadow(painter, state.chamber)
}

/**
 * Draws what the backdrop lays over the antlines: the floor marks, then the
 * walls, painted apart with their surface detail, its tones and its wear
 * marks, drawn by code, and laid down over the shared drop shadow of their
 * whole mass.
 * @param painter - Paints on the canvas, already sized for the chamber
 * @param state - A state of the chamber
 */
function drawBackdropCover(painter: TilePainter, state: RulesState): void {
  drawElementsOn(painter, state, 'floorMarks')

  const structure = painter.createLayer()

  drawElementsOn(structure, state, 'structure')
  drawWallTone(structure, state.chamber)
  drawWallWear(structure, state.chamber)
  painter.drawLayer(structure, true)
}

/**
 * Draws a chamber's backdrop, the layers that change only when an antline
 * lights up or goes dark while it is played: the background, the floor of
 * every tile and the slide floors with the floor's surface detail and the
 * open exit's shadow, the antlines and the floor marks, then the walls,
 * painted apart with theirs and laid down over the shared drop shadow of
 * their whole mass.
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
 * @param floor - The floor, the slide floors, their surface detail and the open exit's shadow, from drawFloor()
 * @param cover - The floor marks and the walls over their shadow, from drawBackdropCover()
 * @param state - The state whose antlines are drawn
 */
function composeBackdrop(layer: TilePainter, floor: TilePainter, cover: TilePainter, state: RulesState): void {
  layer.drawLayer(floor, false)
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
 * (docs/sprites.md): the chamber's backdrop (floor and slide floors with the floor's surface detail and the open exit's shadow, antlines,
 * floor marks and walls with theirs), drawn once per chamber and tile size, and again when an
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
 * time, the glows hold steady and nothing breaks up or ripples. While the
 * chamber is completed, the subject, on the exit or walking out past it, is
 * drawn under the open exit's shadow.
 */
export class Renderer {
  private readonly painter: TilePainter // Paints the tiles
  private backdrop: Backdrop | null = null // The backdrop last drawn, kept while the chamber and tile size stay the same
  private rayGlow: RayGlow | null = null // The rays' glow last painted, kept while the rays and the tile size stay the same
  private subjectLayer: SubjectLayer | null = null // The layer the subject was last drawn on while the chamber was completed, kept while the chamber and tile size stay the same

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
   * again from its floor, the antlines and its cover, both kept apart, so
   * neither the surface detail nor the walls' shadow is made again.
   * @param state - The state drawn
   * @returns The backdrop's layer
   */
  private backdropOf(state: RulesState): TilePainter {
    const tileSize = this.painter.blockSize
    const litKey = antlinesLitKey(state)
    const backdrop = this.backdrop

    if ((backdrop === null) || (backdrop.chamber !== state.chamber) || (backdrop.tileSize !== tileSize)) {
      const layer = this.painter.createLayer()
      const hasAntlines = state.chamber.antlines.length > 0
      const floor = hasAntlines ? this.painter.createLayer() : null
      const cover = hasAntlines ? this.painter.createLayer() : null

      if ((floor === null) || (cover === null)) {
        drawBackdrop(layer, state)
      } else {
        drawFloor(floor, state)
        drawBackdropCover(cover, state)
        composeBackdrop(layer, floor, cover, state)
      }

      this.backdrop = {
        chamber: state.chamber,
        tileSize: tileSize,
        layer: layer,
        floor: floor,
        cover: cover,
        litKey: litKey,
      }

      return layer
    }

    if ((backdrop.floor !== null) && (backdrop.cover !== null) && (backdrop.litKey !== litKey)) {
      composeBackdrop(backdrop.layer, backdrop.floor, backdrop.cover, state)
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
   * @param painter - Paints on the canvas, or on a layer of its own
   * @param state - The state drawn
   * @param color - The portal
   * @param opening - How far the portal opening is drawn, or null to draw both open
   */
  private drawPortal(painter: TilePainter, state: RulesState, color: PortalColor, opening: OpeningProgress | null): void {
    const side = state.portalSide(color)

    if (side === null) {
      return
    }

    const progress = (opening === null) ? null : opening(color)

    if (progress === null) {
      painter.drawSprite(PORTAL_SPRITES[color], state.portalX(color), state.portalY(color), side)
    } else {
      drawPortalOpening(painter, PORTAL_SPRITES[color], state.portalX(color), state.portalY(color), side, progress)
    }
  }

  /**
   * Draws the subject turned to the way it faces, or part way through a
   * turn, holding a box it carries or else its portal gun, at its pose:
   * where it stands, or part way through the step being drawn.
   * @param painter - Paints on the canvas, or on a layer of its own
   * @param state - The state drawn, which says whether it carries a box
   * @param pose - Where it is drawn, from subjectPose()
   * @param angle - How far it is turned part way through a turn, in radians clockwise on the canvas from facing up, or null to turn it squarely the way its pose faces
   */
  private drawSubject(painter: TilePainter, state: RulesState, pose: SubjectPose, angle: number | null): void {
    const sprite = (state.carriedBox === NO_BOX) ? 'subject_holding_gun' : 'subject_holding_box'
    const mirror = (state.carriedBox === NO_BOX) ? null : state.chamber.mirrorOf(state.carriedBox)
    // A carried box keeps its look, laid over the box painted in the subject's hands
    const boxLook = (state.carriedBox === NO_BOX) ? null : lookOf(state.chamber, 'box', state.carriedBox)
    const look = (boxLook === null) ? null : heldLook(boxLook, CARRIED_BOX_AHEAD, CARRIED_BOX_SIZE)

    painter.drawClippedToTile(pose.clip, () => {
      if (angle === null) {
        painter.drawSprite(sprite, pose.x, pose.y, pose.facing, look)
      } else {
        painter.drawSpriteRotated(sprite, pose.x, pose.y, angle, look)
      }

      if (mirror !== null) {
        this.drawCarriedMirror(painter, pose, angle, mirror)
      }
    })
  }

  /**
   * Marks the mirror of a carried mirror box over the box in the subject's
   * hands, the right way round in the room whichever way the subject faces
   * or turns, so it reads apart from a plain box.
   * @param painter - Paints on the canvas, or on a layer of its own
   * @param pose - Where the subject is drawn, from subjectPose()
   * @param angle - How far the subject is turned part way through a turn, in radians clockwise on the canvas from facing up, or null when it faces its pose's way squarely
   * @param mirror - The carried box's mirror
   */
  private drawCarriedMirror(painter: TilePainter, pose: SubjectPose, angle: number | null, mirror: Mirror): void {
    // Rows grow upwards, so a turn clockwise on the canvas from up leads right, then down
    const aheadX = (angle === null) ? DELTAS[pose.facing].dx : Math.sin(angle)
    const aheadY = (angle === null) ? DELTAS[pose.facing].dy : Math.cos(angle)
    const middleX = pose.x + 0.5 + (aheadX * CARRIED_BOX_AHEAD)
    const middleY = pose.y + 0.5 + (aheadY * CARRIED_BOX_AHEAD)
    // On the canvas, rows grow downwards: a '/' rises to the right
    const rise = (mirror === '/') ? -1 : 1

    painter.drawInFrame(middleX, middleY, Direction.UP, (ctx, tileSize) => {
      const reach = CARRIED_MIRROR_REACH * tileSize

      ctx.lineCap = 'round'

      for (const stroke of CARRIED_MIRROR_STROKES) {
        ctx.strokeStyle = stroke.colour
        ctx.lineWidth = Math.max(stroke.width * tileSize, 1)
        ctx.beginPath()
        ctx.moveTo(-reach, -rise * reach)
        ctx.lineTo(reach, rise * reach)
        ctx.stroke()
      }
    })
  }

  /**
   * Draws one layer above the backdrop: the core step's own, or every
   * element type on it, in registry order. The shadows of the raised things
   * on it go down before any of them, so touching ones don't shade each other.
   * @param painter - Paints on the canvas, or on a layer of its own
   * @param state - The state drawn
   * @param layer - The layer
   * @param pose - Where the subject is drawn, from subjectPose()
   * @param angle - How far the subject is turned part way through a turn, from SubjectTurn, or null to turn it squarely the way its pose faces
   * @param shares - How far blocked the blocked walls, the ditches, the doors, the exit, the fizzlers, the lasers and the light barriers that are changing are drawn, or null to draw every one as the state says
   * @param opening - How far the portal opening is drawn, or null to draw both open
   */
  private drawLayer(painter: TilePainter, state: RulesState, layer: DrawLayer, pose: SubjectPose, angle: number | null, shares: BlockedShares | null, opening: OpeningProgress | null): void {
    painter.drawShadowsFirst(() => {
      switch (layer) {
        case 'portals':
          this.drawPortal(painter, state, PortalColor.BLUE, opening)
          this.drawPortal(painter, state, PortalColor.ORANGE, opening)
          break

        case 'subject':
          this.drawSubject(painter, state, pose, angle)
          break
      }

      drawElementsOn(painter, state, layer, shares)
    })
  }

  /**
   * Draws one layer above the backdrop, as drawLayer() does, on a layer of
   * its own, darkens what it drew under the open exit's shadow, and lays it
   * down: the subject's while the chamber is completed, so the subject on
   * the exit, or walking out across it, darkens towards the chamber's edge as
   * the floor beneath it does, its drop shadow with it.
   * @param state - The state drawn
   * @param layer - The layer
   * @param pose - Where the subject is drawn, from subjectPose()
   * @param angle - How far the subject is turned part way through a turn, from SubjectTurn, or null to turn it squarely the way its pose faces
   * @param shares - How far blocked the blocked walls, the ditches, the doors, the exit, the fizzlers, the lasers and the light barriers that are changing are drawn, or null to draw every one as the state says
   * @param opening - How far the portal opening is drawn, or null to draw both open
   */
  private drawLayerUnderExitShadow(state: RulesState, layer: DrawLayer, pose: SubjectPose, angle: number | null, shares: BlockedShares | null, opening: OpeningProgress | null): void {
    const own = this.subjectLayerOf(state.chamber)

    own.erase()
    this.drawLayer(own, state, layer, pose, angle, shares, opening)
    drawExitShadow(own, state.chamber, 'source-atop')
    this.painter.drawLayer(own, false)
  }

  /**
   * The layer the subject is drawn on while the chamber is completed, made
   * the first time it is asked for and kept until the chamber or the tile
   * size changes.
   * @param chamber - The chamber drawn
   * @returns The layer, as last painted
   */
  private subjectLayerOf(chamber: CompiledChamber): TilePainter {
    const tileSize = this.painter.blockSize
    const kept = this.subjectLayer

    if ((kept !== null) && (kept.chamber === chamber) && (kept.tileSize === tileSize)) {
      return kept.layer
    }

    const layer = this.painter.createLayer()

    this.subjectLayer = {
      chamber: chamber,
      tileSize: tileSize,
      layer: layer,
    }

    return layer
  }

  /**
   * Draws the glows of the lasers that are on, those fading out or in part
   * way, of the rays, held steady, and of the open portals, each added to
   * what lies beneath, a portal opening rising with it.
   * @param state - The state drawn
   * @param strength - How strongly the lasers and portals shine, from glowStrength()
   * @param shares - How far on the lasers that are changing are drawn, or null to draw every one as the state says
   * @param opening - How far the portal opening is drawn, or null to draw both open
   * @param runs - The rays' runs, from rayRuns()
   */
  private drawGlows(state: RulesState, strength: number, shares: BlockedShares | null, opening: OpeningProgress | null, runs: RayRuns): void {
    drawLaserGlows(this.painter, state, strength, shares)

    if (runs.length > 0) {
      drawRayGlows(this.painter, this.rayGlowOf(runs))
    }

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
   * The rays' glow, painted on its own layer, painted again only when the
   * rays run elsewhere or the tiles change size.
   * @param runs - The rays' runs, from rayRuns()
   * @returns The layer
   */
  private rayGlowOf(runs: RayRuns): TilePainter {
    const tileSize = this.painter.blockSize
    const key = `${tileSize}:${runs.map((run) => `${run.from.x},${run.from.y},${run.to.x},${run.to.y}`).join(';')}`

    if ((this.rayGlow !== null) && (this.rayGlow.key === key)) {
      return this.rayGlow.layer
    }

    const layer = this.painter.createLayer()

    paintRayGlows(layer, runs)
    this.rayGlow = {
      key: key,
      layer: layer,
    }

    return layer
  }

  /**
   * Draws a whole frame, back to front: the backdrop, the arrows a link
   * turns, every layer above it,
   * with the boxes falling into ditches over the ditches, the rays over the
   * buttons and switches and under the boxes, and a portal
   * opening part way open, then the glows, the pieces of what a fizzle took
   * and a missed shot's ripple. Part way along a slide, everything but the
   * subject's pose is drawn as the state on the last tile it has reached
   * (shownState), and the state after the step once the slide ends. The
   * subject is drawn part way through its turn while it turns, and, while
   * the state drawn is completed, on a layer of its own under the open
   * exit's shadow.
   * @param state - The state to draw
   * @param transition - The step being drawn, ending on the state drawn, or null (the default) to draw the state as it is
   * @param time - Now, in milliseconds on the frame clock, for what moves with time alone, or null (the default) to hold it still
   * @param fizzle - What a fizzle took, breaking up, or null (the default) when nothing can
   * @param changes - The arrows, the blocked walls, the ditches, the doors, the exit, the fizzlers, the lasers and the light barriers changing over time, or null (the default) when none can
   * @param ripple - Where the latest missed shot stopped, rippling, or null (the default) when none can
   * @param fall - The boxes falling into ditches, or null (the default) when none can
   * @param openings - The portals opening, or null (the default) when none can
   * @param turn - The subject's turn, followed every frame drawn with a time, or null (the default) to draw it squarely the way it faces
   */
  render(state: RulesState, transition: StepTransition | null = null, time: number | null = null, fizzle: FizzleParticles | null = null, changes: ElementTransitions | null = null, ripple: MissRipple | null = null, fall: BoxFall | null = null, openings: PortalOpenings | null = null, turn: SubjectTurn | null = null): void {
    // A canvas not yet sized for a chamber has nothing to draw
    if (this.painter.blockSize <= 0) {
      return
    }

    const shown = ((transition === null) || (transition.to !== state)) ? state : shownState(transition)
    const pose = subjectPose(state, transition, this.painter.blockSize)
    const angle = ((time !== null) && (turn !== null)) ? turn.angleFor(state, pose, time) : null
    const shares: BlockedShares | null = ((time !== null) && (changes !== null)) ? (kind, index) => changes.blockedAt(kind, index, time) : null
    const opening: OpeningProgress | null = ((time !== null) && (openings !== null)) ? (color) => openings.progressAt(shown, color, time) : null
    const runs = (shown.chamber.countOf('emitter') > 0) ? rayRuns(shown, traceRays(shown)) : NO_RUNS

    this.painter.drawLayer(this.backdropOf(shown), false)
    drawTurnableArrows(this.painter, shown, shares)

    for (const layer of DRAW_LAYERS) {
      // While the chamber is completed the subject is on the exit or walks out past it, under the exit's shadow; read from
      // the state after the step, not the state shown, so a slide onto the exit darkens as it enters the exit's tile
      if ((layer === 'subject') && state.completed) {
        this.drawLayerUnderExitShadow(shown, layer, pose, angle, shares, opening)
      } else if (!BACKDROP_LAYERS.has(layer)) {
        this.drawLayer(this.painter, shown, layer, pose, angle, shares, opening)
      }

      // Down in the pit, over the grate sliding away and under everything standing on the floor
      if ((layer === 'blockers') && (time !== null) && (fall !== null)) {
        fall.draw(this.painter, time)
      }

      // Over the buttons and switches, whose plates lie on the floor, and under the boxes and the subject
      if (layer === 'fixtures') {
        drawRays(this.painter, runs)
      }
    }

    this.drawGlows(shown, glowStrength(time), shares, opening, runs)

    if ((time !== null) && (fizzle !== null)) {
      fizzle.draw(this.painter, time)
    }

    if ((time !== null) && (ripple !== null)) {
      ripple.draw(this.painter, time)
    }
  }
}
