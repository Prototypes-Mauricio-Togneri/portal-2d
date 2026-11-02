import type {Chamber} from '@/game/chamber'
import {Direction} from '@/game/direction'
import {Gateway} from '@/game/gateway'
import {Input} from '@/game/input'
import {Portal, type PortalStyle} from '@/game/portal'
import {Sound} from '@/game/sound'
import type {Subject} from '@/game/subject'
import {Wall} from '@/game/wall'

/**
 * The keyboard as the state reads it: it never clears or changes the input.
 */
type InputReader = Pick<Input, 'isPressed' | 'isPressing'>

/**
 * Where the subject is trying to go this frame.
 */
type NewPosition = {
  x: number
  y: number
  direction: Direction
}

/**
 * The game rules: one chamber being played, the subject in it and the portals.
 * Advanced one frame at a time by update().
 */
export class State {
  readonly chamber: Chamber // The chamber being played
  readonly subject: Subject // The player's subject
  readonly gateway = new Gateway() // The two portals

  insideFizzler = false // Whether the subject has entered an active fizzler and not yet left every fizzler
  chamberCompleted = false // Whether the subject has reached the exit
  private readonly onChamberCompleted: (() => void) | null // Called once when the subject reaches the exit
  private placedPortals = 0 // Portals opened on a wall so far, misses not counted

  /**
   * @param chamber - The chamber to play, freshly built
   * @param subject - The subject, freshly built
   * @param onChamberCompleted - Called once when the subject reaches the exit
   */
  constructor(chamber: Chamber, subject: Subject, onChamberCompleted: (() => void) | null = null) {
    this.chamber = chamber
    this.subject = subject
    this.onChamberCompleted = onChamberCompleted

    this.chamber.setGateway(this.gateway)
  }

  /**
   * Portals opened on a wall since the chamber was built; a shot that misses
   * doesn't count, and moving a portal counts again.
   */
  get portalsPlaced(): number {
    return this.placedPortals
  }

  /**
   * Advances the game by one frame.
   * @param _ - Seconds since the previous frame, unused by the rules
   * @param input - The keys pressed since the previous frame and those held down
   * @returns Whether anything visible changed, so the frame needs drawing
   */
  update(_: number, input: InputReader): boolean {
    this.checkExit()

    // Every check runs, in this order, even once an earlier one reports a change
    const positionUpdated = this.updateSubjectPosition(input)
    const buttonsUpdated = this.checkButtons()
    const portalCreated = this.checkShootPortal(input)
    const interacted = this.checkInteract(input)
    const boxUpdated = this.subject.updateBox()

    return positionUpdated || buttonsUpdated || portalCreated || interacted || boxUpdated
  }

  /**
   * Presses every button with a box or the subject on it and releases the rest.
   * @returns Whether any button changed state
   */
  private checkButtons(): boolean {
    let buttonsUpdated = false

    for (const button of this.chamber.buttons) {
      const box = this.chamber.getBox(button.x, button.y)

      if ((box !== null) || button.isIn(this.subject.x, this.subject.y)) {
        const activated = button.activate()
        buttonsUpdated = buttonsUpdated || activated
      } else {
        const deactivated = button.deactivate()
        buttonsUpdated = buttonsUpdated || deactivated
      }
    }

    return buttonsUpdated
  }

  /**
   * Handles the interact key: use a switch, drop the carried box or pick one up.
   * @param input - The keyboard
   * @returns Whether anything changed
   */
  private checkInteract(input: InputReader): boolean {
    let interacted = false

    if (input.isPressed(Input.SPACE)) {
      const switchElement = this.chamber.getSwitch(this.subject.x, this.subject.y)

      if (switchElement !== null) {
        if (this.subject.hasBox) {
          Sound.ERROR.play()
        } else {
          switchElement.activate()
          interacted = true
        }
      } else if (this.subject.hasBox) {
        this.subject.releaseBox()
        interacted = true
      } else {
        const box = this.chamber.getBox(this.subject.x, this.subject.y)

        if (box !== null) {
          this.subject.setBox(box)
          Sound.BOX.play()
          interacted = true
        }
      }
    }

    return interacted
  }

