import type {ArrowData, BlockableData, BoxData, ChamberData, LaserData, LinkGroupData, ParData, SubjectData, TriggerData, WallData} from '@/game/chamber_data'
import {type ChamberProblem, chamberError} from '@/game/rules/chamber_problem'
import {isJsonObject, type JsonObject} from '@/game/rules/json_object'

/**
 * What reading a chamber file's fields gave.
 */
export type ParseResult = {
  readonly chamber: ChamberData | null // The chamber, typed, or null when a field is wrong
  readonly problems: readonly ChamberProblem[] // Every wrong field, in file order
}

/** The chamber format this game reads */
const CHAMBER_FORMAT_VERSION = 2

/** The top-level fields of a format 2 file; the chamber check compares them with the element registry */
export const CHAMBER_FIELDS = [
  'version',
  'size',
  'subject',
  'exit',
  'walls',
  'barriers',
  'ditches',
  'boxes',
  'buttons',
  'arrows',
  'fizzlers',
  'doors',
  'switches',
  'lasers',
  'groups',
  'par',
]

/** The directions a subject or an arrow can face */
const DIRECTIONS = [
  'UP',
  'DOWN',
  'LEFT',
  'RIGHT',
]

/** The orientations of a laser beam */
const LASER_DIRECTIONS = [
  'H',
  'V',
]

/** A size's fields */
const SIZE_FIELDS = [
  'width',
  'height',
]

/** The fields every element on a tile has */
const POSITION_FIELDS = [
  'x',
  'y',
]

/** The fields of the subject and an arrow, all required; a laser has them too */
const DIRECTED_FIELDS = [
  'x',
  'y',
  'direction',
]

/** The fields a barrier, ditch, door, fizzler or the exit may have */
const BLOCKABLE_FIELDS = [
  'x',
  'y',
  'id',
  'blocked',
]

/** The fields a box may have */
const BOX_FIELDS = [
  'x',
  'y',
  'id',
]

/** The fields of a button or a switch, all required */
const TRIGGER_FIELDS = [
  'x',
  'y',
  'links',
]

/** The fields a laser may have */
const LASER_FIELDS = [
  'x',
  'y',
  'direction',
  'id',
  'blocked',
]

/** The fields a one-tile wall entry may have */
const WALL_TILE_FIELDS = [
  'x',
  'y',
  'takesPortals',
]

/** The corners of a wall rectangle, all required */
const WALL_CORNER_FIELDS = [
  'xFrom',
  'xTo',
  'yFrom',
  'yTo',
]

/** The fields a wall rectangle may have */
const WALL_RECTANGLE_FIELDS = [
  ...WALL_CORNER_FIELDS,
  'takesPortals',
]

/** The fields of a link group, all required */
const GROUP_FIELDS = [
  'id',
  'links',
]

/** The fields the par block may have, none required */
const PAR_FIELDS = [
  'moves',
  'portals',
]

/** The top-level fields a file must have */
const CHAMBER_REQUIRED_FIELDS = [
  'version',
  'size',
  'subject',
  'exit',
]

/**
 * The path of a field inside an object.
 * @param parent - The object's path, empty for the file itself
 * @param key - The field's name
 * @returns The field's path
 */
function fieldPath(parent: string, key: string): string {
  return (parent === '') ? key : `${parent}.${key}`
}

/**
 * Reads a format 2 chamber file field by field, collecting every field that
 * is missing, unknown or of the wrong kind. Values are checked one by one;
 * how they fit together (tiles, links) is checked once the file has been read.
 */
class ChamberParser {
  readonly problems: ChamberProblem[] = [] // Every wrong field found so far, in file order

  /**
   * Records a wrong field.
   * @param field - The field's path
   * @param message - What is wrong
   * @returns Null, for the reader to return
   */
  private fail(field: string, message: string): null {
    this.problems.push(chamberError(field, null, message))

    return null
  }

