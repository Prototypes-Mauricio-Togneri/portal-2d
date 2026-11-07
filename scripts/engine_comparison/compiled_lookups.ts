import type {ChamberData, PositionData} from '@/game/chamber_data'
import {Chamber} from '@/game/classic/chamber'
import {formatChamberProblem} from '@/game/rules/chamber_problem'
import {CompiledChamber, type LinkTarget, NO_ELEMENT, type PlacedKind} from '@/game/rules/compiled_chamber'
import {ELEMENT_REGISTRY} from '@/game/rules/element_registry'
import {readChamber} from '@/game/rules/load_chamber'

/**
 * How today's rules find the elements of one type.
 */
type ClassicLookup = {
  readonly find: (chamber: Chamber, x: number, y: number) => PositionData | null // The first one on a tile, as the rules look it up
  readonly list: (chamber: Chamber) => readonly PositionData[] // Every one, in the chamber file's order
}

/** Mismatches listed for one chamber before the rest are only counted */
const LISTED_MISMATCHES = 5

/** Today's lookup for each element type the compiled chamber finds by tile; the build fails when a type is missing */
const CLASSIC_LOOKUPS: Readonly<Record<PlacedKind, ClassicLookup>> = {
  arrow: {
    find: (chamber, x, y) => chamber.getArrow(x, y),
    list: (chamber) => chamber.arrows,
  },
  barrier: {
    find: (chamber, x, y) => chamber.getBarrier(x, y),
    list: (chamber) => chamber.barriers,
  },
  ditch: {
    find: (chamber, x, y) => chamber.getDitch(x, y),
    list: (chamber) => chamber.ditches,
  },
  laser: {
    find: (chamber, x, y) => chamber.getLaser(x, y),
    list: (chamber) => chamber.lasers,
  },
  door: {
    find: (chamber, x, y) => chamber.getDoor(x, y),
    list: (chamber) => chamber.doors,
  },
  exit: {
    find: (chamber, x, y) => chamber.getExit(x, y),
    list: (chamber) => [chamber.exit],
  },
  button: {
    find: (chamber, x, y) => chamber.getButton(x, y),
    list: (chamber) => chamber.buttons,
  },
  switch: {
    find: (chamber, x, y) => chamber.getSwitch(x, y),
    list: (chamber) => chamber.switches,
  },
  fizzler: {
    find: (chamber, x, y) => chamber.getFizzler(x, y),
    list: (chamber) => chamber.fizzlers,
  },
}

/** The element types the compiled chamber finds by tile, in registry order */
const PLACED_KINDS: readonly PlacedKind[] = ELEMENT_REGISTRY
  .map((definition) => definition.kind)
  .filter((kind): kind is PlacedKind => (kind !== 'wall') && (kind !== 'box'))

/**
 * Every element of a type on a tile, as the compiled chamber chains them.
 * @param compiled - The compiled chamber
 * @param kind - The element type
 * @param x - Column
 * @param y - Row
 * @param limit - More than there can be, so a broken chain can't loop forever
 * @returns Their indexes, in chain order
 */
function compiledChain(compiled: CompiledChamber, kind: PlacedKind, x: number, y: number, limit: number): number[] {
  const result: number[] = []
  let index = compiled.elementAt(kind, x, y)

  while ((index !== NO_ELEMENT) && (result.length <= limit)) {
    result.push(index)
    index = compiled.nextOnTile(kind, index)
  }

  return result
}

/**
 * What today's rules link each id to: barriers, ditches, boxes, fizzlers,
 * doors, lasers and the exit, in the order they are registered, so a later
 * element takes over a duplicated id, and an id of 0 names nothing.
 * @param classic - The chamber on today's rules
 * @returns Each id's element, as "door 0"
 */
function classicLinkTargets(classic: Chamber): Map<number, string> {
  const result = new Map<number, string>()
  const register = (list: readonly {readonly id: number | undefined}[], kind: string): void => {
    list.forEach((element, index) => {
      if ((element.id !== undefined) && (element.id !== 0)) {
        result.set(element.id, `${kind} ${index}`)
      }
    })
  }

  register(classic.barriers, 'barrier')
  register(classic.ditches, 'ditch')
  register(classic.boxes, 'box')
  register(classic.fizzlers, 'fizzler')
  register(classic.doors, 'door')
  register(classic.lasers, 'laser')
  register([classic.exit], 'exit')

  return result
}

/**
 * A link target as the check prints it.
 * @param target - The element reached
 * @returns Such as "door 0"
 */
function describeTarget(target: LinkTarget): string {
  return `${target.kind} ${target.index}`
}

/**
 * Counts things, in words.
 * @param count - How many
 * @param singular - What, in the singular
 * @param plural - What, in the plural
 * @returns Such as "1 link" or "7 links"
 */
