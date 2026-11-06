import {Arrow} from '@/game/classic/arrow'
import {Barrier} from '@/game/classic/barrier'
import {Box} from '@/game/classic/box'
import {Button} from '@/game/classic/button'
import type {Chamber} from '@/game/classic/chamber'
import {Direction} from '@/game/direction'
import {Ditch} from '@/game/classic/ditch'
import {Door} from '@/game/classic/door'
import {Exit} from '@/game/classic/exit'
import {Fizzler} from '@/game/classic/fizzler'
import {Floor} from '@/game/classic/floor'
import {Laser} from '@/game/classic/laser'
import type {LaserDirection} from '@/game/classic/laser_direction'
import {Portal} from '@/game/classic/portal'
import type {State} from '@/game/classic/state'
import {Subject} from '@/game/classic/subject'
import {Switch} from '@/game/classic/switch'
import {Wall} from '@/game/classic/wall'

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
 * Draws a state onto a canvas. Tiles are square, sized to fit the chamber in
 * the screen area, and row 0 is at the bottom. Sets the canvas's width and
 * height attributes only; its styling belongs to the page. Sizes are in canvas
 * pixels; a canvas drawn at a pixel ratio above 1 (to stay sharp on a dense
 * screen) gets its fixed edge widths multiplied by it, so every shape keeps its
 * size on the page.
 */
export class Renderer {
  private readonly canvas: HTMLCanvasElement // The canvas drawn on
  private readonly context: CanvasRenderingContext2D // Its 2D context
  private screenWidth: number // Width available to the chamber, in pixels
  private screenHeight: number // Height available to the chamber, in pixels
  private pixelRatio: number // Canvas pixels per page pixel; multiplies the fixed edge widths
  private blockSize = 0 // Side of a tile, in pixels

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

    this.blockSize = Math.min(blocksHorizontal, blocksVertical)

