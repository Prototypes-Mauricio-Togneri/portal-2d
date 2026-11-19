import type {PositionData} from '@/game/chamber_data'
import {DELTAS, Direction} from '@/game/direction'
import {GameEvent} from '@/game/game_event'
import {Action, MOVEMENTS, type Movement} from '@/game/rules/action'
import {type CompiledChamber, NO_ELEMENT, type PlacedKind} from '@/game/rules/compiled_chamber'
import type {ElementDefinition, ElementHooks} from '@/game/rules/element_definition'
import {type BlockableKind, ELEMENT_REGISTRY, isBlockableElement, isOneWayElement, type OneWayKind, type RegisteredElement} from '@/game/rules/element_registry'
import {destroyBoxesOnBlockedTiles} from '@/game/rules/elements/box'
import {PORTAL_COLORS, PortalColor} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {StateDraft} from '@/game/rules/state_draft'
import {DIRECTION_INDEX, DIRECTIONS, NO_BOX} from '@/game/rules/state_layout'
import type {StateReader} from '@/game/rules/state_reader'

// The rules as a pure step, as docs/elements.md writes them under "Rules":
// an action (a move onto a slide floor slides on), then the carried box
// follows, then passes of the fizzler rule and the buttons until one changes
// nothing, then the exit check. What blocks walking and shots is read from
// the element definitions, and what an element does beyond that from its
// hooks

/**
 * One tile a slide entered: the move or crossing that began the slide, then
 * each tile after it, until it stopped.
 */
export type SlideLeg = {
  readonly x: number // Column of the tile entered
  readonly y: number // Row of the tile entered
  readonly direction: Direction // The way the subject moved onto it, which it faces there
  readonly crossed: boolean // Whether it came out of a portal onto it
  readonly events: readonly GameEvent[] // What happened from entering it until moving on, or stopping, in order; the slide's stop and settling come after the last leg
  readonly state: RulesState // The state once the subject entered it and passed what lies there (a fizzler), before settling
}

/**
 * What a step gives: the state after it, what happened in it and, when it
 * slid, the tiles the slide entered.
 */
export type StepResult = {
  readonly state: RulesState // The state after the step; the same object when nothing changed
  readonly events: readonly GameEvent[] // What happened, in order
  readonly path: readonly SlideLeg[] // Each tile a slide entered, in order; NO_PATH, empty, unless the step slid
}

/**
 * A tile the subject can come onto next, and how.
 */
type Arrival = {
  readonly x: number // Column
  readonly y: number // Row
  readonly direction: Direction // The way it faces on arriving
  readonly crossed: boolean // Whether it comes out of a portal
}

/** The path of every step that didn't slide, shared so that such a step allocates none */
export const NO_PATH: readonly SlideLeg[] = []

/**
 * A hook of one element type, with the type.
 */
type KindHook<Hook> = {
  readonly kind: PlacedKind // The element type
  readonly hook: Hook // Its hook
}

/**
 * An element type found by tile.
 */
type PlacedElement = Extract<RegisteredElement, {readonly kind: PlacedKind}>

/** The most passes of the repeat loop a step may need; one more is a mistake in the rules, reported as an error */
export const PASS_CAP = 32

/** The way opposite each way */
export const OPPOSITES: Readonly<Record<Direction, Direction>> = {
  [Direction.UP]: Direction.DOWN,
  [Direction.DOWN]: Direction.UP,
  [Direction.LEFT]: Direction.RIGHT,
  [Direction.RIGHT]: Direction.LEFT,
}

/** The event a hit reports for each portal */
const PORTAL_OPENED: Readonly<Record<PortalColor, GameEvent>> = {
  [PortalColor.BLUE]: GameEvent.BLUE_PORTAL_OPENED,
  [PortalColor.ORANGE]: GameEvent.ORANGE_PORTAL_OPENED,
}

/**
 * Whether an element type is found by tile: every type but walls, which
 * have flags of their own, and boxes, which move.
 * @param definition - An element type from the registry
 * @returns True when it is found by tile
 */
function isPlacedElement(definition: RegisteredElement): definition is PlacedElement {
  return (definition.kind !== 'wall') && (definition.kind !== 'box')
}

/** The element types found by tile, in registry order */
const PLACED_ELEMENTS: readonly PlacedElement[] = ELEMENT_REGISTRY.filter(isPlacedElement)

/** The element types found by tile on the floor: a type that sits on a wall (a blocked wall) stops walking and shots by being a wall, which isWall answers */
const FLOOR_ELEMENTS: readonly PlacedElement[] = PLACED_ELEMENTS.filter((definition: ElementDefinition) => definition.sitsOn !== 'wall')

