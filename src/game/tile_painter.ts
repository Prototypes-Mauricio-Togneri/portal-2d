import type {PositionData} from '@/game/chamber_data'
import {Direction} from '@/game/direction'
import {PALETTE} from '@/game/palette'

/**
 * Orientation of a line through a tile: H for horizontal, V for vertical.
 */
export type LineOrientation = 'H' | 'V'

/**
 * A point on the canvas, in pixels from the top left.
 */
type CanvasPosition = {
  x: number
  y: number
}

/**
 * Centre of a tile on the canvas and the half-size of a triangle drawn in it.
 */
type TriangleCenter = {
  x: number
  y: number
  size: number
}

/**
 * Paints tiles onto a canvas for the renderer, with the original game's
 * drawing primitives. Tiles are square, sized to fit the chamber in the
 * screen area, and row 0 is at the bottom. Sets the canvas's width and height
 * attributes only; its styling belongs to the page.
 * Sizes are in canvas pixels; at a pixel ratio above 1 the fixed edge widths
 * are multiplied by it, so every shape keeps its size on the page.
 */
export class TilePainter {
  private readonly canvas: HTMLCanvasElement // The canvas drawn on
  private readonly context: CanvasRenderingContext2D // Its 2D context
  private screenWidth: number // Width available to the chamber, in pixels
  private screenHeight: number // Height available to the chamber, in pixels
  private pixelRatio: number // Canvas pixels per page pixel; multiplies the fixed edge widths
  private tileSize = 0 // Side of a tile, in pixels

