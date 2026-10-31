import {Arrow} from '@/game/arrow'
import {Barrier} from '@/game/barrier'
import {Box} from '@/game/box'
import {Button} from '@/game/button'
import type {ChamberData, WallData} from '@/game/chamber_data'
import {Ditch} from '@/game/ditch'
import {Door} from '@/game/door'
import {Exit} from '@/game/exit'
import {Fizzler} from '@/game/fizzler'
import type {Gateway} from '@/game/gateway'
import {Laser} from '@/game/laser'
import {Switch} from '@/game/switch'
import {Wall} from '@/game/wall'

/**
 * Every element that can carry an id, and so be the target of a button or
 * switch link. Buttons, switches and arrows never keep an id.
 */
type LinkableElement = Barrier | Box | Ditch | Door | Exit | Fizzler | Laser

/**
 * Any element that sits on a tile.
 */
type TileElement = {
  readonly x: number
  readonly y: number
}

/**
 * The static layout of a chamber and every element in it, built from the
 * chamber JSON. Also routes button and switch links to their targets.
 */
export class Chamber {
  readonly width: number // In tiles
  readonly height: number // In tiles
  private gateway: Gateway | null = null // The portals, set by the state that plays this chamber

  private readonly links = new Map<number, LinkableElement>() // Link targets by id
  private readonly tileMap = new Map<number, Map<number, Wall>>() // Walls by column, then row

  readonly walls: readonly Wall[] // Every wall tile
  readonly barriers: readonly Barrier[] // Every barrier
  readonly ditches: readonly Ditch[] // Every ditch
  readonly boxes: readonly Box[] // Every box
  readonly buttons: readonly Button[] // Every button
  readonly arrows: readonly Arrow[] // Every arrow
  readonly fizzlers: readonly Fizzler[] // Every fizzler
  readonly doors: readonly Door[] // Every door
  readonly switches: readonly Switch[] // Every switch
  readonly lasers: readonly Laser[] // Every laser
  readonly exit: Exit // The way out

  /**
   * @param data - The chamber JSON, which is only read
   */
  constructor(data: ChamberData) {
    this.width = data.size.width
    this.height = data.size.height

    this.walls = this.getListElements(data.walls)

    // Built in this order so that, as before, a later element wins a
    // duplicated link id
    this.barriers = this.getGenericElements(data.barriers, (elementData) => new Barrier(elementData))
    this.ditches = this.getGenericElements(data.ditches, (elementData) => new Ditch(elementData))
    this.boxes = this.getGenericElements(data.boxes, (elementData) => new Box(elementData))
    this.buttons = data.buttons.map((elementData) => new Button(elementData, this))
    this.arrows = data.arrows.map((elementData) => new Arrow(elementData))
    this.fizzlers = this.getGenericElements(data.fizzlers, (elementData) => new Fizzler(elementData))
    this.doors = this.getGenericElements(data.doors, (elementData) => new Door(elementData))
    this.switches = data.switches.map((elementData) => new Switch(elementData, this))
    this.lasers = this.getGenericElements(data.lasers, (elementData) => new Laser(elementData))

    this.exit = new Exit(data.exit)
    this.addLinkElement(this.exit)

    this.addTiles(this.walls)
  }

  /**
   * Expands the wall entries into one wall per tile.
   * @param list - Wall entries: single tiles or inclusive rectangles
   * @returns The walls, in entry order
   */
  private getListElements(list: readonly WallData[]): Wall[] {
    const result: Wall[] = []

    for (const element of list) {
      // `in` matches the original hasOwnProperty check on plain JSON objects
      if (('x' in element) && ('y' in element)) {
        result.push(new Wall(element.x, element.y))
      } else {
        for (let x = element.xFrom; x <= element.xTo; x++) {
          for (let y = element.yFrom; y <= element.yTo; y++) {
            result.push(new Wall(x, y))
          }
        }
      }
    }

    return result
  }

  /**
   * Builds one element per entry and registers each as a link target.
   * @param list - The entries from the chamber JSON
   * @param create - Builds an element from its entry
   * @returns The elements, in entry order
   */
  private getGenericElements<Data, Element extends LinkableElement>(list: readonly Data[], create: (elementData: Data) => Element): Element[] {
    const result: Element[] = []

    for (const elementData of list) {
      const element = create(elementData)
      result.push(element)

      this.addLinkElement(element)
    }

    return result
  }

  /**
   * Registers an element as a link target if it has an id.
   * @param element - The element to register
   */
  private addLinkElement(element: LinkableElement): void {
    // Same falsy check as before: an id of 0 is never registered
    if ((element.id !== undefined) && (element.id !== 0)) {
      this.links.set(element.id, element)
    }
  }

  /**
   * Adds tiles to the tile map.
   * @param list - The tiles to add
   */
  private addTiles(list: readonly Wall[]): void {
    for (const tile of list) {
      this.addTile(tile)
    }
  }

