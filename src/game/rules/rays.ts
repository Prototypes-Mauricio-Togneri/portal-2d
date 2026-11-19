import {DELTAS, Direction} from '@/game/direction'
import {NO_ELEMENT, type Mirror} from '@/game/rules/compiled_chamber'
import type {ElementDefinition} from '@/game/rules/element_definition'
import {type BlockableKind, ELEMENT_REGISTRY, isBlockableElement} from '@/game/rules/element_registry'
import {OPPOSITES, portalExit} from '@/game/rules/portals'
import {DIRECTION_INDEX, DIRECTIONS, NO_BOX} from '@/game/rules/state_layout'
import type {StateReader} from '@/game/rules/state_reader'

// The rays, worked out from a state whenever settling judges a receiver,
// and by the drawing, never stored: each emitter that is on sends one from
// its firing face, tile by tile, until something stops it (docs/elements.md,
// "Rays"). Rays block nothing and harm nothing, and cross each other freely

/**
 * What ended a line of a ray: a wall's face (a wall, a blocked wall, an
 * emitter, a receiver's other faces, outside the chamber, or a portal while
 * the other is closed), a portal the ray went into, a receiver's listening
 * face, which it lights, the subject or a box with no mirror, which stand
 * over its end, an element that stops it (a light barrier that is on, a door
 * or the exit closed), or the tile it would enter the same way twice.
 */
export type RayEnd = 'wall' | 'portal' | 'receiver' | 'subject' | 'box' | 'element' | 'loop'

/**
 * A point a ray passes, in tiles from the chamber's bottom-left corner: x to
 * the right, y upwards, so a tile's middle is half a tile in from its corner.
 */
export type RayPoint = {
  readonly x: number // Tiles to the right
  readonly y: number // Tiles upwards
}

/**
 * One line of a ray: from an emitter's face or out of a portal, straight on
 * and turned by mirror boxes, until something ends it.
 */
export type RayLine = {
  readonly points: readonly RayPoint[] // Its corners, from where it starts to where it ends: a face it leaves, each mirror box's middle, then a face it meets, the edge of the tile something stops it on, or the middle of the subject's or a box's tile
  readonly end: RayEnd // What ended it
  readonly endX: number // Column of the tile it ended on: the wall's for a face, otherwise the one something stopped it on
  readonly endY: number // Row of that tile
  readonly way: Direction // The way it travelled as it ended
}

/**
 * Every ray in a state: each line of each, emitter by emitter in list
 * order, and which receivers they light.
 */
export type RayTrace = {
  readonly lines: readonly RayLine[] // Each line, a ray's in order, a new one after each portal
  readonly litReceivers: readonly boolean[] // Whether a ray reaches each receiver's listening face, in list order
}

/** The way a ray goes on after a mirror box turns it, for each mirror and each way it arrives, with rows growing upwards */
const MIRROR_TURNS: Readonly<Record<Mirror, Readonly<Record<Direction, Direction>>>> = {
  '/': {
    [Direction.RIGHT]: Direction.UP,
    [Direction.UP]: Direction.RIGHT,
    [Direction.LEFT]: Direction.DOWN,
    [Direction.DOWN]: Direction.LEFT,
  },
  '\\': {
    [Direction.RIGHT]: Direction.DOWN,
    [Direction.DOWN]: Direction.RIGHT,
    [Direction.LEFT]: Direction.UP,
    [Direction.UP]: Direction.LEFT,
  },
}

/** Types that stop a ray on their floor tile while blocked: a light barrier that is on, a door or the exit closed */
const RAY_BLOCKED_WHEN_BLOCKED: readonly BlockableKind[] = ELEMENT_REGISTRY
  .filter(isBlockableElement)
  .filter((definition: ElementDefinition) => (definition.sitsOn !== 'wall') && (definition.blocksRays === 'whenBlocked'))
  .map((definition) => definition.kind)

/**
 * The middle of a tile.
 * @param x - Column
 * @param y - Row
 * @returns Its middle
 */
function middleOf(x: number, y: number): RayPoint {
  return {
    x: x + 0.5,
    y: y + 0.5,
  }
}

/**
 * Where a ray crosses into a tile: the middle of its edge on the side the
 * ray comes from, which is also the face of a wall tile the ray meets.
 * @param x - Column of the tile
 * @param y - Row of the tile
 * @param way - The way the ray travels
 * @returns The point
 */
function entryEdgeOf(x: number, y: number, way: Direction): RayPoint {
  return {
    x: x + 0.5 - (DELTAS[way].dx / 2),
    y: y + 0.5 - (DELTAS[way].dy / 2),
  }
}

/**
 * Whether an element on a floor tile stops a ray there now.
 * @param reader - The state
 * @param x - Column
 * @param y - Row
 * @returns True when one does
 */