  /**
   * Handles the portal keys, unless the subject stands in an active fizzler.
   * @param input - The keyboard
   * @returns Whether a portal was opened
   */
  private checkShootPortal(input: InputReader): boolean {
    let portalCreated = false
    const fizzler = this.chamber.getFizzler(this.subject.x, this.subject.y)

    if ((fizzler === null) || (!fizzler.activated)) {
      if (input.isPressed(Input.KEY_A)) {
        portalCreated = this.shootPortal(Portal.BLUE)
      } else if (input.isPressed(Input.KEY_D)) {
        portalCreated = this.shootPortal(Portal.ORANGE)
      }
    }

    if (portalCreated) {
      this.placedPortals++
    }

    return portalCreated
  }

  /**
   * Shoots a portal the way the subject faces.
   * @param portalType - Portal.BLUE or Portal.ORANGE
   * @returns Whether the shot hit a wall that takes a portal
   */
  private shootPortal(portalType: PortalStyle): boolean {
    let portalCreated = false

    const pointingDirection = this.subject.pointingDirection
    const wall = this.getCollisionWall(this.subject.x, this.subject.y, pointingDirection.x, pointingDirection.y, this.subject.direction)

    if (wall !== null) {
      switch (portalType) {
        case Portal.BLUE:
          this.gateway.blue.set(wall.x, wall.y, pointingDirection.x * -1, pointingDirection.y * -1)
          Sound.PORTAL_BLUE.play()
          portalCreated = true
          break

        case Portal.ORANGE:
          this.gateway.orange.set(wall.x, wall.y, pointingDirection.x * -1, pointingDirection.y * -1)
          Sound.PORTAL_ORANGE.play()
          portalCreated = true
          break
      }
    } else {
      Sound.ERROR.play()
    }

    return portalCreated
  }

  /**
   * Follows a shot from a tile until it hits something.
   * @param x - Column the shot starts from
   * @param y - Row the shot starts from
   * @param directionX - Column step
   * @param directionY - Row step
   * @param direction - Which way the subject faces
   * @returns The wall hit, or null when the shot is stopped, leaves the
   * chamber, or hits a wall whose facing side already holds a portal
   */
  private getCollisionWall(x: number, y: number, directionX: number, directionY: number, direction: Direction): Wall | null {
    let result: Wall | null = null
    let currentX = x
    let currentY = y

    // The bounds are checked before stepping, so the last tile tried can be
    // one past the edge of the chamber
    while ((result === null) && (currentX >= 0) && (currentY >= 0) && (currentX < this.chamber.width) && (currentY < this.chamber.height)) {
      currentX += directionX
      currentY += directionY

      const tile = this.chamber.getTile(currentX, currentY)
      const fizzler = this.chamber.getFizzler(currentX, currentY)
      const door = this.chamber.getDoor(currentX, currentY)
      const barrier = this.chamber.getBarrier(currentX, currentY)
      const exit = this.chamber.getExit(currentX, currentY)

      if ((fizzler !== null) && fizzler.activated) {
        break
      }

      if ((barrier !== null) && barrier.activated) {
        break
      }

      if ((door !== null) && door.activated) {
        break
      }

      if ((exit !== null) && exit.activated) {
        break
      }

      if (tile instanceof Wall) {
        // The original looked the barrier up again here; it is the same one
        if ((barrier === null) || (!barrier.activated)) {
          if ((!this.gateway.blue.isIn(tile.x, tile.y)) || (direction === this.gateway.blue.direction)) {
            if ((!this.gateway.orange.isIn(tile.x, tile.y)) || (direction === this.gateway.orange.direction)) {
              result = tile
            }
          }
        }

        break
      }
    }

    return result
  }

  /**
   * Works out where the arrow keys take the subject. Holding Ctrl turns
   * without moving, unless the subject already faces that way. On an arrow
   * tile only the arrow's direction is accepted.
   * @param subject - The subject
   * @param input - The keyboard
   * @returns The target tile and facing
   */
  private getNewPosition(subject: Subject, input: InputReader): NewPosition {
    let newX = subject.x
    let newY = subject.y
    let newDirection = subject.direction
    const arrow = this.chamber.getArrow(subject.x, subject.y)

    if (input.isPressed(Input.UP)) {
      if ((arrow === null) || (arrow.direction === Direction.UP)) {
        if ((subject.direction === Direction.UP) || (!input.isPressing(Input.CTRL))) {
          newY++
        }

        newDirection = Direction.UP
      }
    } else if (input.isPressed(Input.DOWN)) {
      if ((arrow === null) || (arrow.direction === Direction.DOWN)) {
        if ((subject.direction === Direction.DOWN) || (!input.isPressing(Input.CTRL))) {
          newY--
        }

        newDirection = Direction.DOWN
      }
    } else if (input.isPressed(Input.LEFT)) {
      if ((arrow === null) || (arrow.direction === Direction.LEFT)) {
        if ((subject.direction === Direction.LEFT) || (!input.isPressing(Input.CTRL))) {
          newX--
        }

        newDirection = Direction.LEFT
      }
    } else if (input.isPressed(Input.RIGHT)) {
      if ((arrow === null) || (arrow.direction === Direction.RIGHT)) {
        if ((subject.direction === Direction.RIGHT) || (!input.isPressing(Input.CTRL))) {
          newX++
        }

        newDirection = Direction.RIGHT
      }
    }

    return {
      x: newX,
      y: newY,
      direction: newDirection,
    }
  }