/** The element types with a blocked flag, in registry order */
const BLOCKABLE_ELEMENTS = ELEMENT_REGISTRY.filter(isBlockableElement)

/** Types that keep the subject off their tile while blocked */
const WALK_BLOCKED_WHEN_BLOCKED: readonly BlockableKind[] = BLOCKABLE_ELEMENTS
  .filter((definition: ElementDefinition) => definition.blocksWalking === 'whenBlocked')
  .map((definition) => definition.kind)

/** Types that always keep the subject off their tile */
const WALK_BLOCKED_ALWAYS: readonly PlacedKind[] = FLOOR_ELEMENTS
  .filter((definition: ElementDefinition) => definition.blocksWalking === 'always')
  .map((definition) => definition.kind)

/** Types entered only moving the way they point now, from which only that way acts (arrows) */
const ONE_WAY: readonly OneWayKind[] = ELEMENT_REGISTRY
  .filter(isOneWayElement)
  .map((definition) => definition.kind)

/** Types that stop a shot on their tile while blocked */
const SHOT_BLOCKED_WHEN_BLOCKED: readonly BlockableKind[] = BLOCKABLE_ELEMENTS
  .filter((definition: ElementDefinition) => definition.blocksShots === 'whenBlocked')
  .map((definition) => definition.kind)

/** Types that always stop a shot on their tile */
const SHOT_BLOCKED_ALWAYS: readonly PlacedKind[] = FLOOR_ELEMENTS
  .filter((definition: ElementDefinition) => definition.blocksShots === 'always')
  .map((definition) => definition.kind)

/** Types that keep the portal keys from shooting while the subject stands on them blocked (fizzlers) */
const SHOOTING_STOPPED_WHEN_BLOCKED: readonly BlockableKind[] = BLOCKABLE_ELEMENTS
  .filter((definition: ElementDefinition) => definition.stopsShootingFrom === 'whenBlocked')
  .map((definition) => definition.kind)

/** Types that keep the subject moving the same way once it enters their tile (slide floors) */
const MOVEMENT_CONTINUING: readonly PlacedKind[] = PLACED_ELEMENTS
  .filter((definition: ElementDefinition) => definition.continuesMovement)
  .map((definition) => definition.kind)

/**
 * Collects one hook from every element type found by tile that has it, in
 * registry order.
 * @param name - The hook
 * @returns Each type with its hook
 */
function collectHooks<Name extends keyof ElementHooks>(name: Name): readonly KindHook<NonNullable<ElementHooks[Name]>>[] {
  const result: KindHook<NonNullable<ElementHooks[Name]>>[] = []

  for (const definition of PLACED_ELEMENTS) {
    const widened: ElementDefinition = definition
    const hook = widened.hooks?.[name]

    if (hook !== undefined) {
      result.push({
        kind: definition.kind,
        hook: hook,
      })
    }
  }

  return result
}

/** The interact hooks (switches) */
const INTERACT_HOOKS = collectHooks('interact')

/** The hooks run while the subject stands on the element's tile (the fizzler rule) */
const SUBJECT_INSIDE_HOOKS = collectHooks('subjectInside')

/** The hooks run on every element in each pass (buttons) */
const EVERY_PASS_HOOKS = collectHooks('everyPass')

/**
 * Whether the elements on a tile let the subject move a way: a one-way tile
 * (an arrow) allows only the way it points now, both into it and out of it.
 * Exported for the solver, which reads walking from the rules rather than
 * copying it.
 * @param draft - The state, a step's draft or a settled state
 * @param x - Column
 * @param y - Row
 * @param direction - The way the subject moves
 * @returns True when nothing on the tile points another way
 */
export function allowsWay(draft: StateReader, x: number, y: number, direction: Direction): boolean {
  for (const kind of ONE_WAY) {
    for (let index = draft.chamber.elementAt(kind, x, y); index !== NO_ELEMENT; index = draft.chamber.nextOnTile(kind, index)) {
      if (draft.pointingWay(kind, index) !== direction) {
        return false
      }
    }
  }

  return true
}

/**
 * Whether the elements on a tile let the subject step onto it, moving or
 * coming out of a portal a way: not a wall, nor outside the chamber, nor a
 * tile an element blocks. A box resting there also keeps the subject off
 * (boxBlocksEntry), but is left out here: boxes move, so the solver can keep
 * this answer per set of blocked flags, and reaching a box on the tile faced
 * goes by the elements alone. Exported for the solver, like allowsWay.
 * @param draft - The state, a step's draft or a settled state
 * @param x - Column
 * @param y - Row
 * @param direction - The way the subject moves onto it
 * @returns True when it can
 */