    this.canvas.width = this.blockSize * width
    this.canvas.height = this.blockSize * height
  }

  /**
   * The bottom left corner of a tile on the canvas.
   * @param x - Column
   * @param y - Row
   * @returns The corner, in pixels
   */
  private getFinalPosition(x: number, y: number): CanvasPosition {
    return {
      x: x * this.blockSize,
      y: this.canvas.height - (y * this.blockSize),
    }
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
  private renderBlock(x: number, y: number, width: number, height: number, fillColor: string | CanvasGradient, borderColor: string | null, borderWidth: number, opacity?: number): void {
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
   * @param direction - H for horizontal, V for vertical
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
  private drawLine(direction: LaserDirection, x: number, y: number, width: number, height: number, fillColor: string, borderColor: string, borderWidth: number, opacity: number, widthRatio: number): void {
    const finalPosition = this.getFinalPosition(x, y)

    if (direction === 'H') {
      const finalHeight = width / widthRatio
      this.renderBlock(finalPosition.x, finalPosition.y - (height / 2) + (finalHeight / 2), width, finalHeight, fillColor, borderColor, borderWidth, opacity)
    } else if (direction === 'V') {
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
  private drawBlock(x: number, y: number, width: number, height: number, fillColor: string, borderColor: string | null, borderWidth: number, opacity?: number): void {
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
  private drawMiniBlock(x: number, y: number, width: number, height: number, fillColor: string, borderColor: string, borderWidth: number, opacity?: number): void {
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
  private drawBlockLeft(x: number, y: number, width: number, height: number, fillColor: string, borderColor: string, borderWidth: number): void {
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
  private drawBlockRight(x: number, y: number, width: number, height: number, fillColor: string, borderColor: string, borderWidth: number): void {
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
  private drawBlockUp(x: number, y: number, width: number, height: number, fillColor: string, borderColor: string, borderWidth: number): void {
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
  private drawBlockDown(x: number, y: number, width: number, height: number, fillColor: string, borderColor: string, borderWidth: number): void {
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
  private drawTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, color: string): void {
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
  private drawTriangleUp(x: number, y: number, color: string): void {
    const center = this.getTriangleCenter(x, y)

    this.drawTriangle(center.x - center.size, center.y + center.size, center.x + center.size, center.y + center.size, center.x, center.y - center.size, color)
  }

  /**
   * Draws a triangle pointing down in a tile.
   * @param x - Column
   * @param y - Row
   * @param color - Fill
   */
  private drawTriangleDown(x: number, y: number, color: string): void {
    const center = this.getTriangleCenter(x, y)

    this.drawTriangle(center.x - center.size, center.y - center.size, center.x + center.size, center.y - center.size, center.x, center.y + center.size, color)
  }

  /**
   * Draws a triangle pointing left in a tile.
   * @param x - Column
   * @param y - Row
   * @param color - Fill
   */
  private drawTriangleLeft(x: number, y: number, color: string): void {
    const center = this.getTriangleCenter(x, y)

    this.drawTriangle(center.x + center.size, center.y + center.size, center.x - center.size, center.y, center.x + center.size, center.y - center.size, color)
  }

  /**
   * Draws a triangle pointing right in a tile.
   * @param x - Column
   * @param y - Row
   * @param color - Fill
   */
  private drawTriangleRight(x: number, y: number, color: string): void {
    const center = this.getTriangleCenter(x, y)

    this.drawTriangle(center.x - center.size, center.y + center.size, center.x + center.size, center.y, center.x - center.size, center.y - center.size, color)
  }

  /**
   * The centre of a tile and the half-size of a triangle drawn in it.
   * @param x - Column
   * @param y - Row
   * @returns The centre in pixels, and a half-size of 40% of half a tile
   */
  private getTriangleCenter(x: number, y: number): TriangleCenter {
    const centerX = (x * this.blockSize) + (this.blockSize / 2)
    const centerY = this.canvas.height - (y * this.blockSize) - (this.blockSize / 2)
    const half = (this.blockSize / 2) * 0.4

    return {
      x: centerX,
      y: centerY,
      size: half,
    }
  }

  /**
   * Draws a portal as the half of its wall tile on the side it opens to.
   * @param portal - The portal
   * @param fillColor - Body fill
   * @param borderColor - Border fill
   * @param borderWidth - Border width in pixels
   */
  private drawPortal(portal: Portal, fillColor: string, borderColor: string, borderWidth: number): void {
    switch (portal.direction) {
      case Direction.UP:
        this.drawBlockUp(portal.x, portal.y, this.blockSize, this.blockSize, fillColor, borderColor, borderWidth)
        break

      case Direction.DOWN:
        this.drawBlockDown(portal.x, portal.y, this.blockSize, this.blockSize, fillColor, borderColor, borderWidth)
        break

      case Direction.LEFT:
        this.drawBlockLeft(portal.x, portal.y, this.blockSize, this.blockSize, fillColor, borderColor, borderWidth)
        break

      case Direction.RIGHT:
        this.drawBlockRight(portal.x, portal.y, this.blockSize, this.blockSize, fillColor, borderColor, borderWidth)
        break
    }
  }

  /**
   * Draws the exit.
   * @param exit - The exit
   */
  private drawExit(exit: Exit): void {
    this.drawBlock(exit.x, exit.y, this.blockSize, this.blockSize, Exit.fillColor, Exit.borderColor, Exit.borderWidth)
  }

  /**
   * Draws a door.
   * @param door - The door
   */
  private drawDoor(door: Door): void {
    this.drawBlock(door.x, door.y, this.blockSize, this.blockSize, Door.fillColor, Door.borderColor, Door.borderWidth)
  }

  /**
   * Draws a fizzler, half transparent.
   * @param fizzler - The fizzler
   */
  private drawFizzler(fizzler: Fizzler): void {
    this.drawBlock(fizzler.x, fizzler.y, this.blockSize, this.blockSize, Fizzler.fillColor, Fizzler.borderColor, Fizzler.borderWidth, 0.5)
  }

  /**
   * Draws a barrier as a radial gradient, lighter at the centre.
   * @param barrier - The barrier
   */
  private drawBarrier(barrier: Barrier): void {
    const finalPosition = this.getFinalPosition(barrier.x, barrier.y)

    const x = finalPosition.x + (this.blockSize / 2)
    const y = finalPosition.y - this.blockSize + (this.blockSize / 2)

    const gradient = this.context.createRadialGradient(x, y, 0, x, y, this.blockSize)
    gradient.addColorStop(0, Barrier.dark)
    gradient.addColorStop(1, Barrier.light)

    this.renderBlock(finalPosition.x, finalPosition.y, this.blockSize, this.blockSize, gradient, null, 0)
  }

  /**
   * Draws a ditch.
   * @param ditch - The ditch
   */
  private drawDitch(ditch: Ditch): void {
    this.drawBlock(ditch.x, ditch.y, this.blockSize, this.blockSize, Ditch.dark, null, 0)
  }

  /**
   * Draws a laser beam.
   * @param laser - The laser
   */
  private drawLaser(laser: Laser): void {
    this.drawLine(laser.direction, laser.x, laser.y, this.blockSize, this.blockSize, Laser.fillColor, Laser.borderColor, Laser.borderWidth, 1, Laser.widthRatio)
  }

  /**
   * Draws a wall.
   * @param wall - The wall
   */
  private drawWall(wall: Wall): void {
    this.drawBlock(wall.x, wall.y, this.blockSize, this.blockSize, Wall.fillColor, Wall.borderColor, Wall.borderWidth)
  }

  /**
   * Draws the floor of a tile.
   * @param x - Column
   * @param y - Row
   */
  private drawFloor(x: number, y: number): void {
    this.drawBlock(x, y, this.blockSize, this.blockSize, Floor.fillColor, Floor.borderColor, Floor.borderWidth)
  }

  /**
   * Draws the arrows as triangles on the floor.
   * @param arrows - The arrows
   */
  private drawArrows(arrows: readonly Arrow[]): void {
    for (const arrow of arrows) {
      switch (arrow.direction) {
        case Direction.UP:
          this.drawTriangleUp(arrow.x, arrow.y, Arrow.fillColor)
          break

        case Direction.DOWN:
          this.drawTriangleDown(arrow.x, arrow.y, Arrow.fillColor)
          break

        case Direction.LEFT:
          this.drawTriangleLeft(arrow.x, arrow.y, Arrow.fillColor)
          break

        case Direction.RIGHT:
          this.drawTriangleRight(arrow.x, arrow.y, Arrow.fillColor)
          break
      }
    }
  }

  /**
   * Draws the boxes, shrunk to a quarter when on a button so the button shows.
   * @param boxes - The boxes
   * @param chamber - The chamber, to find the buttons
   */
  private drawBoxes(boxes: readonly Box[], chamber: Chamber): void {
    for (const box of boxes) {
      const button = chamber.getButton(box.x, box.y)

      if (button !== null) {
        this.drawMiniBlock(box.x, box.y, this.blockSize, this.blockSize, Box.fillColor, Box.borderColor, Box.borderWidth)
      } else {
        this.drawBlock(box.x, box.y, this.blockSize, this.blockSize, Box.fillColor, Box.borderColor, Box.borderWidth)
      }
    }
  }

  /**
   * Draws the buttons.
   * @param buttons - The buttons
   */
  private drawButtons(buttons: readonly Button[]): void {
    for (const button of buttons) {
      this.drawBlock(button.x, button.y, this.blockSize, this.blockSize, Button.fillColor, Button.borderColor, Button.borderWidth)
    }
  }

  /**
   * Draws the switches.
   * @param switches - The switches
   */
  private drawSwitches(switches: readonly Switch[]): void {
    for (const switchElement of switches) {
      this.drawBlock(switchElement.x, switchElement.y, this.blockSize, this.blockSize, Switch.fillColor, Switch.borderColor, Switch.borderWidth)
    }
  }

  /**
   * Draws the subject with a triangle showing where it faces, in the box
   * colour while it carries one.
   * @param subject - The subject
   */
  private drawSubject(subject: Subject): void {
    this.drawBlock(subject.x, subject.y, this.blockSize, this.blockSize, Subject.fillColor, Subject.borderColor, Subject.borderWidth)

    let triangleColor = Subject.arrowColor

    if (subject.hasBox) {
      triangleColor = Box.fillColor
    }

    switch (subject.direction) {
      case Direction.UP:
        this.drawTriangleUp(subject.x, subject.y, triangleColor)
        break

      case Direction.DOWN:
        this.drawTriangleDown(subject.x, subject.y, triangleColor)
        break

      case Direction.LEFT:
        this.drawTriangleLeft(subject.x, subject.y, triangleColor)
        break

      case Direction.RIGHT:
        this.drawTriangleRight(subject.x, subject.y, triangleColor)
        break
    }
  }

  /**
   * Draws a whole frame, back to front.
   * @param state - The state to draw
   */
  render(state: State): void {
    // Drawn at whatever opacity the previous frame left set; the floor then
    // covers all of it
    this.context.fillStyle = '#202020'
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

    const chamber = state.chamber
    const subject = state.subject
    const gateway = state.gateway

    for (let x = 0; x < chamber.width; x++) {
      for (let y = 0; y < chamber.height; y++) {
        this.drawFloor(x, y)
      }
    }

    this.drawArrows(chamber.arrows)

    for (const wall of chamber.walls) {
      this.drawWall(wall)
    }

    for (const barrier of chamber.barriers) {
      if (barrier.activated) {
        this.drawBarrier(barrier)
      }
    }

    for (const ditch of chamber.ditches) {
      if (ditch.activated) {
        this.drawDitch(ditch)
      }
    }

    for (const laser of chamber.lasers) {
      if (laser.activated) {
        this.drawLaser(laser)
      }
    }

    for (const door of chamber.doors) {
      if (door.activated) {
        this.drawDoor(door)
      }
    }

    if (chamber.exit.activated) {
      this.drawExit(chamber.exit)
    }

    if (gateway.blue.activated) {
      this.drawPortal(gateway.blue, Portal.BLUE.fillColor, Portal.BLUE.borderColor, Portal.BLUE.borderWidth)
    }

    if (gateway.orange.activated) {
      this.drawPortal(gateway.orange, Portal.ORANGE.fillColor, Portal.ORANGE.borderColor, Portal.ORANGE.borderWidth)
    }

    this.drawButtons(chamber.buttons)
    this.drawSwitches(chamber.switches)
    this.drawBoxes(chamber.boxes, chamber)
    this.drawSubject(subject)

    for (const fizzler of chamber.fizzlers) {
      if (fizzler.activated) {
        this.drawFizzler(fizzler)
      }
    }
  }
}
