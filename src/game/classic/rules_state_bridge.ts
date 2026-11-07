import type {BoxSnapshot, PortalSnapshot, StateSnapshot} from '@/game/classic/state_snapshot'
import type {FrameInput, FrameKey} from '@/game/frame_input'
import {GameKey} from '@/game/game_key'
import {Action} from '@/game/rules/action'
import type {CompiledChamber} from '@/game/rules/compiled_chamber'
import type {BlockableKind} from '@/game/rules/element_registry'
import {PortalColor} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {StateDraft} from '@/game/rules/state_draft'
import {NO_BOX, NOT_STORED} from '@/game/rules/state_layout'

// Translates between today's snapshots and states of the v2 rules, and from
// an action of the v2 rules to the key frame today's rules read, for the
// engine comparison and the renderer comparison while both rules exist
// (stage 01). Deleted with today's rules

/**
 * Everything both rules hold: today's snapshot without its "inside a
 * fizzler" flag, which the v2 rules drop. Lists follow the chamber file's
 * element order.
 */
export type SharedSnapshot = Omit<StateSnapshot, 'insideFizzler'>

/**
 * A key frame pressing one key.
 * @param key - The key pressed
 * @param turnHeld - Whether the turn key is held
 * @returns The frame's input
 */
function keyFrame(key: FrameKey, turnHeld: boolean): FrameInput {
  return {
    keys: [key],
    turnHeld: turnHeld,
  }
}

/** The key frame today's rules read for each action: its one key, with the turn key held for a turn */
const FRAME_INPUTS: Readonly<Record<Action, FrameInput>> = {
  [Action.UP]: keyFrame(GameKey.UP, false),
  [Action.DOWN]: keyFrame(GameKey.DOWN, false),
  [Action.LEFT]: keyFrame(GameKey.LEFT, false),
  [Action.RIGHT]: keyFrame(GameKey.RIGHT, false),
  [Action.TURN_UP]: keyFrame(GameKey.UP, true),
  [Action.TURN_DOWN]: keyFrame(GameKey.DOWN, true),
  [Action.TURN_LEFT]: keyFrame(GameKey.LEFT, true),
  [Action.TURN_RIGHT]: keyFrame(GameKey.RIGHT, true),
  [Action.BLUE]: keyFrame(GameKey.BLUE, false),
  [Action.ORANGE]: keyFrame(GameKey.ORANGE, false),
  [Action.INTERACT]: keyFrame(GameKey.INTERACT, false),
}

/**
 * The key frame today's rules read for an action of the v2 rules.
 * @param action - The action
 * @returns Its one key, with the turn key held for a turn
 */
export function toFrameInput(action: Action): FrameInput {
  return FRAME_INPUTS[action]
}

/**
 * Reads one portal of a v2 state as today's snapshot holds it.
 * @param state - The state
 * @param color - The portal
 * @returns Its wall and side, or null when it is closed
 */
function readPortal(state: RulesState, color: PortalColor): PortalSnapshot | null {
  const side = state.portalSide(color)

  if (side === null) {
    return null
  }

  return {
    x: state.portalX(color),
    y: state.portalY(color),
    direction: side,
  }
}

/**
 * Reads the blocked flag of every element of a type.
 * @param state - The state
 * @param kind - The element type
 * @returns One flag per element, in list order
 */
function readFlags(state: RulesState, kind: BlockableKind): boolean[] {
  const flags: boolean[] = []

  for (let i = 0; i < state.chamber.countOf(kind); i++) {
    flags.push(state.isBlocked(kind, i))
  }

  return flags
}

/**
 * Reads a v2 state as today's snapshot holds it, in the same key order, so
 * the two can be compared as text.
 * @param state - The state
 * @returns What both rules hold
 */
export function readSharedSnapshot(state: RulesState): SharedSnapshot {
  const layout = state.chamber.stateLayout
  const boxes: BoxSnapshot[] = []
  const buttons: boolean[] = []

  for (let i = 0; i < layout.boxCount; i++) {
    boxes.push({
      x: state.boxX(i),
      y: state.boxY(i),
    })
  }

  for (let i = 0; i < layout.buttonCount; i++) {
    buttons.push(state.isButtonPressed(i))
  }

  return {
    subject: {
      x: state.subjectX,
      y: state.subjectY,
      direction: state.facing,
      box: (state.carriedBox === NO_BOX) ? null : state.carriedBox,
    },
    bluePortal: readPortal(state, PortalColor.BLUE),
    orangePortal: readPortal(state, PortalColor.ORANGE),
    boxes: boxes,
    buttons: buttons,
    barriers: readFlags(state, 'barrier'),
    ditches: readFlags(state, 'ditch'),
    doors: readFlags(state, 'door'),
    fizzlers: readFlags(state, 'fizzler'),
    lasers: readFlags(state, 'laser'),
    exit: state.isBlocked('exit', 0),
    chamberCompleted: state.completed,
  }
}

/**
 * Writes one portal into a draft.
 * @param draft - The state being built
 * @param color - The portal
 * @param portal - Its wall and side, or null when it is closed
 */
function writePortal(draft: StateDraft, color: PortalColor, portal: PortalSnapshot | null): void {
  if (portal === null) {
    draft.closePortal(color)
  } else {
    draft.openPortal(color, portal.x, portal.y, portal.direction)
  }
}

/**
 * Writes the blocked flags of every element of a type into a draft.
 * @param draft - The state being built
 * @param kind - The element type
 * @param flags - One flag per element, in list order
 * @throws Error when an element no link reaches has another flag than its file sets
 */
function writeFlags(draft: StateDraft, kind: BlockableKind, flags: readonly boolean[]): void {
  flags.forEach((blocked, index) => {
    if (draft.chamber.stateLayout.flagOffset(kind, index) !== NOT_STORED) {
      draft.setBlocked(kind, index, blocked)
    } else if (blocked !== draft.chamber.stateLayout.isBlockedAtStart(kind, index)) {
      throw new Error(`${kind} ${index} is linked by nothing, yet its blocked flag changed`)
    }
  })
}

/**
 * Builds a v2 state holding what a snapshot of today's rules holds.
 * @param chamber - The chamber the snapshot was taken on, compiled for the v2 rules
 * @param snapshot - What both rules hold
 * @returns The state
 * @throws Error when the snapshot doesn't fit the chamber
 */
export function createRulesState(chamber: CompiledChamber, snapshot: SharedSnapshot): RulesState {
  const draft = new StateDraft(chamber, null)

  draft.moveSubject(snapshot.subject.x, snapshot.subject.y)
  draft.face(snapshot.subject.direction)
  draft.dropBox()

  if (snapshot.subject.box !== null) {
    draft.carryBox(snapshot.subject.box)
  }

  writePortal(draft, PortalColor.BLUE, snapshot.bluePortal)
  writePortal(draft, PortalColor.ORANGE, snapshot.orangePortal)

  snapshot.boxes.forEach((box, index) => {
    draft.moveBox(index, box.x, box.y)
  })

  snapshot.buttons.forEach((pressed, index) => {
    draft.setButtonPressed(index, pressed)
  })

  writeFlags(draft, 'barrier', snapshot.barriers)
  writeFlags(draft, 'ditch', snapshot.ditches)
  writeFlags(draft, 'door', snapshot.doors)
  writeFlags(draft, 'fizzler', snapshot.fizzlers)
  writeFlags(draft, 'laser', snapshot.lasers)
  writeFlags(draft, 'exit', [snapshot.exit])

  if (snapshot.chamberCompleted) {
    draft.complete()
  }

  return draft.toState()
}
