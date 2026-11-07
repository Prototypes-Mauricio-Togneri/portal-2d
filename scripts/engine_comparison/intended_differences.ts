import type {SubjectSnapshot} from '@/game/classic/state_snapshot'
import {GameEvent} from '@/game/game_event'
import type {Action} from '@/game/rules/action'
import type {ChamberTiles} from '@scripts/engine_comparison/chamber_tiles'
import type {ComparedOutcome, ComparedView} from '@scripts/engine_comparison/compared_run'

// The differences between today's rules and v2 that docs/elements.md lists
// under "Changes from the original rules", each with a check that recognises
// its situation from today's side of a step. The comparison excuses a
// difference only when one of these checks recognises the step. Checks read
// today's side, which shows where the old rules went wrong; v2's own rules
// are checked by everything else the comparison compares

/**
 * One step as both engines played it.
 */
export type ComparedStep = {
  readonly tiles: ChamberTiles // What the chamber file puts on each tile
  readonly action: Action // The step's action
  readonly before: ComparedView // The state both engines started the step from
  readonly classic: ComparedOutcome // What today's rules did
  readonly v2: ComparedOutcome // What the v2 rules did
}

/**
 * A difference between today's rules and v2 that is intended.
 */
export type IntendedDifference = {
  readonly id: string // The id docs/elements.md lists it under
  readonly description: string // What changes, in plain words
  readonly recognise: ((step: ComparedStep) => boolean) | null // Whether a step is in its situation; null when it can only show in frame-by-frame replays, which stage 01's phase F adds
}

/** The error today's rules throw when a button releases a box it links */
const BOX_RELEASE_ERROR = /^Box \d+ cannot be deactivated$/

/**
 * Where today's rules put the subject when it came out of a portal. A step
 * has one action, and nothing moves the subject while the state settles, so
 * it is still there once the step has settled.
 * @param step - The step
 * @returns The subject after the step, or null when it crossed no portal
 */
function getCrossingLanding(step: ComparedStep): SubjectSnapshot | null {
  return step.classic.events.includes(GameEvent.CROSSED) ? step.classic.view.subject : null
}

/**
 * Today's rules put the subject, through a portal, on a tile it couldn't
 * walk onto: a blocked barrier, ditch, door or laser, or an arrow pointing
 * another way. The closed exit is recognised on its own.
 * @param step - The step
 * @returns Whether the step is in that situation
 */
function recognisePortalExitChecked(step: ComparedStep): boolean {
  const landing = getCrossingLanding(step)

  if ((landing === null) || step.tiles.isExit(landing.x, landing.y)) {
    return false
  }

  // The crossing comes first in the step, so the flags are those it started with
  const arrow = step.tiles.getArrow(landing.x, landing.y)

  return step.tiles.blocksWalking(step.before, landing.x, landing.y) || ((arrow !== null) && (arrow !== landing.direction))
}

/**
 * Today's rules put the subject, through a portal, on the closed exit.
 * @param step - The step
 * @returns Whether the step is in that situation
 */
function recogniseClosedExitByPortal(step: ComparedStep): boolean {
  const landing = getCrossingLanding(step)

  return (landing !== null) && step.tiles.isExit(landing.x, landing.y) && step.before.exit
}

/**
 * Today's rules threw because a button released a box it links.
 * @param step - The step
 * @returns Whether the step is in that situation
 */
function recogniseBoxLinkRelease(step: ComparedStep): boolean {
  return (step.classic.error !== null) && BOX_RELEASE_ERROR.test(step.classic.error)
}

/**
 * Today's rules left the subject standing in a fizzler that is on without
 * applying the fizzler rule, because the subject still counted as inside an
 * earlier field: a portal or a carried box survived, or it came in without
 * `fizzled`.
 * @param step - The step
 * @returns Whether the step is in that situation
 */
function recogniseFizzlerWithoutFlag(step: ComparedStep): boolean {
  if (step.classic.error !== null) {
    return false
  }

  const before = step.before.subject
  const after = step.classic.view

  if (!step.tiles.isActiveFizzler(after, after.subject.x, after.subject.y)) {
    return false
  }

  const keptSomething = (after.bluePortal !== null) || (after.orangePortal !== null) || (after.subject.box !== null)
  const enteredSilently = (!step.tiles.isActiveFizzler(step.before, before.x, before.y)) && (!step.classic.events.includes(GameEvent.FIZZLED))

  return keptSomething || enteredSilently
}

