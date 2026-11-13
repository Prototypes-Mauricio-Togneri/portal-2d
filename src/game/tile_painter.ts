import type {PositionData} from '@/game/chamber_data'
import {Direction} from '@/game/direction'
import {PALETTE} from '@/game/palette'
import {DELTAS} from '@/game/rules/step'
import {type ScaledSprite, scaledShadow, scaledSprite, shadowBlur} from '@/game/sprite_scaling'
import {quarterRect, RAISED_SPRITES, type SpriteName, type TileQuarter} from '@/game/sprite_set'

/**
 * What a drawing paints: shadows and sprites, only the raised sprites'
 * shadows, or only the sprites.
 */
type PaintPass = 'both' | 'shadows' | 'sprites'

/**
 * A quarter turn on the canvas, as the exact cosine and sine of its angle.
 */
type QuarterTurn = {
  readonly cos: number // Cosine of the angle
  readonly sin: number // Sine of the angle, turning clockwise on the canvas
}

/** How a sprite drawn facing up is turned to face each way */
const TURNS: Readonly<Record<Direction, QuarterTurn>> = {
  [Direction.UP]: {
    cos: 1,
    sin: 0,
  },
  [Direction.RIGHT]: {
    cos: 0,
    sin: 1,
  },
  [Direction.DOWN]: {
    cos: -1,
    sin: 0,
  },
  [Direction.LEFT]: {
    cos: 0,
    sin: -1,
  },
}

/**
 * Where one piece of a sprite breaking up is drawn, in the sprite's own
 * frame, as drawn facing up: how far it has moved from its place, how large
 * and how opaque it is.
 */
export type PiecePlacement = {
  readonly dx: number // How far it has moved right, in tiles
  readonly dy: number // How far it has moved down, in tiles
  readonly scale: number // Its size, as a share of its own
  readonly alpha: number // Its opacity, from 0 (gone) to 1
}

/**
 * Places one piece of a sprite breaking up.
 * @param offsetX - How far right of the sprite's middle the piece's own middle lies, in tiles, as drawn facing up
 * @param offsetY - How far below it, in tiles
 * @param index - The piece's number, counted row by row from the top left
 * @returns Where it is drawn, or null to leave it out
 */
export type PiecePlacer = (offsetX: number, offsetY: number, index: number) => PiecePlacement | null

/**
 * Paints the chamber's sprites onto a canvas for the renderer. Tiles are
 * square, sized to fit the chamber in the screen area, and row 0 is at the
 * bottom. Each sprite is drawn shrunk to the tile size (sprite_scaling), its
 * overhang around its tile, turned in quarter turns from facing up, at whole
 * canvas pixels; a raised one over the shared drop shadow made from its
 * shape. A layer can be painted apart, on a canvas of its own, and laid down
 * later, with the shadow under its whole shape. Sets the canvas's width and
 * height attributes only; its styling belongs to the page.
 */
export class TilePainter {
  private readonly canvas: HTMLCanvasElement // The canvas drawn on
  private readonly context: CanvasRenderingContext2D // Its 2D context
  private screenWidth: number // Width available to the chamber, in pixels
  private screenHeight: number // Height available to the chamber, in pixels
  private tileSize = 0 // Side of a tile, in pixels
  private columns = 0 // Chamber width, in tiles
  private rows = 0 // Chamber height, in tiles
  private pass: PaintPass = 'both' // What drawing paints: during drawShadowsFirst() one pass, then the other

  /**
   * Takes over a canvas, collapsing it to 0 × 0 until setSize() is called.
   * @param canvas - The canvas to draw on
   * @param screenWidth - Width available to the chamber, in pixels
   * @param screenHeight - Height available to the chamber, in pixels
   * @throws Error when the canvas cannot provide a 2D context
   */
  constructor(canvas: HTMLCanvasElement, screenWidth: number, screenHeight: number) {
    this.canvas = canvas
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight

    this.canvas.width = 0
    this.canvas.height = 0

    const context = this.canvas.getContext('2d')

    if (context === null) {
      throw new Error('The canvas has no 2D context')
    }

    this.context = context
  }

  /**
   * Side of a tile, in pixels.
   */
  get blockSize(): number {
    return this.tileSize
  }

  /**
   * Changes the area available to the chamber. Takes effect on the next
   * setSize().
   * @param screenWidth - Width available to the chamber, in pixels
   * @param screenHeight - Height available to the chamber, in pixels
   */
  resize(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
  }