export function canEnter(draft: StateReader, x: number, y: number, direction: Direction): boolean {
  if (draft.chamber.isWall(x, y)) {
    return false
  }

  for (const kind of WALK_BLOCKED_WHEN_BLOCKED) {
    if (draft.isBlockedAt(kind, x, y)) {
      return false
    }
  }

  for (const kind of WALK_BLOCKED_ALWAYS) {
    if (draft.chamber.elementAt(kind, x, y) !== NO_ELEMENT) {
      return false
    }
  }

  return allowsWay(draft, x, y, direction)
}

/**
 * Whether a box resting on a tile keeps the subject off it: a tile holding a
 * box is never walked or crossed onto, so the subject only shares one with a
 * box sent back to its start under it. The carried box, which sits on the
 * subject's tile, doesn't count. Exported for the solver, which skips such
 * tiles in its walks.
 * @param draft - The state, a step's draft or a settled state
 * @param x - Column
 * @param y - Row
 * @returns True when a box rests there
 */
export function boxBlocksEntry(draft: StateReader, x: number, y: number): boolean {
  return draft.restingBoxAt(x, y) !== NO_BOX
}

/**
 * The portal a move into a wall enters: with both portals open, the one on
 * the wall's side facing the subject. Exported for the solver, like
 * allowsWay, so it skips moves into walls that can't change anything.
 * @param draft - The state, a step's draft or a settled state
 * @param wallX - Column of the wall
 * @param wallY - Row of the wall
 * @param direction - The way the subject walks
 * @returns The portal entered, or null when the move enters none
 */
export function portalEntrance(draft: StateReader, wallX: number, wallY: number, direction: Direction): PortalColor | null {
  if ((!draft.isPortalOpen(PortalColor.BLUE)) || (!draft.isPortalOpen(PortalColor.ORANGE))) {
    return null
  }

  const facingSide = OPPOSITES[direction]

  return PORTAL_COLORS.find((color) => (draft.portalX(color) === wallX) && (draft.portalY(color) === wallY) && (draft.portalSide(color) === facingSide)) ?? null
}

/**
 * Where walking into a wall comes out, when the wall holds a portal on its
 * side facing the subject (portalEntrance): in front of the other portal,
 * facing away from its wall. Whether the subject can arrive there isn't
 * checked.
 * @param draft - The state, a step's draft or a settled state
 * @param wallX - Column of the wall
 * @param wallY - Row of the wall
 * @param direction - The way the subject walks
 * @returns The tile and the way out, or null when the move enters no portal
 */
function portalExit(draft: StateReader, wallX: number, wallY: number, direction: Direction): Arrival | null {
  const entrance = portalEntrance(draft, wallX, wallY, direction)

  if (entrance === null) {
    return null
  }

  const exit = (entrance === PortalColor.BLUE) ? PortalColor.ORANGE : PortalColor.BLUE
  const exitSide = draft.portalSide(exit)

  // Both portals are open, so this never returns
  if (exitSide === null) {
    return null
  }

  const delta = DELTAS[exitSide]

  return {
    x: draft.portalX(exit) + delta.dx,
    y: draft.portalY(exit) + delta.dy,
    direction: exitSide,
    crossed: true,
  }
}

/**
 * Whether the subject can come onto a tile: it can enter it the way it
 * arrives (canEnter) and no box rests there.
 * @param draft - The state, a step's draft or a settled state
 * @param arrival - The tile and the way it arrives
 * @returns True when it can
 */
function canArrive(draft: StateReader, arrival: Arrival): boolean {
  return canEnter(draft, arrival.x, arrival.y, arrival.direction) && (!boxBlocksEntry(draft, arrival.x, arrival.y))
}

/**
 * Puts the subject on a tile it can arrive at, facing the way it arrives,
 * and reports a portal crossing.
 * @param draft - The step's state
 * @param arrival - The tile and the way it arrives
 */
function arrive(draft: StateDraft, arrival: Arrival): void {
  draft.moveSubject(arrival.x, arrival.y)
  draft.face(arrival.direction)

  if (arrival.crossed) {
    draft.emit(GameEvent.CROSSED)
  }
}

/**
 * Walks into a wall: if both portals are open and this wall holds one of
 * them on the side facing the subject, the subject comes out in front of the
 * other, facing away from its wall, when it can enter that tile and no box
 * rests there; otherwise the crossing is refused and the subject stays.
 * @param draft - The step's state
 * @param wallX - Column of the wall
 * @param wallY - Row of the wall
 * @param direction - The way the subject walks
 * @returns True when the subject came out of the other portal
 */
