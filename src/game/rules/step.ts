import {Direction} from '@/game/direction'
import {GameEvent} from '@/game/game_event'
import {Action, MOVEMENTS, type Movement} from '@/game/rules/action'
import {type CompiledChamber, NO_ELEMENT, type PlacedKind} from '@/game/rules/compiled_chamber'
import type {ElementDefinition, ElementHooks} from '@/game/rules/element_definition'
import {type BlockableKind, ELEMENT_REGISTRY, isBlockableElement, type RegisteredElement} from '@/game/rules/element_registry'
import {PORTAL_COLORS, PortalColor} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {StateDraft} from '@/game/rules/state_draft'
import {NO_BOX} from '@/game/rules/state_layout'

// The rules as a pure step, as docs/elements.md writes them under "Rules":
// an action, then the carried box follows, then passes of the fizzler rule
// and the buttons until one changes nothing, then the exit check. What
// blocks walking and shots is read from the element definitions, and what an
// element does beyond that from its hooks

/**
 * What a step gives: the state after it and what happened in it.
 */
export type StepResult = {
  readonly state: RulesState // The state after the step; the same object when nothing changed
  readonly events: readonly GameEvent[] // What happened, in order
}

/**
 * A hook of one element type, with the type.
 */
type KindHook<Hook> = {
  readonly kind: PlacedKind // The element type
  readonly hook: Hook // Its hook
}

/**
 * A column and row step.
 */
type Delta = {
  readonly dx: number // Column step
  readonly dy: number // Row step
}

/**
 * An element type found by tile.
 */
type PlacedElement = Extract<RegisteredElement, {readonly kind: PlacedKind}>

/** The most passes of the repeat loop a step may need; one more is a mistake in the rules, reported as an error */
export const PASS_CAP = 32

/** The step one tile each way takes */
const DELTAS: Readonly<Record<Direction, Delta>> = {
  [Direction.UP]: {
    dx: 0,
    dy: 1,
  },
  [Direction.DOWN]: {
    dx: 0,
    dy: -1,
  },
  [Direction.LEFT]: {
    dx: -1,
    dy: 0,
  },
  [Direction.RIGHT]: {
    dx: 1,
    dy: 0,
  },
}