  /**
   * Sizes the tiles and the canvas for a chamber. Clears the canvas.
   * @param width - Chamber width, in tiles
   * @param height - Chamber height, in tiles
   */
  setSize(width: number, height: number): void {
    this.columns = width
    this.rows = height

    const blocksHorizontal = Math.trunc(this.screenWidth / width)
    const blocksVertical = Math.trunc(this.screenHeight / height)

    this.tileSize = Math.min(blocksHorizontal, blocksVertical)

    this.canvas.width = this.tileSize * width
    this.canvas.height = this.tileSize * height
  }

  /**
   * Makes a blank layer: a painter of its own, on a new canvas the size of
   * this one, with the same tiles, to paint apart and lay down with
   * drawLayer().
   * @returns The layer's painter
   * @throws Error when the new canvas cannot provide a 2D context
   */
  createLayer(): TilePainter {
    const layer = new TilePainter(document.createElement('canvas'), this.screenWidth, this.screenHeight)

    layer.setSize(this.columns, this.rows)

    return layer
  }

  /**
   * Lays a layer down over the whole canvas, as it was painted, or over the
   * shared drop shadow made from its whole shape, so touching tiles cast one
   * shadow.
   * @param layer - The layer, from createLayer()
   * @param shadowed - Whether to lay it over its shadow
   */
  drawLayer(layer: TilePainter, shadowed: boolean): void {
    // A canvas with no pixels can't be drawn
    if ((layer.canvas.width === 0) || (layer.canvas.height === 0)) {
      return
    }

    this.context.save()

    if (shadowed) {
      this.context.shadowColor = PALETTE.shadow
      this.context.shadowBlur = shadowBlur(this.tileSize)
    }

    this.context.drawImage(layer.canvas, 0, 0)
    this.context.restore()
  }

  /**
   * Runs a drawing twice: first painting only the shadows of the raised
   * sprites it draws, then only its sprites, so raised things that touch
   * don't shade each other, whatever order they are drawn in.
   * @param draw - The drawing
   */
  drawShadowsFirst(draw: () => void): void {
    try {
      this.pass = 'shadows'
      draw()
      this.pass = 'sprites'
      draw()
    } finally {
      this.pass = 'both'
    }
  }

