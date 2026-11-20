import type {AntlineData, ArrowData, ChamberData, PositionData, WallRangeData} from '@/game/chamber_data'
import {DELTAS, parseDirection} from '@/game/direction'
import {type ChamberProblem, chamberError, chamberWarning, type ProblemTile} from '@/game/rules/chamber_problem'

/**
 * What can stand on a tile at the start: a wall, a fixed element, a box or
 * the subject.
 */
type OccupantKind = 'wall' | 'blockedWall' | 'emitter' | 'receiver' | 'slideFloor' | 'lightBarrier' | 'ditch' | 'door' | 'exit' | 'fizzler' | 'arrow' | 'button' | 'switch' | 'laser' | 'box' | 'subject'

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

/** The walls: a tile holds at most one, and nothing else; emitters and receivers are wall tiles of their own */
const WALL_KINDS: readonly OccupantKind[] = [
  'wall',
  'blockedWall',
  'emitter',
  'receiver',
]

/** The elements that sit fixed on a floor tile; only two crossing lasers may share one */
const FIXTURES: readonly OccupantKind[] = [
  'lightBarrier',
  'ditch',
  'door',
  'exit',
  'fizzler',
  'arrow',
  'button',
  'switch',
  'laser',
]

/** The fixed elements a slide floor can't share its tile with, besides a wall; it may share one with any other, which it lies under */
const SLIDE_FLOOR_EXCLUDED: readonly OccupantKind[] = [
  'ditch',
  'door',
  'exit',
  'arrow',
  'switch',
]