function crossPortal(draft: StateDraft, wallX: number, wallY: number, direction: Direction): boolean {
  const exit = portalExit(draft, wallX, wallY, direction)

  if (exit === null) {
    return false
  }

  if (!canArrive(draft, exit)) {
    draft.emit(GameEvent.REFUSED)

    return false
  }

  arrive(draft, exit)

  return true
}

/**
 * Whether something on a tile keeps the subject moving once it enters it (a
 * slide floor).
 * @param draft - The state, a step's draft or a settled state
 * @param x - Column
 * @param y - Row
 * @returns True when it does
 */
function keepsMoving(draft: StateReader, x: number, y: number): boolean {
  for (const kind of MOVEMENT_CONTINUING) {
    if (draft.chamber.elementAt(kind, x, y) !== NO_ELEMENT) {
      return true
    }
  }

  return false
}

/**
 * Where a sliding subject comes onto next, going on the way it faces: the
 * tile ahead, or, when that is a wall holding a portal on its side facing
 * the subject, the tile in front of the other portal (portalExit), as long
 * as it can arrive there (canArrive). A crossing it can't come out of stops
 * the slide, silently.
 * @param draft - The step's state
 * @param x - Column of the subject's tile
 * @param y - Row of the subject's tile
 * @param direction - The way it slides
 * @returns The tile and the way it arrives, or null when the slide stops here
 */
function nextArrival(draft: StateReader, x: number, y: number, direction: Direction): Arrival | null {
  const targetX = x + DELTAS[direction].dx
  const targetY = y + DELTAS[direction].dy
  const arrival = draft.chamber.isWall(targetX, targetY) ? portalExit(draft, targetX, targetY, direction) : {
    x: targetX,
    y: targetY,
    direction: direction,
    crossed: false,
  }

  return ((arrival !== null) && canArrive(draft, arrival)) ? arrival : null
}

/**
 * A tile entered a way, as one number, so a slide can tell when it would
 * enter a tile the same way twice.
 * @param draft - The step's state
 * @param arrival - The tile and the way it is entered
 * @returns The number, unique within the chamber
 */
function entryKey(draft: StateReader, arrival: Arrival): number {
  return (((arrival.y * draft.chamber.width) + arrival.x) * DIRECTIONS.length) + DIRECTION_INDEX[arrival.direction]
}

/**
 * The subject passes over the tile it stands on while sliding: the carried
 * box follows it there and the elements there act (the fizzler rule), then
 * it goes on if that tile keeps it moving (a slide floor) and it can arrive
 * at the next one (nextArrival). The tile where it stops is passed over too;
 * settling then runs the fizzler rule there again, which changes nothing
 * more.
 * @param draft - The step's state
 * @returns Where it goes on to, or null when it stops here
 */
function passOver(draft: StateDraft): Arrival | null {
  const x = draft.subjectX
  const y = draft.subjectY

  draft.carryBoxAlong()
  runSubjectInsideHooks(draft, x, y)

  return keepsMoving(draft, x, y) ? nextArrival(draft, x, y, draft.facing) : null
}

/**
 * The tile the subject stands on, as a leg of its slide.
 * @param draft - The step's state, the subject on the tile and past what lies there
 * @param crossed - Whether it came out of a portal onto the tile
 * @param eventStart - How many events the step had reported when the subject entered the tile
 * @returns The leg
 */
function createLeg(draft: StateDraft, crossed: boolean, eventStart: number): SlideLeg {
  return {
    x: draft.subjectX,
    y: draft.subjectY,
    direction: draft.facing,
    crossed: crossed,
    events: draft.events.slice(eventStart),
    state: draft.toState(),
  }
}

/**
 * Keeps the subject moving after it entered a tile that keeps it moving (a
 * slide floor): it passes over each tile it enters (passOver) and goes on
 * the way it faces, through portals, until it can't or it enters a tile that
 * doesn't keep it moving. Buttons and everything else settling judges react
 * only to the tile where it stops. Reports slideStarted as it first goes on,
 * and slideStopped once it stops after that.
 * @param draft - The step's state, the subject on the tile it just entered
 * @param crossed - Whether it came out of a portal onto that tile
 * @param eventStart - How many events the step had reported before it entered that tile
 * @returns Each tile it entered, from that one, when it went on; NO_PATH when it stopped there at once; null when it would enter a tile the same way twice, a loop through portals
 */