  /**
   * Fills the whole canvas with the background, which shows wherever the
   * floor's sprite lets it through.
   */
  clear(): void {
    this.context.fillStyle = PALETTE.chamber
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * Runs a drawing clipped to one tile, so nothing it draws shows outside
   * that tile, or unclipped when no tile is given. The clip never outlasts
   * the drawing.
   * @param tile - The tile to clip to, or null to draw unclipped
   * @param draw - The drawing
   */
  drawClippedToTile(tile: PositionData | null, draw: () => void): void {
    if (tile === null) {
      draw()

      return
    }

    this.context.save()

    try {
      this.context.beginPath()
      this.context.rect(tile.x * this.tileSize, this.tileTop(tile.y), this.tileSize, this.tileSize)
      this.context.clip()
      draw()
    } finally {
      this.context.restore()
    }
  }

  /**
   * Draws a sprite over a tile, with its overhang around it, added to the
   * colours beneath, so it only brightens them: a glow, or a glint of light.
   * @param name - The sprite
   * @param x - Column
   * @param y - Row
   * @param way - The way it is turned to face, from facing up as drawn
   * @param strength - How much of it is added, from 0 (nothing) to 1 (all of it)
   */
  drawSpriteAdded(name: SpriteName, x: number, y: number, way: Direction, strength: number): void {
    this.context.save()

    try {
      this.context.globalCompositeOperation = 'lighter'
      this.context.globalAlpha = strength
      this.drawSprite(name, x, y, way)
    } finally {
      this.context.restore()
    }
  }

  /**
   * Draws a sprite over a tile, with its overhang around it, and a raised
   * one over its shadow.
   * @param name - The sprite
   * @param x - Column, part way between two while something glides
   * @param y - Row, part way between two while something glides
   * @param way - The way it is turned to face, from facing up as drawn; up by default
   */
  drawSprite(name: SpriteName, x: number, y: number, way: Direction = Direction.UP): void {
    this.drawSized(name, Math.round(x * this.tileSize), Math.round(this.tileTop(y)), this.tileSize, way)
  }

  /**
   * Draws one quarter of a tile from the same quarter of one of a strip's
   * tiles, pixel for pixel.
   * @param name - The strip's sprite
   * @param index - Which of its tiles, counted from 0 at the left
   * @param tileQuarter - The quarter
   * @param x - Column
   * @param y - Row
   */
  drawStripQuarter(name: SpriteName, index: number, tileQuarter: TileQuarter, x: number, y: number): void {
    const sprite = scaledSprite(name, this.tileSize)
    const size = this.tileSize
    const rect = quarterRect(size, tileQuarter)

    if ((sprite !== null) && (this.pass !== 'shadows')) {
      this.context.drawImage(sprite.image, (index * size) + rect.left, rect.top, rect.width, rect.height, (x * size) + rect.left, this.tileTop(y) + rect.top, rect.width, rect.height)
    }
  }

  /**
   * Draws a sprite at half a tile's size, in the middle of a tile or moved
   * part of a tile ahead the way it faces, and a raised one over its shadow.
   * @param name - The sprite
   * @param x - Column, part way between two while something glides
   * @param y - Row, part way between two while something glides
   * @param way - The way it is turned to face, from facing up as drawn
   * @param ahead - How far it is moved the way it faces, in tiles
   */
  drawHalfSprite(name: SpriteName, x: number, y: number, way: Direction, ahead: number): void {
    const size = Math.round(this.tileSize / 2)
    const delta = DELTAS[way]
    const centerX = (x + 0.5 + (delta.dx * ahead)) * this.tileSize
    const centerY = this.canvas.height - ((y + 0.5 + (delta.dy * ahead)) * this.tileSize)

    this.drawSized(name, Math.round(centerX - (size / 2)), Math.round(centerY - (size / 2)), size, way)
  }

  /**
   * Draws a sprite cut down its middle, as drawn facing up, each half slid
   * out towards its own side and cut off at the tile's edge, as if sliding
   * into what lies beside the tile: a door's two leaves opening. A raised
   * sprite's shadow slides with its halves, cut off at those same two edges
   * only. Any overhang is left out.
   * @param name - The sprite
   * @param x - Column
   * @param y - Row
   * @param way - The way it is turned to face, from facing up as drawn
   * @param apart - How far each half has slid, as a share of half a tile: 0 draws the whole sprite, 1 nothing of it
   */
  drawSpriteParted(name: SpriteName, x: number, y: number, way: Direction, apart: number): void {
    const size = this.tileSize
    const sprite = scaledSprite(name, size)

    if (sprite === null) {
      return
    }

    const half = size / 2
    const shift = Math.round(apart * half)
    const shadow = (RAISED_SPRITES.has(name) && (this.pass !== 'sprites')) ? scaledShadow(name, size) : null
    const turn = TURNS[way]

    this.context.save()

    try {
      this.context.translate(Math.round(x * size) + half, Math.round(this.tileTop(y)) + half)
      this.context.transform(turn.cos, turn.sin, -turn.sin, turn.cos, 0, 0)

      if (shadow !== null) {
        this.drawParts(shadow, half, shift, half + shadow.margin)
      }

      if (this.pass !== 'shadows') {
        this.drawParts(sprite, half, shift, half)
      }
    } finally {
      this.context.restore()
    }
  }

  /**
   * Draws a shrunk sprite's two halves, in its own frame, centred on the
   * tile's middle: the left half moved left and the right half moved right,
   * each cut off at the tile's edge on its own side.
   * @param sprite - The sprite, or its shadow, shrunk to the tile's size
   * @param half - Half the tile's side, in pixels
   * @param shift - How far each half is moved, in pixels
   * @param reach - How far from the middle a half shows across its way of sliding, in pixels
   */
  private drawParts(sprite: ScaledSprite, half: number, shift: number, reach: number): void {
    const width = half - shift

    if (width <= 0) {
      return
    }

    for (const side of [
      -1,
      1,
    ]) {
      this.context.save()
      this.context.beginPath()
      this.context.rect((side < 0) ? -half : shift, -reach, width, 2 * reach)
      this.context.clip()
      this.context.drawImage(sprite.image, -half - sprite.margin + (side * shift), -half - sprite.margin)
      this.context.restore()
    }
  }

  /**
   * Draws a sprite broken into square pieces, its overhang too, each placed
   * on its own: a sprite coming apart. Each piece left where it was redraws
   * the sprite exactly as drawSprite() or drawHalfSprite() draw it, without
   * its shadow, so nothing is drawn while only shadows are painted.
   * @param name - The sprite
   * @param x - Column of the sprite's middle, in tiles: a tile's middle is its column plus a half
   * @param y - Row of the sprite's middle, in tiles: a tile's middle is its row plus a half
   * @param size - The sprite's side, as a share of a tile: 1 for a whole tile, 0.5 for half
   * @param way - The way it is turned to face, from facing up as drawn
   * @param piecesAcross - Pieces across its tile; its overhang adds more
   * @param place - Where each piece is drawn
   */
  drawSpritePieces(name: SpriteName, x: number, y: number, size: number, way: Direction, piecesAcross: number, place: PiecePlacer): void {
    if (this.pass === 'shadows') {
      return
    }

    const side = Math.round(this.tileSize * size)
    const sprite = scaledSprite(name, side)

    if (sprite === null) {
      return
    }

    const image = sprite.image
    const columns = Math.max(1, Math.round(piecesAcross * image.width / side))
    const rows = Math.max(1, Math.round(piecesAcross * image.height / side))
    const turn = TURNS[way]
    // The sprite's square, placed as drawSprite() and drawHalfSprite() place it
    const left = Math.round((x * this.tileSize) - (side / 2))
    const top = Math.round(this.canvas.height - (y * this.tileSize) - (side / 2))

    this.context.save()

    try {
      this.context.translate(left + (side / 2), top + (side / 2))
      this.context.transform(turn.cos, turn.sin, -turn.sin, turn.cos, 0, 0)

      for (let row = 0; row < rows; row++) {
        // Whole pixels of the image, so the pieces left in place meet without a seam
        const sourceTop = Math.round(row * image.height / rows)
        const sourceHeight = Math.round((row + 1) * image.height / rows) - sourceTop

        for (let column = 0; column < columns; column++) {
          const sourceLeft = Math.round(column * image.width / columns)
          const sourceWidth = Math.round((column + 1) * image.width / columns) - sourceLeft
          const middleX = sourceLeft + (sourceWidth / 2) - (image.width / 2)
          const middleY = sourceTop + (sourceHeight / 2) - (image.height / 2)
          const placement = place(middleX / this.tileSize, middleY / this.tileSize, (row * columns) + column)

          if ((placement === null) || (placement.alpha <= 0) || (placement.scale <= 0)) {
            continue
          }

          const width = sourceWidth * placement.scale
          const height = sourceHeight * placement.scale

          this.context.globalAlpha = Math.min(placement.alpha, 1)
          this.context.drawImage(image, sourceLeft, sourceTop, sourceWidth, sourceHeight, middleX + (placement.dx * this.tileSize) - (width / 2), middleY + (placement.dy * this.tileSize) - (height / 2), width, height)
        }
      }
    } finally {
      this.context.restore()
    }
  }

  /**
   * The top edge of a row on the canvas.
   * @param y - Row, part way between two while something glides
   * @returns The edge, in pixels from the top
   */
  private tileTop(y: number): number {
    return this.canvas.height - ((y + 1) * this.tileSize)
  }

  /**
   * Draws a sprite shrunk to a square, with its overhang around it, turned
   * about the square's middle, and a raised one over its shadow.
   * @param name - The sprite
   * @param left - The square's left edge, in whole pixels
   * @param top - The square's top edge, in whole pixels
   * @param size - The square's side, in pixels
   * @param way - The way it is turned to face, from facing up as drawn
   */
  private drawSized(name: SpriteName, left: number, top: number, size: number, way: Direction): void {
    const sprite = scaledSprite(name, size)

    if (sprite === null) {
      return
    }

    const shadow = (RAISED_SPRITES.has(name) && (this.pass !== 'sprites')) ? scaledShadow(name, size) : null

    if (shadow !== null) {
      this.drawTurned(shadow, left, top, size, way)
    }

    if (this.pass !== 'shadows') {
      this.drawTurned(sprite, left, top, size, way)
    }
  }

  /**
   * Draws a shrunk sprite over a square, with its overhang around it,
   * turned about the square's middle.
   * @param sprite - The sprite, shrunk to the square's size
   * @param left - The square's left edge, in whole pixels
   * @param top - The square's top edge, in whole pixels
   * @param size - The square's side, in pixels
   * @param way - The way it is turned to face, from facing up as drawn
   */
  private drawTurned(sprite: ScaledSprite, left: number, top: number, size: number, way: Direction): void {
    const margin = sprite.margin

    if (way === Direction.UP) {
      this.context.drawImage(sprite.image, left - margin, top - margin)

      return
    }

    const turn = TURNS[way]
    const half = size / 2

    this.context.save()
    this.context.translate(left + half, top + half)
    this.context.transform(turn.cos, turn.sin, -turn.sin, turn.cos, 0, 0)
    this.context.drawImage(sprite.image, -half - margin, -half - margin)
    this.context.restore()
  }
}