  /**
   * Reads an object, reporting every field it doesn't know and every required
   * field it lacks.
   * @param value - The value
   * @param field - Its path
   * @param known - Every field it may have
   * @param required - The fields it must have
   * @returns The object, or null when it isn't one or lacks a required field
   */
  private readObject(value: unknown, field: string, known: readonly string[], required: readonly string[]): JsonObject | null {
    if (!isJsonObject(value)) {
      return this.fail(field, 'is not an object')
    }

    for (const key of Object.keys(value)) {
      if (!known.includes(key)) {
        this.fail(fieldPath(field, key), 'is not a field of a chamber file here (misspelled?)')
      }
    }

    let complete = true

    for (const key of required) {
      if (value[key] === undefined) {
        this.fail(fieldPath(field, key), 'is missing')
        complete = false
      }
    }

    return complete ? value : null
  }

  /**
   * Reads a whole number.
   * @param value - The value
   * @param field - Its path
   * @param minimum - The smallest number allowed, or null for any
   * @returns The number, or null when it is wrong
   */
  private readInteger(value: unknown, field: string, minimum: number | null): number | null {
    if ((typeof value !== 'number') || (!Number.isSafeInteger(value))) {
      return this.fail(field, 'is not a whole number')
    }

    if ((minimum !== null) && (value < minimum)) {
      return this.fail(field, `is less than ${minimum}`)
    }

    return value
  }

  /**
   * Reads the format's version, which must be the one this game reads.
   * @param value - The value
   * @param field - Its path
   * @returns The version, or null when it is another
   */
  private readVersion(value: unknown, field: string): number | null {
    return (value === CHAMBER_FORMAT_VERSION) ? value : this.fail(field, `is not ${CHAMBER_FORMAT_VERSION}, the only format this game reads`)
  }

  /**
   * Reads true or false.
   * @param value - The value
   * @param field - Its path
   * @returns The value, or null when it is neither
   */
  private readBoolean(value: unknown, field: string): boolean | null {
    return (typeof value === 'boolean') ? value : this.fail(field, 'is not true or false')
  }

  /**
   * Reads one of a few words.
   * @param value - The value
   * @param field - Its path
   * @param choices - The words allowed
   * @returns The word, or null when it isn't one of them
   */
  private readChoice(value: unknown, field: string, choices: readonly string[]): string | null {
    if ((typeof value === 'string') && choices.includes(value)) {
      return value
    }

    return this.fail(field, `is not one of ${choices.join(', ')}`)
  }

  /**
   * Reads a list, each entry with its own reader. A missing list is left out.
   * @param value - The value
   * @param field - Its path
   * @param readEntry - Reads one entry, or returns null when it is wrong
   * @returns The entries that could be read, undefined when the list is missing, or null when it isn't a list
   */
  private readList<Entry>(value: unknown, field: string, readEntry: (entry: unknown, entryField: string) => Entry | null): Entry[] | undefined | null {
    if (value === undefined) {
      return undefined
    }

    if (!Array.isArray(value)) {
      return this.fail(field, 'is not a list')
    }

    const items: readonly unknown[] = value
    const result: Entry[] = []

    items.forEach((item, index) => {
      const entry = readEntry(item, `${field}[${index}]`)

      if (entry !== null) {
        result.push(entry)
      }
    })

    return result
  }

  /**
   * Reads a list of link ids.
   * @param value - The value
   * @param field - Its path
   * @returns The ids, or null when the list or an id is wrong
   */
  private readLinks(value: unknown, field: string): number[] | null {
    const links = this.readList(value, field, (entry, entryField) => this.readInteger(entry, entryField, 1))

    return ((links === undefined) || (links === null) || (Array.isArray(value) && (links.length !== value.length))) ? null : links
  }

  /**
   * Reads an optional element id.
   * @param value - The value, undefined when the element has none
   * @param field - Its path
   * @returns The id, undefined when absent, or null when it is wrong
   */
  private readOptionalId(value: unknown, field: string): number | undefined | null {
    return (value === undefined) ? undefined : this.readInteger(value, field, 1)
  }

  /**
   * Reads an optional blocked flag.
   * @param value - The value, undefined when absent
   * @param field - Its path
   * @returns The flag, undefined when absent, or null when it is wrong
   */
  private readOptionalBoolean(value: unknown, field: string): boolean | undefined | null {
    return (value === undefined) ? undefined : this.readBoolean(value, field)
  }

