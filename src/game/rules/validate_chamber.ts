import type {ChamberData, PositionData} from '@/game/chamber_data'
import {type ChamberProblem, chamberError, chamberWarning, type ProblemTile} from '@/game/rules/chamber_problem'

/**
 * What can stand on a tile at the start: a wall, a fixed element, a box or
 * the subject.
 */
type OccupantKind = 'wall' | 'barrier' | 'ditch' | 'door' | 'exit' | 'fizzler' | 'arrow' | 'button' | 'switch' | 'laser' | 'box' | 'subject'

/**
 * Something standing on a tile at the start.
 */
type Occupant = {
  readonly kind: OccupantKind // What it is
  readonly field: string // Where in the file it is listed
  readonly laserDirection: string | null // H or V for a laser, otherwise null
}

/**
 * A tile inside the chamber and what stands on it at the start.
 */
type TileOccupants = {
  readonly tile: ProblemTile // The tile
  readonly list: Occupant[] // What stands on it, in file order
}

/**
 * Something a link id can name.
 */
type LinkTarget = {
  readonly kind: OccupantKind | 'group' // What it is
  readonly field: string // Where in the file it is listed
  readonly tile: ProblemTile | null // Its tile, null for a group
  readonly links: readonly number[] // A group's ids, empty for an element
}

/** The elements that sit fixed on a floor tile; only two crossing lasers may share one */
const FIXTURES: readonly OccupantKind[] = [
  'barrier',
  'ditch',
  'door',
  'exit',
  'fizzler',
  'arrow',
  'button',
  'switch',
  'laser',
]

/** What may stand on a tile of the chamber's edge, so that the chamber is enclosed */
const EDGE_KINDS: readonly OccupantKind[] = [
  'wall',
  'barrier',
  'door',
  'exit',
]

/**
 * What something on a tile is called in a problem's message.
 * @param kind - What it is
 * @returns Its name with an article, such as "the exit" or "a door"
 */
function describeKind(kind: OccupantKind): string {
  if ((kind === 'subject') || (kind === 'exit')) {
    return `the ${kind}`
  }

  return (kind === 'arrow') ? 'an arrow' : `a ${kind}`
}

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
 * Checks how the parts of a format 2 chamber fit together: everything inside
 * the chamber, at most one fixed element per tile, ids unique and links
 * naming something, and an enclosed edge.
 */
class ChamberValidator {
  readonly problems: ChamberProblem[] = [] // Every problem found so far
  private readonly chamber: ChamberData // The chamber being checked
  private readonly occupants = new Map<string, TileOccupants>() // What stands on each tile inside the chamber, by tile key
  private readonly targets = new Map<number, LinkTarget>() // What each id names, the first one listed when an id is used twice

  /**
   * @param chamber - The chamber, its fields already read
   */
  constructor(chamber: ChamberData) {
    this.chamber = chamber
  }

  /**
   * Whether a tile is inside the chamber.
   * @param x - Column
   * @param y - Row
   * @returns True inside
   */
  private isInside(x: number, y: number): boolean {
    return (x >= 0) && (y >= 0) && (x < this.chamber.size.width) && (y < this.chamber.size.height)
  }

  /**
   * Notes what stands on a tile.
   * @param x - Column
   * @param y - Row
   * @param occupant - What stands there
   */
  private addOccupant(x: number, y: number, occupant: Occupant): void {
    const key = tileKey(x, y)
    const entry = this.occupants.get(key)

    if (entry === undefined) {
      this.occupants.set(key, {
        tile: {
          x: x,
          y: y,
        },
        list: [occupant],
      })
    } else {
      entry.list.push(occupant)
    }
  }

  /**
   * Places an element on its tile, reporting it when it is outside the chamber.
   * @param element - The element
   * @param kind - What it is
   * @param field - Where in the file it is listed
   * @param laserDirection - H or V for a laser, otherwise null
   */
  private placeElement(element: PositionData, kind: OccupantKind, field: string, laserDirection: string | null = null): void {
    if (!this.isInside(element.x, element.y)) {
      this.problems.push(chamberError(field, {
        x: element.x,
        y: element.y,
      }, 'is outside the chamber'))

      return
    }

    this.addOccupant(element.x, element.y, {
      kind: kind,
      field: field,
      laserDirection: laserDirection,
    })
  }