function slide(draft: StateDraft, crossed: boolean, eventStart: number): readonly SlideLeg[] | null {
  const entered = new Set<number>([
    entryKey(draft, {
      x: draft.subjectX,
      y: draft.subjectY,
      direction: draft.facing,
      crossed: crossed,
    }),
  ])
  const legs: SlideLeg[] = []
  let legCrossed = crossed
  let legStart = eventStart

  for (let arrival = passOver(draft); arrival !== null; arrival = passOver(draft)) {
    if (legs.length === 0) {
      draft.emit(GameEvent.SLIDE_STARTED)
    }

    legs.push(createLeg(draft, legCrossed, legStart))

    const key = entryKey(draft, arrival)

    if (entered.has(key)) {
      return null
    }

    entered.add(key)
    legStart = draft.events.length
    legCrossed = arrival.crossed
    arrive(draft, arrival)
  }

  if (legs.length === 0) {
    return NO_PATH
  }

  legs.push(createLeg(draft, legCrossed, legStart))
  draft.emit(GameEvent.SLIDE_STOPPED)

  return legs
}

/**
 * Moves or turns: on a one-way tile only the way it points now acts. The subject faces
 * the way first; a turn stops there unless it already faced that way. Then
 * it steps onto the next tile if it can enter it and no box rests there, or
 * crosses a portal on a wall there, and slides on from a tile that keeps it
 * moving (a slide floor).
 * @param draft - The step's state
 * @param movement - The way, and whether it is a turn
 * @returns Each tile a slide entered, NO_PATH when it didn't slide, or null when the slide would loop, which refuses the whole move
 */
function move(draft: StateDraft, movement: Movement): readonly SlideLeg[] | null {
  const x = draft.subjectX
  const y = draft.subjectY
  const direction = movement.direction

  if (!allowsWay(draft, x, y, direction)) {
    return NO_PATH
  }

  const turnOnly = movement.turn && (draft.facing !== direction)

  draft.face(direction)

  if (turnOnly) {
    return NO_PATH
  }

  const targetX = x + DELTAS[direction].dx
  const targetY = y + DELTAS[direction].dy
  const eventStart = draft.events.length
  let crossed = false

  if (draft.chamber.isWall(targetX, targetY)) {
    if (!crossPortal(draft, targetX, targetY, direction)) {
      return NO_PATH
    }

    crossed = true
  } else if (canEnter(draft, targetX, targetY, direction) && (!boxBlocksEntry(draft, targetX, targetY))) {
    draft.moveSubject(targetX, targetY)
  } else {
    return NO_PATH
  }

  return keepsMoving(draft, draft.subjectX, draft.subjectY) ? slide(draft, crossed, eventStart) : NO_PATH
}

/**
 * Whether something on a tile stops a shot. Exported for the miss ripple,
 * which tells a shot stopped by an element from one stopped by a wall.
 * @param draft - The state, a step's draft or a settled state
 * @param x - Column
 * @param y - Row
 * @returns True when it does
 */
export function stopsShot(draft: StateReader, x: number, y: number): boolean {
  for (const kind of SHOT_BLOCKED_WHEN_BLOCKED) {
    if (draft.isBlockedAt(kind, x, y)) {
      return true
    }
  }

  for (const kind of SHOT_BLOCKED_ALWAYS) {
    if (draft.chamber.elementAt(kind, x, y) !== NO_ELEMENT) {
      return true
    }
  }

  return false
}

/**
 * Whether a side of a wall takes portals now: a wall's always, a blocked
 * wall's only while it isn't blocked, but never a side facing a door or the
 * exit, or behind a laser's or a light barrier's end plate.
 * @param draft - The step's state
 * @param x - Column of the wall
 * @param y - Row of the wall
 * @param side - The side, the way it faces
 * @returns True when a portal can open on it; false outside the chamber
 */
function takesPortalsNow(draft: StateDraft, x: number, y: number, side: Direction): boolean {
  return draft.chamber.canTakePortalOn(x, y, side) && (!draft.isBlockedAt('blockedWall', x, y))
}

/**
 * Whether a wall has room for a portal on its side facing a shot: no portal
 * of either colour on that side or either neighbouring side. One on the far
 * side doesn't count.
 * @param draft - The step's state
 * @param x - Column of the wall
 * @param y - Row of the wall
 * @param direction - The way the shot travels, which is the wall's far side
 * @returns True when the portal fits
 */
function hasRoomForPortal(draft: StateDraft, x: number, y: number, direction: Direction): boolean {
  return PORTAL_COLORS.every((color) => (!draft.isPortalOpen(color)) || (draft.portalX(color) !== x) || (draft.portalY(color) !== y) || (draft.portalSide(color) === direction))
}

/**
 * Where a shot stops: it goes on tile by tile from the tile it starts on,
 * which doesn't count, until a tile something on it stops the shot, or a
 * wall. Exported for the solver, like allowsWay, so the shots that end at
 * the same tile share one result.
 * @param draft - The state, a step's draft or a settled state
 * @param x - Column the shot starts from
 * @param y - Row the shot starts from
 * @param direction - The way it goes
 * @returns The tile where it stops, which can be just outside the chamber
 */