  /**
   * Reads the chamber's size.
   * @param value - The value
   * @param field - Its path
   * @returns The size, or null when it is wrong
   */
  readSize(value: unknown, field: string): ChamberData['size'] | null {
    const entry = this.readObject(value, field, SIZE_FIELDS, SIZE_FIELDS)

    if (entry === null) {
      return null
    }

    const width = this.readInteger(entry.width, fieldPath(field, 'width'), 1)
    const height = this.readInteger(entry.height, fieldPath(field, 'height'), 1)

    return ((width === null) || (height === null)) ? null : {
      width: width,
      height: height,
    }
  }

  /**
   * Reads where the subject starts.
   * @param value - The value
   * @param field - Its path
   * @returns The subject, or null when it is wrong
   */
  readSubject(value: unknown, field: string): SubjectData | null {
    const entry = this.readObject(value, field, DIRECTED_FIELDS, DIRECTED_FIELDS)

    if (entry === null) {
      return null
    }

    const x = this.readInteger(entry.x, fieldPath(field, 'x'), null)
    const y = this.readInteger(entry.y, fieldPath(field, 'y'), null)
    const direction = this.readChoice(entry.direction, fieldPath(field, 'direction'), DIRECTIONS)

    return ((x === null) || (y === null) || (direction === null)) ? null : {
      x: x,
      y: y,
      direction: direction,
    }
  }

  /**
   * Reads a barrier, ditch, door, fizzler or the exit.
   * @param value - The value
   * @param field - Its path
   * @returns The element, or null when it is wrong
   */
  readBlockable(value: unknown, field: string): BlockableData | null {
    const entry = this.readObject(value, field, BLOCKABLE_FIELDS, POSITION_FIELDS)

    if (entry === null) {
      return null
    }

    const x = this.readInteger(entry.x, fieldPath(field, 'x'), null)
    const y = this.readInteger(entry.y, fieldPath(field, 'y'), null)
    const id = this.readOptionalId(entry.id, fieldPath(field, 'id'))
    const blocked = this.readOptionalBoolean(entry.blocked, fieldPath(field, 'blocked'))

    return ((x === null) || (y === null) || (id === null) || (blocked === null)) ? null : {
      x: x,
      y: y,
      id: id,
      blocked: blocked,
    }
  }

  /**
   * Reads a box.
   * @param value - The value
   * @param field - Its path
   * @returns The box, or null when it is wrong
   */
  readBox(value: unknown, field: string): BoxData | null {
    const entry = this.readObject(value, field, BOX_FIELDS, POSITION_FIELDS)

    if (entry === null) {
      return null
    }

    const x = this.readInteger(entry.x, fieldPath(field, 'x'), null)
    const y = this.readInteger(entry.y, fieldPath(field, 'y'), null)
    const id = this.readOptionalId(entry.id, fieldPath(field, 'id'))

    return ((x === null) || (y === null) || (id === null)) ? null : {
      x: x,
      y: y,
      id: id,
    }
  }

  /**
   * Reads a button or a switch.
   * @param value - The value
   * @param field - Its path
   * @returns The trigger, or null when it is wrong
   */
  readTrigger(value: unknown, field: string): TriggerData | null {
    const entry = this.readObject(value, field, TRIGGER_FIELDS, TRIGGER_FIELDS)

    if (entry === null) {
      return null
    }

    const x = this.readInteger(entry.x, fieldPath(field, 'x'), null)
    const y = this.readInteger(entry.y, fieldPath(field, 'y'), null)
    const links = this.readLinks(entry.links, fieldPath(field, 'links'))

    return ((x === null) || (y === null) || (links === null)) ? null : {
      x: x,
      y: y,
      links: links,
    }
  }