  /**
   * Turns and moves the subject, or sends it through a portal when it walks
   * into one from the tile in front of it.
   * @param input - The keyboard
   * @returns Whether the subject's tile or facing changed, or it tried to move
   */
  private updateSubjectPosition(input: InputReader): boolean {
    const newPosition = this.getNewPosition(this.subject, input)
    const newX = newPosition.x
    const newY = newPosition.y
    const newDirection = newPosition.direction

    // Computed before checking the target tile, so walking into anything
    // solid still counts as a change
    let positionUpdated = (this.subject.x !== newX) || (this.subject.y !== newY) || (this.subject.direction !== newDirection)

    this.subject.direction = newDirection

    const targetTile = this.chamber.getTile(newX, newY)

    if (targetTile === null) {
      const barrier = this.chamber.getBarrier(newX, newY)
      const arrow = this.chamber.getArrow(newX, newY)
      const door = this.chamber.getDoor(newX, newY)
      const ditch = this.chamber.getDitch(newX, newY)
      const laser = this.chamber.getLaser(newX, newY)
      const exit = this.chamber.getExit(newX, newY)

      if (
        ((barrier === null) || (!barrier.activated)) &&
        ((door === null) || (!door.activated)) &&
        ((exit === null) || (!exit.activated)) &&
        ((ditch === null) || (!ditch.activated)) &&
        ((laser === null) || (!laser.activated))
      ) {
        if (arrow !== null) {
          if (this.subject.direction === arrow.direction) {
            this.moveSubject(newX, newY)
          }
        } else {
          this.moveSubject(newX, newY)
        }
      }
    } else if (targetTile instanceof Wall) {
      if (this.gateway.blue.activated && this.gateway.orange.activated) {
        if (this.gateway.blue.isIn(targetTile.x, targetTile.y) && this.gateway.blue.isInExit(this.subject.x, this.subject.y)) {
          this.exitPortal(this.gateway.orange)
          positionUpdated = true
        } else if (this.gateway.orange.isIn(targetTile.x, targetTile.y) && this.gateway.orange.isInExit(this.subject.x, this.subject.y)) {
          this.exitPortal(this.gateway.blue)
          positionUpdated = true
        }
      }
    }

    return positionUpdated
  }

  /**
   * Puts the subject on a tile. Entering an active fizzler removes both
   * portals and destroys a carried box.
   * @param x - Column
   * @param y - Row
   */
  private moveSubject(x: number, y: number): void {
    this.subject.x = x
    this.subject.y = y

    const fizzler = this.chamber.getFizzler(x, y)

    if ((fizzler !== null) && fizzler.activated && (!this.insideFizzler)) {
      this.gateway.clear()

      this.insideFizzler = true
      Sound.FIZZLER.play()

      if (this.subject.hasBox) {
        this.subject.destroyBox()
      }
    }

    if ((fizzler === null) && this.insideFizzler) {
      this.insideFizzler = false
    }
  }

  /**
   * Puts the subject in front of a portal, facing away from it.
   * @param portal - The portal the subject comes out of
   */
  private exitPortal(portal: Portal): void {
    const exitPosition = portal.exitPosition

    this.subject.x = exitPosition.x
    this.subject.y = exitPosition.y

    // An open portal always has a direction, so this never skips
    if (exitPosition.direction !== null) {
      this.subject.direction = exitPosition.direction
    }

    Sound.CROSS.play()
  }

  /**
   * Reports the chamber as completed the first time the subject is on the exit.
   */
  private checkExit(): void {
    if ((!this.chamberCompleted) && (this.chamber.getExit(this.subject.x, this.subject.y) !== null)) {
      this.chamberCompleted = true
      this.onChamberCompleted?.()
    }
  }
}
