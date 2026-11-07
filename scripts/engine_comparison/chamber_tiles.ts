import type {ChamberData, PositionData} from '@/game/chamber_data'
import {type Direction, parseDirection} from '@/game/direction'
import type {ComparedView} from '@scripts/engine_comparison/compared_run'

/**
 * A tile as a map key.
 * @param x - Column
 * @param y - Row
 * @returns The key
 */
function tileKey(x: number, y: number): string {
  return `${x},${y}`
}

/**
 * Indexes the first element of a list on each tile, as today's rules only
 * ever find the first one.
 * @param list - The elements of one type, in chamber order
 * @returns The index of the first element on each tile, by tile key
 */
function indexFirstOnTiles(list: readonly PositionData[]): Map<string, number> {
  const result = new Map<string, number>()

  list.forEach((element, index) => {
    const key = tileKey(element.x, element.y)

    if (!result.has(key)) {
      result.set(key, index)
    }
  })

  return result
}

/**
 * Whether an element's flag is set in a view.
 * @param flags - The view's flags for that element type
 * @param index - The element's index, or undefined when the tile has none
 * @returns True when there is an element and its flag is set
 */
function isFlagSet(flags: readonly boolean[], index: number | undefined): boolean {
  return (index !== undefined) && (flags[index] === true)
}

/**
 * What a chamber file puts on each tile, read the way today's rules read it:
 * only the first element of a type on a tile counts, and a duplicated link id
 * belongs to the element registered last. The checks that recognise intended
 * differences read it together with a view of the state.
 */
export class ChamberTiles {
  private readonly width: number // In tiles
  private readonly height: number // In tiles
  private readonly barriers: ReadonlyMap<string, number> // Index of the first barrier on each tile
  private readonly ditches: ReadonlyMap<string, number> // Index of the first ditch on each tile
  private readonly doors: ReadonlyMap<string, number> // Index of the first door on each tile
  private readonly lasers: ReadonlyMap<string, number> // Index of the first laser on each tile
  private readonly laterLasers = new Map<string, number[]>() // Indexes of every laser after the first on each tile
  private readonly fizzlers: ReadonlyMap<string, number> // Index of the first fizzler on each tile
  private readonly buttons: ReadonlyMap<string, number> // Index of the first button on each tile
  private readonly arrows = new Map<string, Direction>() // Direction of the first arrow on each tile
  private readonly exit: string // The exit's tile
  private readonly buttonLinks: readonly (readonly number[])[] // Each button's link ids, in chamber order
  private readonly boxesById = new Map<number, number>() // Box index by link id, for ids that end up naming a box

  /**
   * @param chamber - The chamber JSON, which is only read
   */
  constructor(chamber: ChamberData) {
    this.width = chamber.size.width
    this.height = chamber.size.height

    this.barriers = indexFirstOnTiles(chamber.barriers)
    this.ditches = indexFirstOnTiles(chamber.ditches)
    this.doors = indexFirstOnTiles(chamber.doors)
    this.lasers = indexFirstOnTiles(chamber.lasers)

    chamber.lasers.forEach((laser, index) => {
      const key = tileKey(laser.x, laser.y)

      if (this.lasers.get(key) !== index) {
        this.laterLasers.set(key, [
          ...(this.laterLasers.get(key) ?? []),
          index,
        ])
      }
    })
    this.fizzlers = indexFirstOnTiles(chamber.fizzlers)
    this.buttons = indexFirstOnTiles(chamber.buttons)

    for (const arrow of chamber.arrows) {
      const key = tileKey(arrow.x, arrow.y)

      if (!this.arrows.has(key)) {
        this.arrows.set(key, parseDirection(arrow.direction))
      }
    }

    this.exit = tileKey(chamber.exit.x, chamber.exit.y)
    this.buttonLinks = chamber.buttons.map((button) => button.links)

    // Registered in today's order, so a later element takes over a duplicated id
    const owners = new Map<number, number | null>()
    const register = (id: number | undefined, boxIndex: number | null): void => {
      if ((id !== undefined) && (id !== 0)) {
        owners.set(id, boxIndex)
      }
    }

    chamber.barriers.forEach((element) => register(element.id, null))
    chamber.ditches.forEach((element) => register(element.id, null))
    chamber.boxes.forEach((element, index) => register(element.id, index))
    chamber.fizzlers.forEach((element) => register(element.id, null))
    chamber.doors.forEach((element) => register(element.id, null))
    chamber.lasers.forEach((element) => register(element.id, null))
    register(chamber.exit.id, null)

    owners.forEach((boxIndex, id) => {
      if (boxIndex !== null) {
        this.boxesById.set(id, boxIndex)
      }
    })
  }

  /**
   * Whether a tile is inside the chamber's edge.
   * @param x - Column
   * @param y - Row
   * @returns True inside the chamber
   */
  isInside(x: number, y: number): boolean {
    return (x >= 0) && (y >= 0) && (x < this.width) && (y < this.height)
  }

  /**
   * Whether a tile holds the exit.
   * @param x - Column
   * @param y - Row
   * @returns True on the exit's tile
   */
  isExit(x: number, y: number): boolean {
    return tileKey(x, y) === this.exit
  }

  /**
   * Whether a tile holds a button.
   * @param x - Column
   * @param y - Row
   * @returns True when a button is there
   */
  hasButton(x: number, y: number): boolean {
    return this.buttons.has(tileKey(x, y))
  }

  /**
   * The arrow on a tile.
   * @param x - Column
   * @param y - Row
   * @returns The arrow's direction, or null when the tile has none
   */
  getArrow(x: number, y: number): Direction | null {
    return this.arrows.get(tileKey(x, y)) ?? null
  }

  /**
   * Whether a tile holds a fizzler that is on.
   * @param view - The state to read the fizzlers from
   * @param x - Column
   * @param y - Row
   * @returns True when the tile's fizzler is on
   */
  isActiveFizzler(view: ComparedView, x: number, y: number): boolean {
    return isFlagSet(view.fizzlers, this.fizzlers.get(tileKey(x, y)))
  }

  /**
   * Whether a blocked barrier, ditch, door or laser keeps the subject off a
   * tile. The exit and arrows are asked about separately.
   * @param view - The state to read the flags from
   * @param x - Column
   * @param y - Row
   * @returns True when one of them is blocked there
   */
  blocksWalking(view: ComparedView, x: number, y: number): boolean {
    const key = tileKey(x, y)

    return isFlagSet(view.barriers, this.barriers.get(key)) ||
      isFlagSet(view.ditches, this.ditches.get(key)) ||
      isFlagSet(view.doors, this.doors.get(key)) ||
      isFlagSet(view.lasers, this.lasers.get(key))
  }

  /**
   * Whether a laser other than the first on a tile is on, which today's
   * rules never look at.
   * @param view - The state
   * @param x - Column
   * @param y - Row
   * @returns True when one of them is on
   */
  hasLaterLaserOn(view: ComparedView, x: number, y: number): boolean {
    return (this.laterLasers.get(tileKey(x, y)) ?? []).some((index) => view.lasers[index] === true)
  }

  /**
   * The buttons whose links name a box.
   * @param boxIndex - The box's index in the chamber's boxes
   * @returns The indexes of those buttons, in chamber order
   */
  getButtonsLinking(boxIndex: number): number[] {
    const result: number[] = []

    this.buttonLinks.forEach((links, buttonIndex) => {
      if (links.some((id) => this.boxesById.get(id) === boxIndex)) {
        result.push(buttonIndex)
      }
    })

    return result
  }
}