  /**
   * Reads an arrow.
   * @param value - The value
   * @param field - Its path
   * @returns The arrow, or null when it is wrong
   */
  readArrow(value: unknown, field: string): ArrowData | null {
    const entry = this.readObject(value, field, DIRECTED_FIELDS, DIRECTED_FIELDS)

    if (entry === null) {
      return null
    }

    const x = this.readInteger(entry.x, fieldPath(field, 'x'), null)
    const y = this.readInteger(entry.y, fieldPath(field, 'y'), null)
    const direction = this.readChoice(entry.direction, fieldPath(field, 'direction'), DIRECTIONS)

    return ((x === null) || (y === null) || (direction === null)) ? null : {
      x: x,
      y: y,
      direction: direction,
    }
  }

  /**
   * Reads a laser.
   * @param value - The value
   * @param field - Its path
   * @returns The laser, or null when it is wrong
   */
  readLaser(value: unknown, field: string): LaserData | null {
    const entry = this.readObject(value, field, LASER_FIELDS, DIRECTED_FIELDS)

    if (entry === null) {
      return null
    }

    const x = this.readInteger(entry.x, fieldPath(field, 'x'), null)
    const y = this.readInteger(entry.y, fieldPath(field, 'y'), null)
    const direction = this.readChoice(entry.direction, fieldPath(field, 'direction'), LASER_DIRECTIONS)
    const id = this.readOptionalId(entry.id, fieldPath(field, 'id'))
    const blocked = this.readOptionalBoolean(entry.blocked, fieldPath(field, 'blocked'))

    return ((x === null) || (y === null) || (direction === null) || (id === null) || (blocked === null)) ? null : {
      x: x,
      y: y,
      direction: direction,
      id: id,
      blocked: blocked,
    }
  }

  /**
   * Reads a wall entry: one tile when it has x or y, otherwise a rectangle.
   * @param value - The value
   * @param field - Its path
   * @returns The wall, or null when it is wrong
   */
  readWall(value: unknown, field: string): WallData | null {
    if (isJsonObject(value) && (('x' in value) || ('y' in value))) {
      const entry = this.readObject(value, field, WALL_TILE_FIELDS, POSITION_FIELDS)

      if (entry === null) {
        return null
      }

      const x = this.readInteger(entry.x, fieldPath(field, 'x'), null)
      const y = this.readInteger(entry.y, fieldPath(field, 'y'), null)
      const takesPortals = this.readOptionalBoolean(entry.takesPortals, fieldPath(field, 'takesPortals'))

      return ((x === null) || (y === null) || (takesPortals === null)) ? null : {
        x: x,
        y: y,
        takesPortals: takesPortals,
      }
    }

    const entry = this.readObject(value, field, WALL_RECTANGLE_FIELDS, WALL_CORNER_FIELDS)

    if (entry === null) {
      return null
    }

    const xFrom = this.readInteger(entry.xFrom, fieldPath(field, 'xFrom'), null)
    const xTo = this.readInteger(entry.xTo, fieldPath(field, 'xTo'), null)
    const yFrom = this.readInteger(entry.yFrom, fieldPath(field, 'yFrom'), null)
    const yTo = this.readInteger(entry.yTo, fieldPath(field, 'yTo'), null)
    const takesPortals = this.readOptionalBoolean(entry.takesPortals, fieldPath(field, 'takesPortals'))

    if ((xFrom === null) || (xTo === null) || (yFrom === null) || (yTo === null) || (takesPortals === null)) {
      return null
    }

    if ((xFrom > xTo) || (yFrom > yTo)) {
      return this.fail(field, 'a rectangle\'s from corner is past its to corner')
    }

    return {
      xFrom: xFrom,
      xTo: xTo,
      yFrom: yFrom,
      yTo: yTo,
      takesPortals: takesPortals,
    }
  }

  /**
   * Reads a link group.
   * @param value - The value
   * @param field - Its path
   * @returns The group, or null when it is wrong
   */
  readGroup(value: unknown, field: string): LinkGroupData | null {
    const entry = this.readObject(value, field, GROUP_FIELDS, GROUP_FIELDS)

    if (entry === null) {
      return null
    }

    const id = this.readInteger(entry.id, fieldPath(field, 'id'), 1)
    const links = this.readLinks(entry.links, fieldPath(field, 'links'))

    return ((id === null) || (links === null)) ? null : {
      id: id,
      links: links,
    }
  }