function countOf(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${(count === 1) ? singular : plural}`
}

/**
 * Builds a chamber's compiled form (stage 01, E6) and checks every lookup
 * against today's rules: on every tile, the wall and whether it takes
 * portals (every format 1 wall does), and, for each element type, the first
 * one there and every one there in list order; each box's start; each
 * button's and switch's links. Around the edge, every lookup must answer
 * wall, no portals and no element, which today's rules don't (the intended
 * change edge_is_wall), so that ring is checked on its own.
 * @param data - The chamber file, in format 1, which today's rules read
 * @returns A short summary
 * @throws Error listing the first mismatches, or when the file can't be read in format 2
 */
export function checkCompiledLookups(data: ChamberData): string {
  const read = readChamber(data)

  if (read.chamber === null) {
    throw new Error(`it can't be read in format 2: ${read.problems.map(formatChamberProblem).join('; ')}`)
  }

  const classic = new Chamber(data)
  const compiled = new CompiledChamber(read.chamber)
  const mismatches: string[] = []
  let sharedTiles = 0
  let links = 0

  for (let y = -1; y <= classic.height; y++) {
    for (let x = -1; x <= classic.width; x++) {
      const inside = (x >= 0) && (y >= 0) && (x < classic.width) && (y < classic.height)
      const wall = inside ? (classic.getTile(x, y) !== null) : true
      const takesPortals = inside && wall

      if (compiled.isWall(x, y) !== wall) {
        mismatches.push(`(${x}, ${y}) wall: expected ${wall}, compiled ${compiled.isWall(x, y)}`)
      }

      if (compiled.takesPortals(x, y) !== takesPortals) {
        mismatches.push(`(${x}, ${y}) takes portals: expected ${takesPortals}, compiled ${compiled.takesPortals(x, y)}`)
      }

      let shared = false

      for (const kind of PLACED_KINDS) {
        const lookup = CLASSIC_LOOKUPS[kind]
        const list = lookup.list(classic)
        const found = inside ? lookup.find(classic, x, y) : null
        const first = (found === null) ? NO_ELEMENT : list.indexOf(found)
        const all = inside ? list.flatMap((element, index) => ((element.x === x) && (element.y === y)) ? [index] : []) : []
        const chain = compiledChain(compiled, kind, x, y, list.length)

        if (compiled.elementAt(kind, x, y) !== first) {
          mismatches.push(`(${x}, ${y}) ${kind}: expected ${first}, compiled ${compiled.elementAt(kind, x, y)}`)
        }

        if (chain.join() !== all.join()) {
          mismatches.push(`(${x}, ${y}) every ${kind}: expected [${all.join(', ')}], compiled [${chain.join(', ')}]`)
        }

        shared = shared || (chain.length > 1)
      }

      if (shared) {
        sharedTiles++
      }
    }
  }

  if (compiled.boxStarts.length !== classic.boxes.length) {
    mismatches.push(`box starts: expected ${classic.boxes.length}, compiled ${compiled.boxStarts.length}`)
  }

  classic.boxes.forEach((box, index) => {
    const start = compiled.boxStarts[index]

    if ((start === undefined) || (start.x !== box.x) || (start.y !== box.y)) {
      mismatches.push(`box ${index} start: expected (${box.x}, ${box.y}), compiled ${(start === undefined) ? 'none' : `(${start.x}, ${start.y})`}`)
    }
  })

  const targets = classicLinkTargets(classic)
  const checkLinks = (triggers: readonly {readonly links: readonly number[]}[], kind: PlacedKind): void => {
    triggers.forEach((trigger, index) => {
      const expected = trigger.links.flatMap((id) => targets.get(id) ?? [])
      const reached = compiled.linksOf(kind, index).map(describeTarget)

      if (reached.join(', ') !== expected.join(', ')) {
        mismatches.push(`${kind} ${index} links: expected [${expected.join(', ')}], compiled [${reached.join(', ')}]`)
      }

      links += reached.length
    })
  }

  checkLinks(classic.buttons, 'button')
  checkLinks(classic.switches, 'switch')

  if (mismatches.length > 0) {
    const more = (mismatches.length > LISTED_MISMATCHES) ? `; and ${mismatches.length - LISTED_MISMATCHES} more` : ''

    throw new Error(`${countOf(mismatches.length, 'mismatch', 'mismatches')}: ${mismatches.slice(0, LISTED_MISMATCHES).join('; ')}${more}`)
  }

  return `${countOf(classic.width * classic.height, 'tile')}, ${countOf(links, 'link')}, ${countOf(sharedTiles, 'tile')} holding two of a kind`
}