/**
 * A step where today's rules land an effect a frame late, which changes the
 * order of events and so can change the settled result: the subject carried
 * a box off a button (judged before the box follows), or came out of a
 * portal into a fizzler (which fires on the next frame). Keys pressed before
 * a late effect lands need frame-by-frame replays (phase F).
 * @param step - The step
 * @returns Whether the step is in that situation
 */
function recogniseNoLateEffects(step: ComparedStep): boolean {
  if (step.classic.error !== null) {
    return false
  }

  const before = step.before.subject
  const after = step.classic.view.subject
  const moved = (before.x !== after.x) || (before.y !== after.y)
  const carriedOffButton = (before.box !== null) && moved && step.tiles.hasButton(before.x, before.y)
  const crossedIntoField = step.classic.events.includes(GameEvent.CROSSED) && step.classic.events.includes(GameEvent.FIZZLED)

  return carriedOffButton || crossedIntoField
}

/**
 * A button that links the box the subject carries went down.
 * @param step - The step
 * @returns Whether the step is in that situation
 */
function recogniseCarriedBoxLink(step: ComparedStep): boolean {
  const box = step.before.subject.box

  if ((step.classic.error !== null) || (box === null)) {
    return false
  }

  return step.tiles.getButtonsLinking(box).some((index) => (step.before.buttons[index] !== true) && (step.classic.view.buttons[index] === true))
}

/**
 * Today's rules let the subject walk out of the chamber, or opened a portal
 * on a wall outside it.
 * @param step - The step
 * @returns Whether the step is in that situation
 */
function recogniseEdgeIsWall(step: ComparedStep): boolean {
  if (step.classic.error !== null) {
    return false
  }

  const after = step.classic.view
  const portals = [
    after.bluePortal,
    after.orangePortal,
  ]

  return (!step.tiles.isInside(after.subject.x, after.subject.y)) ||
    portals.some((portal) => (portal !== null) && (!step.tiles.isInside(portal.x, portal.y)))
}

/**
 * Today's rules put the subject on a tile where a laser other than the
 * first one there is on, since they only look at the first.
 * @param step - The step
 * @returns Whether the step is in that situation
 */
function recogniseEveryLaserBlocks(step: ComparedStep): boolean {
  if (step.classic.error !== null) {
    return false
  }

  const before = step.before.subject
  const after = step.classic.view.subject
  const moved = (before.x !== after.x) || (before.y !== after.y)

  // The move comes first in the step, so the flags are those it started with
  return moved && step.tiles.hasLaterLaserOn(step.before, after.x, after.y)
}

/** Every intended difference, in the order docs/elements.md lists them; the first that recognises a step names it */
export const INTENDED_DIFFERENCES: readonly IntendedDifference[] = [
  {
    id: 'portal_exit_checked',
    description: 'Coming out of a portal onto a tile the subject couldn\'t walk onto is refused',
    recognise: recognisePortalExitChecked,
  },
  {
    id: 'closed_exit_by_portal',
    description: 'Coming out of a portal onto the closed exit is refused instead of completing the chamber',
    recognise: recogniseClosedExitByPortal,
  },
  {
    id: 'box_link_release',
    description: 'Releasing a button linked to a box does nothing to the box instead of stopping the game',
    recognise: recogniseBoxLinkRelease,
  },
  {
    id: 'fizzler_without_flag',
    description: 'The fizzler rule runs every step, and nothing remembers having been inside a field',
    recognise: recogniseFizzlerWithoutFlag,
  },
  {
    id: 'no_late_effects',
    description: 'Everything a step causes happens within it, in the step\'s order',
    recognise: recogniseNoLateEffects,
  },
  {
    id: 'one_action_per_step',
    description: 'One action per step, instead of several keys in one frame',
    recognise: null,
  },
  {
    id: 'carried_box_link',
    description: 'A link to a carried box does nothing',
    recognise: recogniseCarriedBoxLink,
  },
  {
    id: 'edge_is_wall',
    description: 'Outside the chamber\'s edge is wall that takes no portals',
    recognise: recogniseEdgeIsWall,
  },
  {
    id: 'completed_is_final',
    description: 'Once the chamber is completed, a step changes nothing',
    recognise: null,
  },
  {
    id: 'every_laser_blocks',
    description: 'Two lasers crossing on a tile keep the subject out while either is on',
    recognise: recogniseEveryLaserBlocks,
  },
]

/**
 * Finds the intended difference that explains a step.
 * @param step - A step where the engines differ
 * @returns The first intended difference that recognises it, or null
 */
export function findIntendedDifference(step: ComparedStep): IntendedDifference | null {
  return INTENDED_DIFFERENCES.find((difference) => (difference.recognise !== null) && difference.recognise(step)) ?? null
}