/** What may stand on a tile of the chamber's edge, so that the chamber is enclosed */
const EDGE_KINDS: readonly OccupantKind[] = [
  'wall',
  'blockedWall',
  'emitter',
  'receiver',
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

  if (kind === 'lightBarrier') {
    return 'a light barrier'
  }

  if (kind === 'blockedWall') {
    return 'a blocked wall'
  }

  if (kind === 'slideFloor') {
    return 'a slide floor'
  }

  return ((kind === 'arrow') || (kind === 'emitter')) ? `an ${kind}` : `a ${kind}`
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
 * the chamber, at most one fixed element per tile, emitters and receivers
 * facing the floor, ids unique and links naming something, antlines leading
 * from a button, switch or receiver to an element it links, an enclosed
 * edge, and the exit in that edge, away from its corners.
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
   * Places every wall, blocked wall, emitter and receiver tile, reporting an
   * entry that reaches outside the chamber and a tile listed twice.
   */
  private placeWalls(): void {
    this.chamber.walls?.forEach((wall, index) => this.placeTiles(wall, 'wall', `walls[${index}]`, WALL_KINDS, 'wall'))
    this.chamber.blockedWalls?.forEach((wall, index) => this.placeTiles(wall, 'blockedWall', `blockedWalls[${index}]`, WALL_KINDS, 'wall'))
    this.chamber.emitters?.forEach((emitter, index) => this.placeTiles(emitter, 'emitter', `emitters[${index}]`, WALL_KINDS, 'wall'))
    this.chamber.receivers?.forEach((receiver, index) => this.placeTiles(receiver, 'receiver', `receivers[${index}]`, WALL_KINDS, 'wall'))
  }

  /**
   * Places every slide floor tile, reporting an entry that reaches outside
   * the chamber and a tile listed twice.
   */
  private placeSlideFloors(): void {
    this.chamber.slideFloors?.forEach((floor, index) => this.placeTiles(floor, 'slideFloor', `slideFloors[${index}]`, ['slideFloor'], 'slide floor'))
  }

  /**
   * Places the tiles of one wall, blocked wall or slide floor entry,
   * reporting it when it reaches outside the chamber and each tile another
   * entry of its kinds already lists.
   * @param entry - The entry: one tile or an inclusive rectangle
   * @param kind - A wall, a blocked wall or a slide floor
   * @param field - Where in the file it is listed
   * @param sameKinds - The kinds whose entries may not list a tile it lists
   * @param name - What a tile of those kinds is called in a problem's message
   */
  private placeTiles(entry: PositionData | WallRangeData, kind: OccupantKind, field: string, sameKinds: readonly OccupantKind[], name: string): void {
    const xFrom = ('x' in entry) ? entry.x : entry.xFrom
    const xTo = ('x' in entry) ? entry.x : entry.xTo
    const yFrom = ('y' in entry) ? entry.y : entry.yFrom
    const yTo = ('y' in entry) ? entry.y : entry.yTo
    const outside = (xFrom < 0) || (yFrom < 0) || (xTo >= this.chamber.size.width) || (yTo >= this.chamber.size.height)

    // Only the part inside the chamber is walked, so a rectangle with huge
    // corners in a file from anywhere costs no more than the chamber itself
    for (let x = Math.max(xFrom, 0); x <= Math.min(xTo, this.chamber.size.width - 1); x++) {
      for (let y = Math.max(yFrom, 0); y <= Math.min(yTo, this.chamber.size.height - 1); y++) {
        if ((this.occupants.get(tileKey(x, y))?.list ?? []).some((occupant) => sameKinds.includes(occupant.kind))) {
          this.problems.push(chamberError(field, {
            x: x,
            y: y,
          }, `lists a ${name} tile that another ${name} entry already lists`))
        }

        this.addOccupant(x, y, {
          kind: kind,
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
  }

  /**
   * Places every element, the subject and the boxes on their tiles.
   */
  private placeElements(): void {
    const chamber = this.chamber

    this.placeElement(chamber.subject, 'subject', 'subject')
    this.placeElement(chamber.exit, 'exit', 'exit')
    chamber.lightBarriers?.forEach((element, index) => this.placeElement(element, 'lightBarrier', `lightBarriers[${index}]`))
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
   * Checks what shares each tile: a wall holds nothing else; a floor tile
   * holds at most one fixed element, or two crossing lasers; a slide floor
   * shares no tile with a ditch, door, exit, arrow or switch; a box and the
   * subject start on plain floor, slide floor or a button, with at most one
   * box, and the subject never on a box, since a box keeps it off its tile.
   */
  private checkOverlaps(): void {
    for (const entry of this.occupants.values()) {
      const tile = entry.tile
      const list = entry.list
      const walls = list.filter((occupant) => WALL_KINDS.includes(occupant.kind))
      const fixtures = list.filter((occupant) => FIXTURES.includes(occupant.kind))
      const boxes = list.filter((occupant) => occupant.kind === 'box')
      const subject = list.find((occupant) => occupant.kind === 'subject')

      if (walls.length > 0) {
        for (const occupant of list) {
          if (!WALL_KINDS.includes(occupant.kind)) {
            this.problems.push(chamberError(occupant.field, tile, `${describeKind(occupant.kind)} can't be inside a wall`))
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

      const slideFloor = list.find((occupant) => occupant.kind === 'slideFloor')

      if (slideFloor !== undefined) {
        for (const occupant of list) {
          if (SLIDE_FLOOR_EXCLUDED.includes(occupant.kind)) {
            this.problems.push(chamberError(slideFloor.field, tile, `a slide floor can't share a tile with ${describeKind(occupant.kind)}`))
          }
        }
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

      if ((subject !== undefined) && (boxes.length > 0)) {
        this.problems.push(chamberError(subject.field, tile, 'the subject can\'t start on a box'))
      }
    }
  }

  /**
   * Checks that each emitter fires, and each receiver listens, onto a floor
   * tile inside the chamber: the tile its face looks onto is inside and no
   * wall.
   */
  private checkDeviceFaces(): void {
    const check = (list: readonly (PositionData & {readonly direction: string})[] | undefined, name: string, does: string): void => {
      list?.forEach((device, index) => {
        if (!this.isInside(device.x, device.y)) {
          return
        }

        const delta = DELTAS[parseDirection(device.direction)]
        const facedX = device.x + delta.dx
        const facedY = device.y + delta.dy
        const tile = {
          x: device.x,
          y: device.y,
        }

        if (!this.isInside(facedX, facedY)) {
          this.problems.push(chamberError(`${name}[${index}]`, tile, `faces outside the chamber: it ${does} a floor tile inside it`))
        } else if ((this.occupants.get(tileKey(facedX, facedY))?.list ?? []).some((occupant) => WALL_KINDS.includes(occupant.kind))) {
          this.problems.push(chamberError(`${name}[${index}]`, tile, `faces a wall at (${facedX}, ${facedY}): it ${does} a floor tile`))
        }
      })
    }

    check(this.chamber.emitters, 'emitters', 'fires onto')
    check(this.chamber.receivers, 'receivers', 'listens on')
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
   * Notes every id: the linkable elements' and the groups'. Arrows, then
   * emitters, come after the exit, the last linkable element before them, so
   * the messages of chambers without them keep their order.
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

    chamber.blockedWalls?.forEach((wall, index) => {
      // Only a one-tile blocked wall can have an id
      if ('x' in wall) {
        this.addTarget(wall.id, {
          kind: 'blockedWall',
          field: `blockedWalls[${index}]`,
          tile: {
            x: wall.x,
            y: wall.y,
          },
          links: [],
        })
      }
    })
    addElements(chamber.lightBarriers, 'lightBarrier', 'lightBarriers')
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
    addElements(chamber.arrows, 'arrow', 'arrows')
    addElements(chamber.emitters, 'emitter', 'emitters')
    chamber.groups?.forEach((group, index) => this.addTarget(group.id, {
      kind: 'group',
      field: `groups[${index}]`,
      tile: null,
      links: group.links,
    }))
  }

  /**
   * Checks that every link names something, that a group names only
   * elements, and warns about a button or a receiver linked to a box
   * (releasing the button, or the receiver going dark, does nothing to the
   * box).
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

    const checkTriggers = (list: readonly (PositionData & {readonly links: readonly number[]})[] | undefined, name: string, boxWarning: string | null): void => {
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

          if ((boxWarning !== null) && named.some((element) => element?.kind === 'box')) {
            this.problems.push(chamberWarning(field, tile, boxWarning))
          }
        }
      })
    }

    checkTriggers(chamber.buttons, 'buttons', 'links a box: pressing sends it back to its start, releasing does nothing to it')
    checkTriggers(chamber.switches, 'switches', null)
    checkTriggers(chamber.receivers, 'receivers', 'links a box: lighting sends it back to its start, going dark does nothing to it')
  }

  /**
   * Checks that each arrow a link can turn has both an id and a turned way,
   * and that its turned way is a quarter turn from its own way.
   */
  private checkArrows(): void {
    this.chamber.arrows?.forEach((arrow, index) => {
      const problem = arrowProblem(arrow)

      if (problem !== null) {
        this.problems.push(chamberError(`arrows[${index}]`, {
          x: arrow.x,
          y: arrow.y,
        }, problem))
      }
    })
  }

  /**
   * Whether a button, switch or receiver on a tile links an element, by its
   * id or through a group.
   * @param tile - The tile
   * @param id - The element's id
   * @returns True when one on the tile does
   */
  private isLinkedFrom(tile: PositionData, id: number): boolean {
    const triggers = [
      ...(this.chamber.buttons ?? []),
      ...(this.chamber.switches ?? []),
      ...(this.chamber.receivers ?? []),
    ]

    return triggers.some((trigger) => (trigger.x === tile.x) && (trigger.y === tile.y) &&
      trigger.links.some((link) => (link === id) || (this.targets.get(link)?.links.includes(id) ?? false)))
  }

  /**
   * Checks an antline's corners, reporting the first that is outside the
   * chamber, repeats the corner before it or shares neither its row nor its
   * column.
   * @param path - The corners
   * @param field - Where in the file the antline is listed
   * @returns True when every corner is right
   */
  private checkAntlinePath(path: readonly PositionData[], field: string): boolean {
    let previous: PositionData | null = null

    for (const corner of path) {
      const tile = {
        x: corner.x,
        y: corner.y,
      }

      if (!this.isInside(corner.x, corner.y)) {
        this.problems.push(chamberError(field, tile, 'is outside the chamber'))

        return false
      }

      if ((previous !== null) && (previous.x === corner.x) && (previous.y === corner.y)) {
        this.problems.push(chamberError(field, tile, 'repeats the corner before it'))

        return false
      }

      if ((previous !== null) && (previous.x !== corner.x) && (previous.y !== corner.y)) {
        this.problems.push(chamberError(field, tile, 'shares neither a row nor a column with the corner before it'))

        return false
      }

      previous = corner
    }

    return true
  }

  /**
   * Checks one antline: it leads to an element, not a group; its corners are
   * right; it starts on a button, switch or receiver that links the element,
   * by its id or through a group, and ends on the element's tile.
   * @param antline - The antline
   * @param field - Where in the file it is listed
   */
  private checkAntline(antline: AntlineData, field: string): void {
    const id = antline.link
    const target = this.targets.get(id)

    if (target === undefined) {
      this.problems.push(chamberError(field, null, `links id ${id}, which nothing has`))

      return
    }

    if ((target.kind === 'group') || (target.tile === null)) {
      this.problems.push(chamberError(field, null, `links group ${target.field}; an antline leads to one element`))

      return
    }

    const start = antline.path.at(0)
    const end = antline.path.at(-1)

    // The parser keeps no path with fewer than two corners
    if ((start === undefined) || (end === undefined) || (!this.checkAntlinePath(antline.path, field))) {
      return
    }

    if (!this.isLinkedFrom(start, id)) {
      this.problems.push(chamberError(field, {
        x: start.x,
        y: start.y,
      }, `starts on no button, switch or receiver that links id ${id}`))
    }

    if ((end.x !== target.tile.x) || (end.y !== target.tile.y)) {
      this.problems.push(chamberError(field, {
        x: end.x,
        y: end.y,
      }, `ends away from id ${id}, which is at (${target.tile.x}, ${target.tile.y})`))
    }
  }

  /**
   * Checks that every tile of the chamber's edge holds a wall, a blocked
   * wall, an emitter, a receiver, a door or the exit.
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
          }, 'the chamber\'s edge is open here: an edge tile needs a wall, a blocked wall, an emitter, a receiver, a door or the exit'))
        }
      }
    }
  }

  /**
   * Checks that the exit sits in the chamber's edge, away from its corners,
   * so it leads out of the chamber. An exit outside the chamber is already
   * reported where it is placed.
   */
  private checkExit(): void {
    const exit = this.chamber.exit

    if (!this.isInside(exit.x, exit.y)) {
      return
    }

    const lastX = this.chamber.size.width - 1
    const lastY = this.chamber.size.height - 1
    const inEdgeColumn = (exit.x === 0) || (exit.x === lastX)
    const inEdgeRow = (exit.y === 0) || (exit.y === lastY)
    const onEdge = inEdgeColumn || inEdgeRow
    const inCorner = inEdgeColumn && inEdgeRow

    if ((!onEdge) || inCorner) {
      this.problems.push(chamberError('exit', {
        x: exit.x,
        y: exit.y,
      }, 'the exit must be in the chamber\'s outer wall, away from its corners, so it leads out of the chamber'))
    }
  }

  /**
   * Runs every check.
   */
  validate(): void {
    this.placeWalls()
    this.placeSlideFloors()
    this.placeElements()
    this.checkOverlaps()
    this.checkDeviceFaces()
    this.collectTargets()
    this.checkLinks()
    this.checkArrows()
    this.chamber.antlines?.forEach((antline, index) => this.checkAntline(antline, `antlines[${index}]`))
    this.checkEdge()
    this.checkExit()
  }
}

/**
 * What is wrong with how an arrow can turn: a turned way without an id or an
 * id without one, or a turned way that isn't a quarter turn from its own way.
 * @param arrow - The arrow, its fields already read
 * @returns The problem, or null when it has none
 */
function arrowProblem(arrow: ArrowData): string | null {
  const turned = arrow.turnedDirection

  if ((turned === undefined) && (arrow.id === undefined)) {
    return null
  }

  if (turned === undefined) {
    return 'an arrow with an id needs a turned way, or a link to it changes nothing'
  }

  if (arrow.id === undefined) {
    return 'an arrow with a turned way needs an id, or nothing can turn it'
  }

  if (turned === arrow.direction) {
    return 'an arrow\'s turned way can\'t be its own way'
  }

  const own = DELTAS[parseDirection(arrow.direction)]
  const other = DELTAS[parseDirection(turned)]

  if ((own.dx === -other.dx) && (own.dy === -other.dy)) {
    return 'an arrow\'s turned way must be a quarter turn from its own way, not a half turn'
  }

  return null
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