  /**
   * Places every wall tile, reporting an entry that reaches outside the
   * chamber and a tile listed twice.
   */
  private placeWalls(): void {
    const walls = this.chamber.walls ?? []

    walls.forEach((wall, index) => {
      const field = `walls[${index}]`
      const xFrom = ('x' in wall) ? wall.x : wall.xFrom
      const xTo = ('x' in wall) ? wall.x : wall.xTo
      const yFrom = ('y' in wall) ? wall.y : wall.yFrom
      const yTo = ('y' in wall) ? wall.y : wall.yTo
      const outside = (xFrom < 0) || (yFrom < 0) || (xTo >= this.chamber.size.width) || (yTo >= this.chamber.size.height)

      // Only the part inside the chamber is walked, so a rectangle with huge
      // corners in a file from anywhere costs no more than the chamber itself
      for (let x = Math.max(xFrom, 0); x <= Math.min(xTo, this.chamber.size.width - 1); x++) {
        for (let y = Math.max(yFrom, 0); y <= Math.min(yTo, this.chamber.size.height - 1); y++) {
          if ((this.occupants.get(tileKey(x, y))?.list ?? []).some((occupant) => occupant.kind === 'wall')) {
            this.problems.push(chamberError(field, {
              x: x,
              y: y,
            }, 'lists a wall tile that another wall entry already lists'))
          }

          this.addOccupant(x, y, {
            kind: 'wall',
            field: field,
            laserDirection: null,
          })
        }
      }

      if (outside) {
        this.problems.push(chamberError(field, {
          x: xFrom,
          y: yFrom,
        }, 'reaches outside the chamber'))
      }
    })
  }

  /**
   * Places every element, the subject and the boxes on their tiles.
   */
  private placeElements(): void {
    const chamber = this.chamber

    this.placeElement(chamber.subject, 'subject', 'subject')
    this.placeElement(chamber.exit, 'exit', 'exit')
    chamber.barriers?.forEach((element, index) => this.placeElement(element, 'barrier', `barriers[${index}]`))
    chamber.ditches?.forEach((element, index) => this.placeElement(element, 'ditch', `ditches[${index}]`))
    chamber.boxes?.forEach((element, index) => this.placeElement(element, 'box', `boxes[${index}]`))
    chamber.buttons?.forEach((element, index) => this.placeElement(element, 'button', `buttons[${index}]`))
    chamber.arrows?.forEach((element, index) => this.placeElement(element, 'arrow', `arrows[${index}]`))
    chamber.fizzlers?.forEach((element, index) => this.placeElement(element, 'fizzler', `fizzlers[${index}]`))
    chamber.doors?.forEach((element, index) => this.placeElement(element, 'door', `doors[${index}]`))
    chamber.switches?.forEach((element, index) => this.placeElement(element, 'switch', `switches[${index}]`))
    chamber.lasers?.forEach((element, index) => this.placeElement(element, 'laser', `lasers[${index}]`, element.direction))
  }

  /**
   * Checks what shares each tile: a wall holds at most a barrier; a floor
   * tile holds at most one fixed element, or two crossing lasers; a box and
   * the subject start on plain floor or a button, with at most one box.
   */
  private checkOverlaps(): void {
    for (const entry of this.occupants.values()) {
      const tile = entry.tile
      const list = entry.list
      const walls = list.filter((occupant) => occupant.kind === 'wall')
      const fixtures = list.filter((occupant) => FIXTURES.includes(occupant.kind))
      const boxes = list.filter((occupant) => occupant.kind === 'box')
      const subject = list.find((occupant) => occupant.kind === 'subject')

      if (walls.length > 0) {
        for (const occupant of list) {
          const isOnlyBarrier = (occupant.kind === 'barrier') && (fixtures.length === 1)

          if ((occupant.kind !== 'wall') && (!isOnlyBarrier)) {
            this.problems.push(chamberError(occupant.field, tile, `${describeKind(occupant.kind)} can't be inside a wall (only one barrier can)`))
          }
        }

        continue
      }

      const crossingLasers = (fixtures.length === 2) && fixtures.every((occupant) => occupant.kind === 'laser') &&
        (fixtures[0]?.laserDirection !== fixtures[1]?.laserDirection)

      if ((fixtures.length > 1) && (!crossingLasers)) {
        const names = fixtures.map((occupant) => `${occupant.kind} (${occupant.field})`).join(', ')
        this.problems.push(chamberError(fixtures[1]?.field ?? '', tile, `more than one element on a tile: ${names}; only two crossing lasers can share one`))
      }

      const startsBadly = fixtures.some((occupant) => occupant.kind !== 'button')

      if (boxes.length > 1) {
        this.problems.push(chamberError(boxes[1]?.field ?? '', tile, 'two boxes start on one tile'))
      }

      if ((boxes.length > 0) && startsBadly) {
        this.problems.push(chamberError(boxes[0]?.field ?? '', tile, 'a box can only start on plain floor or a button'))
      }

      if ((subject !== undefined) && startsBadly) {
        this.problems.push(chamberError(subject.field, tile, 'the subject can only start on plain floor or a button'))
      }
    }
  }