export function shotStop(draft: StateReader, x: number, y: number, direction: Direction): PositionData {
  const delta = DELTAS[direction]
  let stopX = x + delta.dx
  let stopY = y + delta.dy

  // Outside the chamber is wall, so every shot ends
  while ((!stopsShot(draft, stopX, stopY)) && (!draft.chamber.isWall(stopX, stopY))) {
    stopX += delta.dx
    stopY += delta.dy
  }

  return {
    x: stopX,
    y: stopY,
  }
}

/**
 * Shoots a portal the way the subject faces, unless it stands somewhere
 * that keeps it from shooting (a fizzler that is on), which does nothing,
 * silently, or carries a box, which is refused. The shot goes on until
 * something stops it, a miss, or it reaches a wall (shotStop): a wall whose
 * side facing the shot takes portals and has room opens the portal there;
 * any other wall, outside the chamber included, is a miss.
 * @param draft - The step's state
 * @param color - The portal shot
 */
function shoot(draft: StateDraft, color: PortalColor): void {
  for (const kind of SHOOTING_STOPPED_WHEN_BLOCKED) {
    if (draft.isBlockedAt(kind, draft.subjectX, draft.subjectY)) {
      return
    }
  }

  // Shooting takes free hands
  if (draft.isCarrying) {
    draft.emit(GameEvent.REFUSED)

    return
  }

  const direction = draft.facing
  const stop = shotStop(draft, draft.subjectX, draft.subjectY, direction)

  const side = OPPOSITES[direction]

  if ((!stopsShot(draft, stop.x, stop.y)) && takesPortalsNow(draft, stop.x, stop.y, side) && hasRoomForPortal(draft, stop.x, stop.y, direction)) {
    draft.openPortal(color, stop.x, stop.y, side)
    draft.emit(PORTAL_OPENED[color])

    return
  }

  draft.emit(GameEvent.REFUSED)
}

/**
 * Whether the subject reaches the tile it faces, to pick a box up there or
 * put one down: a move that way could step onto that tile now, but for a
 * box resting there, and no fizzler there is on. Picked up inside a field
 * that is on, a box is destroyed, so reaching in from outside mustn't
 * rescue it, nor put it there to be destroyed.
 * @param draft - The state, a step's draft or a settled state
 * @param x - Column of the subject's tile
 * @param y - Row of the subject's tile
 * @param facing - The way the subject faces
 * @returns True when it reaches that tile
 */
function reachesAhead(draft: StateReader, x: number, y: number, facing: Direction): boolean {
  const targetX = x + DELTAS[facing].dx
  const targetY = y + DELTAS[facing].dy

  return allowsWay(draft, x, y, facing) && canEnter(draft, targetX, targetY, facing) && (!draft.isBlockedAt('fizzler', targetX, targetY))
}

/**
 * The box the subject can reach on the tile it faces: one resting there,
 * when the subject reaches that tile (reachesAhead).
 * @param draft - The state, a step's draft or a settled state
 * @param x - Column of the subject's tile
 * @param y - Row of the subject's tile
 * @param facing - The way the subject faces
 * @returns The box's index, or NO_BOX when it can reach none
 */
function boxInReach(draft: StateReader, x: number, y: number, facing: Direction): number {
  const box = draft.restingBoxAt(x + DELTAS[facing].dx, y + DELTAS[facing].dy)

  if ((box === NO_BOX) || (!reachesAhead(draft, x, y, facing))) {
    return NO_BOX
  }

  return box
}

/**
 * Whether the tile the subject faces can take the box it carries: the
 * subject reaches it (reachesAhead), no box rests there, since a tile holds
 * one, and it holds neither the exit, which no box may lie on (nothing would
 * destroy one there when it closes), nor an element that takes the interact
 * key (a switch), which a box would hide and the key would never reach.
 * @param draft - The state, a step's draft or a settled state
 * @param x - Column of the subject's tile
 * @param y - Row of the subject's tile
 * @param facing - The way the subject faces
 * @returns True when the box can be put down there
 */
function canTakeBoxAhead(draft: StateReader, x: number, y: number, facing: Direction): boolean {
  const targetX = x + DELTAS[facing].dx
  const targetY = y + DELTAS[facing].dy

  if ((!reachesAhead(draft, x, y, facing)) || (draft.restingBoxAt(targetX, targetY) !== NO_BOX) || (draft.chamber.elementAt('exit', targetX, targetY) !== NO_ELEMENT)) {
    return false
  }

  return INTERACT_HOOKS.every((interactHook) => draft.chamber.elementAt(interactHook.kind, targetX, targetY) === NO_ELEMENT)
}