  /**
   * Adds a tile to the tile map, replacing and reporting any tile already there.
   * @param tile - The tile to add
   */
  private addTile(tile: Wall): void {
    const x = tile.x
    const y = tile.y
    const column = this.tileMap.get(x)

    if ((column !== undefined) && (column.get(y) !== undefined)) {
      console.error(`Tile duplicated at: ${x}, ${y}`)
    }

    if (column !== undefined) {
      column.set(y, tile)
    } else {
      const newColumn = new Map<number, Wall>()
      newColumn.set(y, tile)
      this.tileMap.set(x, newColumn)
    }
  }

  /**
   * The wall on a tile.
   * @param x - Column
   * @param y - Row
   * @returns The wall, or null when the tile has none
   */
  getTile(x: number, y: number): Wall | null {
    return this.tileMap.get(x)?.get(y) ?? null
  }

  /**
   * The first element of a list on a tile.
   * @param x - Column
   * @param y - Row
   * @param list - The elements to search
   * @returns The element, or null when none is there
   */
  private getGenericElement<Element extends TileElement>(x: number, y: number, list: readonly Element[]): Element | null {
    let result: Element | null = null

    for (const element of list) {
      if ((element.x === x) && (element.y === y)) {
        result = element
        break
      }
    }

    return result
  }

  /**
   * The box on a tile.
   * @param x - Column
   * @param y - Row
   * @returns The first box there, or null
   */
  getBox(x: number, y: number): Box | null {
    return this.getGenericElement(x, y, this.boxes)
  }

  /**
   * The button on a tile.
   * @param x - Column
   * @param y - Row
   * @returns The first button there, or null
   */
  getButton(x: number, y: number): Button | null {
    return this.getGenericElement(x, y, this.buttons)
  }

  /**
   * The arrow on a tile.
   * @param x - Column
   * @param y - Row
   * @returns The first arrow there, or null
   */
  getArrow(x: number, y: number): Arrow | null {
    return this.getGenericElement(x, y, this.arrows)
  }

  /**
   * The fizzler on a tile.
   * @param x - Column
   * @param y - Row
   * @returns The first fizzler there, or null
   */
  getFizzler(x: number, y: number): Fizzler | null {
    return this.getGenericElement(x, y, this.fizzlers)
  }

  /**
   * The door on a tile.
   * @param x - Column
   * @param y - Row
   * @returns The first door there, or null
   */
  getDoor(x: number, y: number): Door | null {
    return this.getGenericElement(x, y, this.doors)
  }

  /**
   * The ditch on a tile.
   * @param x - Column
   * @param y - Row
   * @returns The first ditch there, or null
   */
  getDitch(x: number, y: number): Ditch | null {
    return this.getGenericElement(x, y, this.ditches)
  }

  /**
   * The barrier on a tile.
   * @param x - Column
   * @param y - Row
   * @returns The first barrier there, or null
   */
  getBarrier(x: number, y: number): Barrier | null {
    return this.getGenericElement(x, y, this.barriers)
  }

  /**
   * The switch on a tile.
   * @param x - Column
   * @param y - Row
   * @returns The first switch there, or null
   */
  getSwitch(x: number, y: number): Switch | null {
    return this.getGenericElement(x, y, this.switches)
  }

  /**
   * The laser on a tile.
   * @param x - Column
   * @param y - Row
   * @returns The first laser there, or null
   */
  getLaser(x: number, y: number): Laser | null {
    return this.getGenericElement(x, y, this.lasers)
  }

  /**
   * The exit, if it is on a tile.
   * @param x - Column
   * @param y - Row
   * @returns The exit, or null when it is elsewhere
   */
  getExit(x: number, y: number): Exit | null {
    return this.exit.isIn(x, y) ? this.exit : null
  }

  /**
   * Activates every linked element. Unknown ids are skipped.
   * @param links - Ids of the elements to activate
   */
  activate(links: readonly number[]): void {
    for (const id of links) {
      const element = this.links.get(id)

      if (element !== undefined) {
        element.activate()
      }
    }
  }

  /**
   * Deactivates every linked element. Unknown ids are skipped, and a portal on
   * a barrier that closes is removed.
   * @param links - Ids of the elements to deactivate
   * @throws TypeError when a link targets a box, which has no deactivate
   */
  deactivate(links: readonly number[]): void {
    for (const id of links) {
      const element = this.links.get(id)

      if (element !== undefined) {
        // The original threw here too, by calling the box's missing deactivate,
        // leaving the remaining links untouched
        if (element instanceof Box) {
          throw new TypeError(`Box ${id} cannot be deactivated`)
        }

        element.deactivate()

        if (element instanceof Barrier) {
          // A state always sets the gateway before its first update
          this.gateway?.clearPortalAt(element.x, element.y)
        }
      }
    }
  }

  /**
   * Gives the chamber the portals to clear when a barrier closes.
   * @param gateway - The portals of the state playing this chamber
   */
  setGateway(gateway: Gateway): void {
    this.gateway = gateway
  }
}