/** The way opposite each way */
const OPPOSITES: Readonly<Record<Direction, Direction>> = {
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

/** The element types with a blocked flag, in registry order */
const BLOCKABLE_ELEMENTS = ELEMENT_REGISTRY.filter(isBlockableElement)

/** Types that keep the subject off their tile while blocked */
const WALK_BLOCKED_WHEN_BLOCKED: readonly BlockableKind[] = BLOCKABLE_ELEMENTS
  .filter((definition: ElementDefinition) => definition.blocksWalking === 'whenBlocked')
  .map((definition) => definition.kind)

/** Types that always keep the subject off their tile */
const WALK_BLOCKED_ALWAYS: readonly PlacedKind[] = PLACED_ELEMENTS
  .filter((definition: ElementDefinition) => definition.blocksWalking === 'always')
  .map((definition) => definition.kind)

/** Types entered only moving their way, from which only their way acts (arrows) */
const ONE_WAY: readonly PlacedKind[] = PLACED_ELEMENTS
  .filter((definition: ElementDefinition) => definition.blocksWalking === 'alongDirection')
  .map((definition) => definition.kind)

/** Types that stop a shot on their tile while blocked */
const SHOT_BLOCKED_WHEN_BLOCKED: readonly BlockableKind[] = BLOCKABLE_ELEMENTS
  .filter((definition: ElementDefinition) => definition.blocksShots === 'whenBlocked')
  .map((definition) => definition.kind)

/** Types that always stop a shot on their tile */
const SHOT_BLOCKED_ALWAYS: readonly PlacedKind[] = PLACED_ELEMENTS
  .filter((definition: ElementDefinition) => definition.blocksShots === 'always')
  .map((definition) => definition.kind)

/** Types that keep the portal keys from shooting while the subject stands on them blocked (fizzlers) */
const SHOOTING_STOPPED_WHEN_BLOCKED: readonly BlockableKind[] = BLOCKABLE_ELEMENTS
  .filter((definition: ElementDefinition) => definition.stopsShootingFrom === 'whenBlocked')
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
 * (an arrow) allows only its own way, both into it and out of it.
 * @param draft - The step's state
 * @param x - Column
 * @param y - Row
 * @param direction - The way the subject moves
 * @returns True when nothing on the tile points another way
 */
function allowsWay(draft: StateDraft, x: number, y: number, direction: Direction): boolean {
  for (const kind of ONE_WAY) {
    for (let index = draft.chamber.elementAt(kind, x, y); index !== NO_ELEMENT; index = draft.chamber.nextOnTile(kind, index)) {
      if (draft.chamber.directionOf(kind, index) !== direction) {
        return false
      }
    }
  }

  return true
}

/**
 * Whether the subject can step onto a tile, moving or coming out of a portal
 * a way: not a wall, nor outside the chamber, nor a tile something blocks.
 * @param draft - The step's state
 * @param x - Column
 * @param y - Row
 * @param direction - The way the subject moves onto it
 * @returns True when it can
 */
function canEnter(draft: StateDraft, x: number, y: number, direction: Direction): boolean {
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
 * Walks into a wall: if both portals are open and this wall holds one of
 * them on the side facing the subject, the subject comes out in front of the
 * other, facing away from its wall, when it can enter that tile; otherwise
 * the crossing is refused and the subject stays.
 * @param draft - The step's state
 * @param wallX - Column of the wall
 * @param wallY - Row of the wall
 * @param direction - The way the subject walks
 */
function crossPortal(draft: StateDraft, wallX: number, wallY: number, direction: Direction): void {
  if ((!draft.isPortalOpen(PortalColor.BLUE)) || (!draft.isPortalOpen(PortalColor.ORANGE))) {
    return
  }

  const facingSide = OPPOSITES[direction]
  const entrance = PORTAL_COLORS.find((color) => (draft.portalX(color) === wallX) && (draft.portalY(color) === wallY) && (draft.portalSide(color) === facingSide))

  if (entrance === undefined) {
    return
  }

  const exit = (entrance === PortalColor.BLUE) ? PortalColor.ORANGE : PortalColor.BLUE
  const exitSide = draft.portalSide(exit)

  // Both portals are open, so this never returns
  if (exitSide === null) {
    return
  }

  const delta = DELTAS[exitSide]
  const x = draft.portalX(exit) + delta.dx
  const y = draft.portalY(exit) + delta.dy

  if (canEnter(draft, x, y, exitSide)) {
    draft.moveSubject(x, y)
    draft.face(exitSide)
    draft.emit(GameEvent.CROSSED)
  } else {
    draft.emit(GameEvent.REFUSED)
  }
}

/**
 * Moves or turns: on a one-way tile only its way acts. The subject faces
 * the way first; a turn stops there unless it already faced that way. Then
 * it steps onto the next tile if it can enter it, or crosses a portal on a
 * wall there.
 * @param draft - The step's state
 * @param movement - The way, and whether it is a turn
 */
function move(draft: StateDraft, movement: Movement): void {
  const x = draft.subjectX
  const y = draft.subjectY
  const direction = movement.direction

  if (!allowsWay(draft, x, y, direction)) {
    return
  }

  const turnOnly = movement.turn && (draft.facing !== direction)

  draft.face(direction)

  if (turnOnly) {
    return
  }

  const targetX = x + DELTAS[direction].dx
  const targetY = y + DELTAS[direction].dy

  if (draft.chamber.isWall(targetX, targetY)) {
    crossPortal(draft, targetX, targetY, direction)
  } else if (canEnter(draft, targetX, targetY, direction)) {
    draft.moveSubject(targetX, targetY)
  }
}

/**
 * Whether something on a tile stops a shot.
 * @param draft - The step's state
 * @param x - Column
 * @param y - Row
 * @returns True when it does
 */
function stopsShot(draft: StateDraft, x: number, y: number): boolean {
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
 * Shoots a portal the way the subject faces, unless it stands somewhere
 * that keeps it from shooting (a fizzler that is on), which does nothing,
 * silently. The shot goes on tile by tile until something stops it, a miss,
 * or it reaches a wall: a wall that takes portals and has room on its side
 * facing the shot opens the portal there; any other wall, outside the
 * chamber included, is a miss.
 * @param draft - The step's state
 * @param color - The portal shot
 */
function shoot(draft: StateDraft, color: PortalColor): void {
  let x = draft.subjectX
  let y = draft.subjectY

  for (const kind of SHOOTING_STOPPED_WHEN_BLOCKED) {
    if (draft.isBlockedAt(kind, x, y)) {
      return
    }
  }

  const direction = draft.facing
  const delta = DELTAS[direction]

  // Outside the chamber is wall, so every shot ends
  for (;;) {
    x += delta.dx
    y += delta.dy

    if (stopsShot(draft, x, y)) {
      break
    }

    if (draft.chamber.isWall(x, y)) {
      if (draft.chamber.takesPortals(x, y) && hasRoomForPortal(draft, x, y, direction)) {
        draft.openPortal(color, x, y, OPPOSITES[direction])
        draft.emit(PORTAL_OPENED[color])

        return
      }

      break
    }
  }

  draft.emit(GameEvent.REFUSED)
}

/**
 * The interact key: an element on the subject's tile that takes it (a
 * switch) does; otherwise a carried box is put down, or else the first box
 * on the tile is picked up.
 * @param draft - The step's state
 */
function interact(draft: StateDraft): void {
  const x = draft.subjectX
  const y = draft.subjectY

  for (const interactHook of INTERACT_HOOKS) {
    for (let index = draft.chamber.elementAt(interactHook.kind, x, y); index !== NO_ELEMENT; index = draft.chamber.nextOnTile(interactHook.kind, index)) {
      if (interactHook.hook(draft, index)) {
        return
      }
    }
  }

  if (draft.isCarrying) {
    draft.dropBox()

    return
  }

  const box = draft.firstBoxAt(x, y)

  if (box !== NO_BOX) {
    draft.carryBox(box)
    draft.emit(GameEvent.BOX_PICKED_UP)
  }
}

/**
 * Carries out an action.
 * @param draft - The step's state
 * @param action - The action
 */
function runAction(draft: StateDraft, action: Action): void {
  const movement = MOVEMENTS[action]

  if (movement !== null) {
    move(draft, movement)

    return
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
}

/**
 * One pass of the repeat loop: the hooks of the elements on the subject's
 * tile (the fizzler rule), then every element's pass hook, type by type in
 * registry order and each type in list order (the buttons).
 * @param draft - The step's state
 */
function runPass(draft: StateDraft): void {
  const x = draft.subjectX
  const y = draft.subjectY

  for (const insideHook of SUBJECT_INSIDE_HOOKS) {
    for (let index = draft.chamber.elementAt(insideHook.kind, x, y); index !== NO_ELEMENT; index = draft.chamber.nextOnTile(insideHook.kind, index)) {
      insideHook.hook(draft, index)
    }
  }

  for (const passHook of EVERY_PASS_HOOKS) {
    const count = draft.chamber.countOf(passHook.kind)

    for (let index = 0; index < count; index++) {
      passHook.hook(draft, index)
    }
  }
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
  }
}

/**
 * One step of the rules: the action, then the carried box follows the
 * subject, then the repeat loop and the exit check. Once the chamber is
 * completed, a step changes nothing.
 * @param chamber - The chamber being played
 * @param state - The state before the step, which is left unchanged
 * @param action - What the player does
 * @returns The state after the step and what happened, in order
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
    }
  }

  const draft = new StateDraft(chamber, state)

  runAction(draft, action)
  draft.carryBoxAlong()
  settle(draft)

  return {
    state: (draft.changes === 0) ? state : draft.toState(),
    events: draft.events,
  }
}