  /**
   * Takes over a canvas, collapsing it to 0 × 0 until setSize() is called.
   * @param canvas - The canvas to draw on
   * @param screenWidth - Width available to the chamber, in pixels
   * @param screenHeight - Height available to the chamber, in pixels
   * @param pixelRatio - Canvas pixels per page pixel, such as the screen's device pixel ratio; 1 by default
   * @throws Error when the canvas cannot provide a 2D context
   */
  constructor(canvas: HTMLCanvasElement, screenWidth: number, screenHeight: number, pixelRatio = 1) {
    this.canvas = canvas
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    this.pixelRatio = pixelRatio

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
   * Changes the area available to the chamber and the pixel ratio. Takes
   * effect on the next setSize().
   * @param screenWidth - Width available to the chamber, in pixels
   * @param screenHeight - Height available to the chamber, in pixels
   * @param pixelRatio - Canvas pixels per page pixel; 1 by default
   */
  resize(screenWidth: number, screenHeight: number, pixelRatio = 1): void {
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    this.pixelRatio = pixelRatio
  }

  /**
   * Sizes the tiles and the canvas for a chamber. Clears the canvas.
   * @param width - Chamber width, in tiles
   * @param height - Chamber height, in tiles
   */
  setSize(width: number, height: number): void {
    const blocksHorizontal = Math.trunc(this.screenWidth / width)
    const blocksVertical = Math.trunc(this.screenHeight / height)

    this.tileSize = Math.min(blocksHorizontal, blocksVertical)

    this.canvas.width = this.tileSize * width
    this.canvas.height = this.tileSize * height
  }

  /**
   * Fills the whole canvas with the background, at whatever opacity the
   * previous frame left set; the floor then covers all of it.
   */
  clear(): void {
    this.context.fillStyle = PALETTE.chamber
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * Runs a drawing clipped to one tile, so nothing it draws shows outside
   * that tile, or unclipped when no tile is given. The clip never outlasts
   * the drawing, and the opacity the drawing leaves set stays set, as it
   * would without the clip.
   * @param tile - The tile to clip to, or null to draw unclipped
   * @param draw - The drawing
   */
  drawClippedToTile(tile: PositionData | null, draw: () => void): void {
    if (tile === null) {
      draw()

      return
    }

    const corner = this.getFinalPosition(tile.x, tile.y)

    this.context.save()

    try {
      this.context.beginPath()
      this.context.rect(corner.x, corner.y - this.tileSize, this.tileSize, this.tileSize)
      this.context.clip()
      draw()
    } finally {
      // Restoring would also bring back the opacity from before the drawing,
      // and the next frame's clear fills at the opacity left set
      const opacity = this.context.globalAlpha

      this.context.restore()
      this.context.globalAlpha = opacity
    }
  }

  /**
   * The bottom left corner of a tile on the canvas.
   * @param x - Column
   * @param y - Row
   * @returns The corner, in pixels
   */
  getFinalPosition(x: number, y: number): CanvasPosition {
    return {
      x: x * this.tileSize,
      y: this.canvas.height - (y * this.tileSize),
    }
  }

  /**
   * A radial gradient between two colours, for filling a tile.
   * @param x - Centre x, in pixels
   * @param y - Centre y, in pixels
   * @param radius - Outer radius, in pixels
   * @param innerColor - Colour at the centre
   * @param outerColor - Colour at the radius
   * @returns The gradient
   */
  createRadialGradient(x: number, y: number, radius: number, innerColor: string, outerColor: string): CanvasGradient {
    const gradient = this.context.createRadialGradient(x, y, 0, x, y, radius)

    gradient.addColorStop(0, innerColor)
    gradient.addColorStop(1, outerColor)

    return gradient
  }

  /**
   * Fills a rectangle, with an optional border drawn as a larger rectangle
   * behind it.
   * @param x - Left edge, in pixels
   * @param y - Bottom edge, in pixels
   * @param width - Width, in pixels
   * @param height - Height, in pixels
   * @param fillColor - Body fill
   * @param borderColor - Border fill, or null when there is no border
   * @param borderWidth - Border width in page pixels (multiplied by the pixel ratio), 0 for none
   * @param opacity - Alpha for the whole rectangle; absent or 0 means opaque
   */
  renderBlock(x: number, y: number, width: number, height: number, fillColor: string | CanvasGradient, borderColor: string | null, borderWidth: number, opacity?: number): void {
    // Every fixed edge width passes through here; at ratio 1 it is unchanged
    const edgeWidth = borderWidth * this.pixelRatio

    if (opacity) {
      this.context.globalAlpha = opacity
    } else {
      this.context.globalAlpha = 1
    }

    if ((edgeWidth !== 0) && (borderColor !== null)) {
      this.context.fillStyle = borderColor
      this.context.fillRect(x, y - height, width, height)
    }

    this.context.fillStyle = fillColor
    this.context.fillRect(x + edgeWidth, y - height + edgeWidth, width - (edgeWidth * 2), height - (edgeWidth * 2))
  }

  /**
   * Draws a thin line through the middle of a tile.
   * @param orientation - H for horizontal, V for vertical
   * @param x - Column
   * @param y - Row
   * @param width - Tile width, in pixels
   * @param height - Tile height, in pixels
   * @param fillColor - Body fill
   * @param borderColor - Border fill
   * @param borderWidth - Border width in pixels, 0 for none
   * @param opacity - Alpha for the line
   * @param widthRatio - How many times thinner than the tile the line is
   */
  drawLine(orientation: LineOrientation, x: number, y: number, width: number, height: number, fillColor: string, borderColor: string, borderWidth: number, opacity: number, widthRatio: number): void {
    const finalPosition = this.getFinalPosition(x, y)

    if (orientation === 'H') {
      const finalHeight = width / widthRatio
      this.renderBlock(finalPosition.x, finalPosition.y - (height / 2) + (finalHeight / 2), width, finalHeight, fillColor, borderColor, borderWidth, opacity)
    } else if (orientation === 'V') {
      const finalWidth = width / widthRatio
      this.renderBlock(finalPosition.x + (width / 2) - (finalWidth / 2), finalPosition.y, finalWidth, height, fillColor, borderColor, borderWidth, opacity)
    }
  }

  /**
   * Fills a whole tile.
   * @param x - Column
   * @param y - Row
   * @param width - Width, in pixels
   * @param height - Height, in pixels
   * @param fillColor - Body fill
   * @param borderColor - Border fill, or null when there is no border
   * @param borderWidth - Border width in pixels, 0 for none
   * @param opacity - Alpha; absent means opaque
   */
  drawBlock(x: number, y: number, width: number, height: number, fillColor: string, borderColor: string | null, borderWidth: number, opacity?: number): void {
    const finalPosition = this.getFinalPosition(x, y)

    this.renderBlock(finalPosition.x, finalPosition.y, width, height, fillColor, borderColor, borderWidth, opacity)
  }

  /**
   * Fills the centre quarter of a tile.
   * @param x - Column
   * @param y - Row
   * @param width - Tile width, in pixels
   * @param height - Tile height, in pixels
   * @param fillColor - Body fill
   * @param borderColor - Border fill
   * @param borderWidth - Border width in pixels, 0 for none
   * @param opacity - Alpha; absent means opaque
   */
  drawMiniBlock(x: number, y: number, width: number, height: number, fillColor: string, borderColor: string, borderWidth: number, opacity?: number): void {
    const finalPosition = this.getFinalPosition(x, y)

    this.renderBlock(finalPosition.x + (width / 4), finalPosition.y - (height / 4), width / 2, height / 2, fillColor, borderColor, borderWidth, opacity)
  }

  /**
   * Fills the left half of a tile.
   * @param x - Column
   * @param y - Row
   * @param width - Tile width, in pixels
   * @param height - Tile height, in pixels
   * @param fillColor - Body fill
   * @param borderColor - Border fill
   * @param borderWidth - Border width in pixels, 0 for none
   */
  drawBlockLeft(x: number, y: number, width: number, height: number, fillColor: string, borderColor: string, borderWidth: number): void {
    const finalPosition = this.getFinalPosition(x, y)

    this.renderBlock(finalPosition.x, finalPosition.y, width / 2, height, fillColor, borderColor, borderWidth)
  }

  /**
   * Fills the right half of a tile.
   * @param x - Column
   * @param y - Row
   * @param width - Tile width, in pixels
   * @param height - Tile height, in pixels
   * @param fillColor - Body fill
   * @param borderColor - Border fill
   * @param borderWidth - Border width in pixels, 0 for none
   */
  drawBlockRight(x: number, y: number, width: number, height: number, fillColor: string, borderColor: string, borderWidth: number): void {
    const finalPosition = this.getFinalPosition(x, y)

    this.renderBlock(finalPosition.x + (width / 2), finalPosition.y, width / 2, height, fillColor, borderColor, borderWidth)
  }

  /**
   * Fills the top half of a tile.
   * @param x - Column
   * @param y - Row
   * @param width - Tile width, in pixels
   * @param height - Tile height, in pixels
   * @param fillColor - Body fill
   * @param borderColor - Border fill
   * @param borderWidth - Border width in pixels, 0 for none
   */
  drawBlockUp(x: number, y: number, width: number, height: number, fillColor: string, borderColor: string, borderWidth: number): void {
    const finalPosition = this.getFinalPosition(x, y)

    this.renderBlock(finalPosition.x, finalPosition.y - (height / 2), width, height / 2, fillColor, borderColor, borderWidth)
  }

  /**
   * Fills the bottom half of a tile.
   * @param x - Column
   * @param y - Row
   * @param width - Tile width, in pixels
   * @param height - Tile height, in pixels
   * @param fillColor - Body fill
   * @param borderColor - Border fill
   * @param borderWidth - Border width in pixels, 0 for none
   */
  drawBlockDown(x: number, y: number, width: number, height: number, fillColor: string, borderColor: string, borderWidth: number): void {
    const finalPosition = this.getFinalPosition(x, y)

    this.renderBlock(finalPosition.x, finalPosition.y, width, height / 2, fillColor, borderColor, borderWidth)
  }

  /**
   * Fills a triangle, at whatever opacity the last block left set.
   * @param x1 - First corner x, in pixels
   * @param y1 - First corner y, in pixels
   * @param x2 - Second corner x, in pixels
   * @param y2 - Second corner y, in pixels
   * @param x3 - Third corner x, in pixels
   * @param y3 - Third corner y, in pixels
   * @param color - Fill
   */
  drawTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, color: string): void {
    this.context.beginPath()
    this.context.fillStyle = color
    this.context.moveTo(x1, y1)
    this.context.lineTo(x2, y2)
    this.context.lineTo(x3, y3)
    this.context.fill()
  }

  /**
   * Draws a triangle pointing up in a tile.
   * @param x - Column
   * @param y - Row
   * @param color - Fill
   */
  drawTriangleUp(x: number, y: number, color: string): void {
    const center = this.getTriangleCenter(x, y)

    this.drawTriangle(center.x - center.size, center.y + center.size, center.x + center.size, center.y + center.size, center.x, center.y - center.size, color)
  }

  /**
   * Draws a triangle pointing down in a tile.
   * @param x - Column
   * @param y - Row
   * @param color - Fill
   */
  drawTriangleDown(x: number, y: number, color: string): void {
    const center = this.getTriangleCenter(x, y)

    this.drawTriangle(center.x - center.size, center.y - center.size, center.x + center.size, center.y - center.size, center.x, center.y + center.size, color)
  }

  /**
   * Draws a triangle pointing left in a tile.
   * @param x - Column
   * @param y - Row
   * @param color - Fill
   */
  drawTriangleLeft(x: number, y: number, color: string): void {
    const center = this.getTriangleCenter(x, y)

    this.drawTriangle(center.x + center.size, center.y + center.size, center.x - center.size, center.y, center.x + center.size, center.y - center.size, color)
  }

  /**
   * Draws a triangle pointing right in a tile.
   * @param x - Column
   * @param y - Row
   * @param color - Fill
   */
  drawTriangleRight(x: number, y: number, color: string): void {
    const center = this.getTriangleCenter(x, y)

    this.drawTriangle(center.x - center.size, center.y + center.size, center.x + center.size, center.y, center.x - center.size, center.y - center.size, color)
  }

  /**
   * Draws a triangle pointing a way in a tile.
   * @param direction - Which way it points
   * @param x - Column
   * @param y - Row
   * @param color - Fill
   */
  drawTriangleTowards(direction: Direction, x: number, y: number, color: string): void {
    switch (direction) {
      case Direction.UP:
        this.drawTriangleUp(x, y, color)
        break

      case Direction.DOWN:
        this.drawTriangleDown(x, y, color)
        break

      case Direction.LEFT:
        this.drawTriangleLeft(x, y, color)
        break

      case Direction.RIGHT:
        this.drawTriangleRight(x, y, color)
        break
    }
  }

  /**
   * The centre of a tile and the half-size of a triangle drawn in it.
   * @param x - Column
   * @param y - Row
   * @returns The centre in pixels, and a half-size of 40% of half a tile
   */
  getTriangleCenter(x: number, y: number): TriangleCenter {
    const centerX = (x * this.tileSize) + (this.tileSize / 2)
    const centerY = this.canvas.height - (y * this.tileSize) - (this.tileSize / 2)
    const half = (this.tileSize / 2) * 0.4

    return {
      x: centerX,
      y: centerY,
      size: half,
    }
  }
}