/**
 * Where the interact key puts a carried box down: on the tile the subject
 * faces when it can take the box (canTakeBoxAhead), never on the subject's
 * own tile. Exported for the solver, like allowsWay, which takes one
 * put-down per tile it lands on.
 * @param draft - The state, a step's draft or a settled state, carrying a box
 * @param x - Column of the subject's tile
 * @param y - Row of the subject's tile
 * @param facing - The way the subject faces
 * @returns The tile, or null when the box can't be put down
 */
export function putDownTile(draft: StateReader, x: number, y: number, facing: Direction): PositionData | null {
  if (!canTakeBoxAhead(draft, x, y, facing)) {
    return null
  }

  return {
    x: x + DELTAS[facing].dx,
    y: y + DELTAS[facing].dy,
  }
}

/**
 * Whether something on a tile takes the interact key, whatever way the
 * subject faces: an element there (a switch). Then the key acts there and
 * never on the tile faced. A box under the subject (one sent back to its
 * start there) doesn't count: boxes are picked up only from the tile faced.
 * Exported for the solver, like allowsWay, which takes such an interact
 * once rather than once per way.
 * @param draft - The state, a step's draft or a settled state
 * @param x - Column of the subject's tile
 * @param y - Row of the subject's tile
 * @returns True when something there takes it
 */
export function canInteractInPlace(draft: StateReader, x: number, y: number): boolean {
  return INTERACT_HOOKS.some((interactHook) => draft.chamber.elementAt(interactHook.kind, x, y) !== NO_ELEMENT)
}

/**
 * Whether the interact key may do anything on a tile, facing a way:
 * something there takes it (canInteractInPlace), or a box is carried, or a
 * box lies in reach on the tile faced (boxInReach). True doesn't promise a
 * change: a switch refuses while a box is carried, and a carried box can't
 * be put down where the tile faced can't take it. Exported for the solver,
 * like allowsWay, so it skips interacts that can't change anything.
 * @param draft - The state, a step's draft or a settled state
 * @param x - Column of the subject's tile
 * @param y - Row of the subject's tile
 * @param facing - The way the subject faces
 * @returns False when it can't change anything
 */
export function canInteract(draft: StateReader, x: number, y: number, facing: Direction): boolean {
  return canInteractInPlace(draft, x, y) || draft.isCarrying || (boxInReach(draft, x, y, facing) !== NO_BOX)
}

/**
 * The interact key, when it can do anything (canInteract): an element on
 * the subject's tile that takes it (a switch) does; otherwise a carried box
 * is put down on the tile faced, or refused when it can't take the box
 * (putDownTile); otherwise the box in reach on the tile faced is picked up.
 * @param draft - The step's state
 */
function interact(draft: StateDraft): void {
  const x = draft.subjectX
  const y = draft.subjectY

  if (!canInteract(draft, x, y, draft.facing)) {
    return
  }

  for (const interactHook of INTERACT_HOOKS) {
    for (let index = draft.chamber.elementAt(interactHook.kind, x, y); index !== NO_ELEMENT; index = draft.chamber.nextOnTile(interactHook.kind, index)) {
      if (interactHook.hook(draft, index)) {
        return
      }
    }
  }

  if (draft.isCarrying) {
    const tile = putDownTile(draft, x, y, draft.facing)

    if (tile === null) {
      draft.emit(GameEvent.REFUSED)
    } else {
      draft.moveBox(draft.carriedBox, tile.x, tile.y)
      draft.dropBox()
      draft.emit(GameEvent.BOX_PUT_DOWN)
    }

    return
  }

  const box = boxInReach(draft, x, y, draft.facing)

  if (box !== NO_BOX) {
    draft.carryBox(box)
    draft.emit(GameEvent.BOX_PICKED_UP)
  }
}

/**
 * Carries out an action.
 * @param draft - The step's state
 * @param action - The action
 * @returns Each tile a slide entered, NO_PATH when the action didn't slide, or null when a move's slide would loop, which refuses the whole move
 */
function runAction(draft: StateDraft, action: Action): readonly SlideLeg[] | null {
  const movement = MOVEMENTS[action]

  if (movement !== null) {
    return move(draft, movement)
  }

  switch (action) {
    case Action.BLUE:
      shoot(draft, PortalColor.BLUE)
      break

    case Action.ORANGE:
      shoot(draft, PortalColor.ORANGE)
      break

    case Action.INTERACT:
      interact(draft)
      break
  }

  return NO_PATH
}