  /**
   * Notes what an id names, reporting an id used twice.
   * @param id - The id, or undefined when the element has none
   * @param target - What it names
   */
  private addTarget(id: number | undefined, target: LinkTarget): void {
    if (id === undefined) {
      return
    }

    const earlier = this.targets.get(id)

    if (earlier !== undefined) {
      this.problems.push(chamberError(target.field, target.tile, `id ${id} is also used by ${earlier.field}`))

      return
    }

    this.targets.set(id, target)
  }

  /**
   * Notes every id: the linkable elements' and the groups'.
   */
  private collectTargets(): void {
    const chamber = this.chamber
    const addElements = (list: readonly (PositionData & {readonly id?: number})[] | undefined, kind: OccupantKind, name: string): void => {
      list?.forEach((element, index) => this.addTarget(element.id, {
        kind: kind,
        field: `${name}[${index}]`,
        tile: {
          x: element.x,
          y: element.y,
        },
        links: [],
      }))
    }

    addElements(chamber.barriers, 'barrier', 'barriers')
    addElements(chamber.ditches, 'ditch', 'ditches')
    addElements(chamber.boxes, 'box', 'boxes')
    addElements(chamber.fizzlers, 'fizzler', 'fizzlers')
    addElements(chamber.doors, 'door', 'doors')
    addElements(chamber.lasers, 'laser', 'lasers')
    this.addTarget(chamber.exit.id, {
      kind: 'exit',
      field: 'exit',
      tile: {
        x: chamber.exit.x,
        y: chamber.exit.y,
      },
      links: [],
    })
    chamber.groups?.forEach((group, index) => this.addTarget(group.id, {
      kind: 'group',
      field: `groups[${index}]`,
      tile: null,
      links: group.links,
    }))
  }

  /**
   * Checks that every link names something, that a group names only
   * elements, and warns about a button linked to a box (releasing the button
   * does nothing to the box).
   */
  private checkLinks(): void {
    const chamber = this.chamber

    chamber.groups?.forEach((group, index) => {
      for (const id of group.links) {
        const target = this.targets.get(id)

        if (target === undefined) {
          this.problems.push(chamberError(`groups[${index}]`, null, `links id ${id}, which nothing has`))
        } else if (target.kind === 'group') {
          this.problems.push(chamberError(`groups[${index}]`, null, `links group ${target.field}; a group can only name elements`))
        }
      }
    })

    const checkTriggers = (list: typeof chamber.buttons, name: string, isButton: boolean): void => {
      list?.forEach((trigger, index) => {
        const field = `${name}[${index}]`
        const tile = {
          x: trigger.x,
          y: trigger.y,
        }

        for (const id of trigger.links) {
          const target = this.targets.get(id)

          if (target === undefined) {
            this.problems.push(chamberError(field, tile, `links id ${id}, which nothing has`))
            continue
          }

          const named = (target.kind === 'group') ? target.links.map((member) => this.targets.get(member)) : [target]

          if (isButton && named.some((element) => element?.kind === 'box')) {
            this.problems.push(chamberWarning(field, tile, 'links a box: pressing sends it back to its start, releasing does nothing to it'))
          }
        }
      })
    }

    checkTriggers(chamber.buttons, 'buttons', true)
    checkTriggers(chamber.switches, 'switches', false)
  }

  /**
   * Checks that every tile of the chamber's edge holds a wall, a barrier, a
   * door or the exit.
   */
  private checkEdge(): void {
    const width = this.chamber.size.width
    const height = this.chamber.size.height

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const onEdge = (x === 0) || (y === 0) || (x === width - 1) || (y === height - 1)
        const list = this.occupants.get(tileKey(x, y))?.list ?? []

        if (onEdge && (!list.some((occupant) => EDGE_KINDS.includes(occupant.kind)))) {
          this.problems.push(chamberError('', {
            x: x,
            y: y,
          }, 'the chamber\'s edge is open here: an edge tile needs a wall, a barrier, a door or the exit'))
        }
      }
    }
  }

  /**
   * Runs every check.
   */
  validate(): void {
    this.placeWalls()
    this.placeElements()
    this.checkOverlaps()
    this.collectTargets()
    this.checkLinks()
    this.checkEdge()
  }
}

/**
 * Checks how the parts of a chamber fit together. Its fields must already
 * have been read (parseChamber).
 * @param chamber - The chamber
 * @returns Every error and warning, in the order the checks run
 */
export function validateChamber(chamber: ChamberData): ChamberProblem[] {
  const validator = new ChamberValidator(chamber)

  validator.validate()

  return validator.problems
}