  /**
   * Reads the par block, whose fields are all optional.
   * @param value - The value, undefined when absent
   * @param field - Its path
   * @returns The par, undefined when absent, or null when it is wrong
   */
  readPar(value: unknown, field: string): ParData | undefined | null {
    if (value === undefined) {
      return undefined
    }

    const entry = this.readObject(value, field, PAR_FIELDS, [])

    if (entry === null) {
      return null
    }

    const moves = (entry.moves === undefined) ? undefined : this.readInteger(entry.moves, fieldPath(field, 'moves'), 0)
    const portals = (entry.portals === undefined) ? undefined : this.readInteger(entry.portals, fieldPath(field, 'portals'), 0)

    return ((moves === null) || (portals === null)) ? null : {
      moves: moves,
      portals: portals,
    }
  }

  /**
   * Reads a whole file.
   * @param data - A chamber file, fields not yet checked
   * @returns The chamber, or null when any field is wrong
   */
  readChamber(data: JsonObject): ChamberData | null {
    const file = this.readObject(data, '', CHAMBER_FIELDS, CHAMBER_REQUIRED_FIELDS)

    if (file === null) {
      return null
    }

    const version = this.readVersion(file.version, 'version')
    const size = this.readSize(file.size, 'size')
    const subject = this.readSubject(file.subject, 'subject')
    const exit = this.readBlockable(file.exit, 'exit')
    const walls = this.readList(file.walls, 'walls', (entry, field) => this.readWall(entry, field))
    const barriers = this.readList(file.barriers, 'barriers', (entry, field) => this.readBlockable(entry, field))
    const ditches = this.readList(file.ditches, 'ditches', (entry, field) => this.readBlockable(entry, field))
    const boxes = this.readList(file.boxes, 'boxes', (entry, field) => this.readBox(entry, field))
    const buttons = this.readList(file.buttons, 'buttons', (entry, field) => this.readTrigger(entry, field))
    const arrows = this.readList(file.arrows, 'arrows', (entry, field) => this.readArrow(entry, field))
    const fizzlers = this.readList(file.fizzlers, 'fizzlers', (entry, field) => this.readBlockable(entry, field))
    const doors = this.readList(file.doors, 'doors', (entry, field) => this.readBlockable(entry, field))
    const switches = this.readList(file.switches, 'switches', (entry, field) => this.readTrigger(entry, field))
    const lasers = this.readList(file.lasers, 'lasers', (entry, field) => this.readLaser(entry, field))
    const groups = this.readList(file.groups, 'groups', (entry, field) => this.readGroup(entry, field))
    const par = this.readPar(file.par, 'par')

    // Every wrong entry was reported and left out of its list, so the chamber
    // is only built when nothing was wrong
    if ((this.problems.length > 0) || (version === null) || (size === null) || (subject === null) || (exit === null) ||
      (walls === null) || (barriers === null) || (ditches === null) || (boxes === null) || (buttons === null) ||
      (arrows === null) || (fizzlers === null) || (doors === null) || (switches === null) || (lasers === null) ||
      (groups === null) || (par === null)) {
      return null
    }

    return {
      version: version,
      size: size,
      subject: subject,
      exit: exit,
      walls: walls,
      barriers: barriers,
      ditches: ditches,
      boxes: boxes,
      buttons: buttons,
      arrows: arrows,
      fizzlers: fizzlers,
      doors: doors,
      switches: switches,
      lasers: lasers,
      groups: groups,
      par: par,
    }
  }
}

/**
 * Reads a chamber file, checking every field's presence, name and kind of
 * value, and that it is in the format this game reads.
 * @param data - A chamber file, fields not yet checked
 * @returns The typed chamber, or null with every wrong field
 */
export function parseChamber(data: JsonObject): ParseResult {
  const parser = new ChamberParser()
  const chamber = parser.readChamber(data)

  return {
    chamber: chamber,
    problems: parser.problems,
  }
}