/**
 * Runs the hooks of the elements on a tile the subject stands in (the
 * fizzler rule).
 * @param draft - The step's state
 * @param x - Column of the subject's tile
 * @param y - Row of the subject's tile
 */
function runSubjectInsideHooks(draft: StateDraft, x: number, y: number): void {
  for (const insideHook of SUBJECT_INSIDE_HOOKS) {
    for (let index = draft.chamber.elementAt(insideHook.kind, x, y); index !== NO_ELEMENT; index = draft.chamber.nextOnTile(insideHook.kind, index)) {
      insideHook.hook(draft, index)
    }
  }
}

/**
 * One pass of the repeat loop: the hooks of the elements on the subject's
 * tile (the fizzler rule), then every element's pass hook, type by type in
 * registry order and each type in list order (the buttons), then the boxes
 * lying where an element is blocked.
 * @param draft - The step's state
 */
function runPass(draft: StateDraft): void {
  runSubjectInsideHooks(draft, draft.subjectX, draft.subjectY)

  for (const passHook of EVERY_PASS_HOOKS) {
    const count = draft.chamber.countOf(passHook.kind)

    for (let index = 0; index < count; index++) {
      passHook.hook(draft, index)
    }
  }

  destroyBoxesOnBlockedTiles(draft)
}

/**
 * Runs passes until one changes nothing, then the exit check: a subject
 * standing on the exit completes the chamber.
 * @param draft - The step's state
 * @throws Error when a pass still changes the state after PASS_CAP passes
 */
function settle(draft: StateDraft): void {
  for (let pass = 0; pass < PASS_CAP; pass++) {
    const changes = draft.changes

    runPass(draft)

    if (draft.changes === changes) {
      if (draft.chamber.elementAt('exit', draft.subjectX, draft.subjectY) !== NO_ELEMENT) {
        draft.complete()
      }

      return
    }
  }

  throw new Error(`A step still changed the state after ${PASS_CAP} passes`)
}

/**
 * A chamber's start: the state its file describes, settled like the end of
 * a step, with no action before it.
 * @param chamber - The chamber
 * @returns The settled start and what settling reported
 * @throws Error when it doesn't settle within PASS_CAP passes
 */
export function startChamber(chamber: CompiledChamber): StepResult {
  const draft = new StateDraft(chamber, null)

  settle(draft)

  return {
    state: draft.toState(),
    events: draft.events,
    path: NO_PATH,
  }
}

/**
 * A move whose slide would loop through portals, refused whole: the state
 * before it, but for the subject facing the way pressed, as a refused
 * crossing leaves it, and only the refusal reported. Nothing settles, since
 * only the facing can have changed.
 * @param chamber - The chamber being played
 * @param state - The state before the step
 * @param direction - The way pressed
 * @returns The state, the same object when the subject already faced that way, and the refusal
 */
function refuseLoop(chamber: CompiledChamber, state: RulesState, direction: Direction): StepResult {
  const draft = new StateDraft(chamber, state)

  draft.face(direction)
  draft.emit(GameEvent.REFUSED)

  return {
    state: (draft.changes === 0) ? state : draft.toState(),
    events: draft.events,
    path: NO_PATH,
  }
}

/**
 * One step of the rules: the action, then the carried box follows the
 * subject, then the repeat loop and the exit check. A move whose slide would
 * loop through portals is refused whole (refuseLoop). Once the chamber is
 * completed, a step changes nothing.
 * @param chamber - The chamber being played
 * @param state - The state before the step, which is left unchanged
 * @param action - What the player does
 * @returns The state after the step, what happened, in order, and the tiles a slide entered
 * @throws Error when the state belongs to another chamber, or the step doesn't settle within PASS_CAP passes
 */
export function step(chamber: CompiledChamber, state: RulesState, action: Action): StepResult {
  if (state.completed) {
    if (state.chamber !== chamber) {
      throw new Error('The state belongs to another chamber')
    }

    return {
      state: state,
      events: [],
      path: NO_PATH,
    }
  }

  const draft = new StateDraft(chamber, state)
  const path = runAction(draft, action)

  if (path === null) {
    // Only a move slides, so the action is one and its way is never missing
    return refuseLoop(chamber, state, MOVEMENTS[action]?.direction ?? state.facing)
  }

  draft.carryBoxAlong()
  settle(draft)

  const next = (draft.changes === 0) ? state : draft.toState()

  return {
    // Changes can cancel out: a box picked up from the next tile while the
    // subject stands in a fizzler that is on goes straight back to its start
    state: ((next !== state) && (next.key === state.key)) ? state : next,
    events: draft.events,
    path: path,
  }
}