function stopsRay(reader: StateReader, x: number, y: number): boolean {
  return RAY_BLOCKED_WHEN_BLOCKED.some((kind) => reader.isBlockedAt(kind, x, y))
}

/**
 * The receiver whose listening face a ray meets, travelling a way into a
 * wall tile.
 * @param reader - The state
 * @param x - Column of the wall tile
 * @param y - Row of the wall tile
 * @param way - The way the ray travels
 * @returns The receiver's index, or NO_ELEMENT when the face isn't one's listening face
 */
function receiverListening(reader: StateReader, x: number, y: number, way: Direction): number {
  const chamber = reader.chamber
  const face = OPPOSITES[way]

  for (let index = chamber.elementAt('receiver', x, y); index !== NO_ELEMENT; index = chamber.nextOnTile('receiver', index)) {
    if (chamber.directionOf('receiver', index) === face) {
      return index
    }
  }

  return NO_ELEMENT
}

/**
 * Follows one ray from the tile in front of its emitter, adding its lines
 * and lighting the receivers it reaches.
 * @param reader - The state
 * @param startX - Column of the tile in front of the emitter's firing face
 * @param startY - Row of that tile
 * @param startWay - The way the emitter fires
 * @param lines - Where its lines go
 * @param lit - Each receiver's lit flag, set for one it reaches
 */
function followRay(reader: StateReader, startX: number, startY: number, startWay: Direction, lines: RayLine[], lit: boolean[]): void {
  const chamber = reader.chamber
  const entered = new Set<number>()
  let x = startX
  let y = startY
  let way = startWay
  let points: RayPoint[] = [entryEdgeOf(x, y, way)]

  const endLine = (end: RayEnd, last: RayPoint): void => {
    points.push(last)
    lines.push({
      points: points,
      end: end,
      endX: x,
      endY: y,
      way: way,
    })
  }

  // Each tile is entered each way at most once, so every ray ends
  for (;;) {
    if (chamber.isWall(x, y)) {
      const receiver = receiverListening(reader, x, y, way)

      if (receiver !== NO_ELEMENT) {
        lit[receiver] = true
        endLine('receiver', entryEdgeOf(x, y, way))

        return
      }

      const exit = portalExit(reader, x, y, way)

      if (exit === null) {
        endLine('wall', entryEdgeOf(x, y, way))

        return
      }

      endLine('portal', entryEdgeOf(x, y, way))
      x = exit.x
      y = exit.y
      way = exit.direction
      points = [entryEdgeOf(x, y, way)]
      continue
    }

    const key = (((y * chamber.width) + x) * DIRECTIONS.length) + DIRECTION_INDEX[way]

    if (entered.has(key)) {
      endLine('loop', entryEdgeOf(x, y, way))

      return
    }

    entered.add(key)

    if (stopsRay(reader, x, y)) {
      endLine('element', entryEdgeOf(x, y, way))

      return
    }

    if (reader.isSubjectAt(x, y)) {
      endLine('subject', middleOf(x, y))

      return
    }

    const box = reader.restingBoxAt(x, y)

    if (box !== NO_BOX) {
      const mirror = chamber.mirrorOf(box)

      if (mirror === null) {
        endLine('box', middleOf(x, y))

        return
      }

      points.push(middleOf(x, y))
      way = MIRROR_TURNS[mirror][way]
    }

    x += DELTAS[way].dx
    y += DELTAS[way].dy
  }
}

/**
 * Traces every ray in a state: from each emitter that is on, in list order,
 * from the tile in front of its firing face, tile by tile. A floor tile stops
 * it while the subject stands there (a carried box with it), a box with no
 * mirror rests there, or an element there stops it (a light barrier that is
 * on, a door or the exit closed); a resting mirror box turns it a quarter
 * turn, and it goes on from that tile. A wall tile stops it at the face it
 * meets, unless that face is a receiver's listening face, which lights that
 * receiver, or holds a portal while the other is open: then it goes on from
 * the tile in front of the other portal, away from its wall. A ray that would
 * enter a tile the same way it already entered it stops there.
 * @param reader - The state, a step's draft or a settled state
 * @returns The rays' lines and which receivers they light
 */
export function traceRays(reader: StateReader): RayTrace {
  const chamber = reader.chamber
  const lines: RayLine[] = []
  const lit: boolean[] = new Array<boolean>(chamber.countOf('receiver')).fill(false)

  for (let index = 0; index < chamber.countOf('emitter'); index++) {
    const way = chamber.directionOf('emitter', index)

    if ((way === null) || reader.isBlocked('emitter', index)) {
      continue
    }

    const position = chamber.positionOf('emitter', index)

    followRay(reader, position.x + DELTAS[way].dx, position.y + DELTAS[way].dy, way, lines, lit)
  }

  return {
    lines: lines,
    litReceivers: lit,
  }
}
