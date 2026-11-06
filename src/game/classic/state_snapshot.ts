import type {Direction} from '@/game/direction'
import type {Portal} from '@/game/classic/portal'
import type {State} from '@/game/classic/state'
import {formatHash, hashText} from '@/game/text_hash'

/**
 * The subject's tile, facing and carried box.
 */
export type SubjectSnapshot = {
  readonly x: number // Column
  readonly y: number // Row
  readonly direction: Direction // Which way it faces
  readonly box: number | null // Index of the carried box in the chamber's boxes, null when empty-handed
}

/**
 * An open portal: the wall tile it is on and the side it opens to.
 */
export type PortalSnapshot = {
  readonly x: number // Column of the wall
  readonly y: number // Row of the wall
  readonly direction: Direction // Side of the wall it opens to
}

/**
 * A box's tile.
 */
export type BoxSnapshot = {
  readonly x: number // Column
  readonly y: number // Row
}

/**
 * Every value of the classic rules' state that changes during play, as plain
 * data. Lists follow the chamber's element order, so two snapshots of the
 * same chamber line up entry by entry.
 */
export type StateSnapshot = {
  readonly subject: SubjectSnapshot // The subject
  readonly bluePortal: PortalSnapshot | null // Null when closed
  readonly orangePortal: PortalSnapshot | null // Null when closed
  readonly boxes: readonly BoxSnapshot[] // Each box's tile
  readonly buttons: readonly boolean[] // Whether each button is held down
  readonly barriers: readonly boolean[] // Whether each barrier is up
  readonly ditches: readonly boolean[] // Whether each ditch is open
  readonly doors: readonly boolean[] // Whether each door is closed
  readonly fizzlers: readonly boolean[] // Whether each fizzler is on
  readonly lasers: readonly boolean[] // Whether each laser is on
  readonly exit: boolean // Whether the exit is closed
  readonly insideFizzler: boolean // Whether the subject has entered an active fizzler and not yet left every fizzler
  readonly chamberCompleted: boolean // Whether the subject has reached the exit
}

/**
 * Reads every value of the state that changes during play. The state is
 * left untouched.
 * @param state - The rules playing a chamber
 * @returns The values, always in the same order
 */
export function takeSnapshot(state: State): StateSnapshot {
  const chamber = state.chamber
  const subject = state.subject

  // Built as one literal so the keys, and so the text form, keep this order
  return {
    subject: {
      x: subject.x,
      y: subject.y,
      direction: subject.direction,
      box: (subject.box !== null) ? chamber.boxes.indexOf(subject.box) : null,
    },
    bluePortal: getPortalSnapshot(state.gateway.blue),
    orangePortal: getPortalSnapshot(state.gateway.orange),
    boxes: chamber.boxes.map((box) => ({
      x: box.x,
      y: box.y,
    })),
    buttons: chamber.buttons.map((button) => button.activated),
    barriers: chamber.barriers.map((barrier) => barrier.blocked),
    ditches: chamber.ditches.map((ditch) => ditch.blocked),
    doors: chamber.doors.map((door) => door.blocked),
    fizzlers: chamber.fizzlers.map((fizzler) => fizzler.blocked),
    lasers: chamber.lasers.map((laser) => laser.blocked),
    exit: chamber.exit.blocked,
    insideFizzler: state.insideFizzler,
    chamberCompleted: state.chamberCompleted,
  }
}

/**
 * Reads where a portal is.
 * @param portal - One end of the gateway
 * @returns Its tile and side, or null when it is closed
 */
function getPortalSnapshot(portal: Portal): PortalSnapshot | null {
  // An open portal always has a direction, so only a closed one gives null
  if ((!portal.activated) || (portal.direction === null)) {
    return null
  }

  return {
    x: portal.x,
    y: portal.y,
    direction: portal.direction,
  }
}

/**
 * The snapshot as text: equal snapshots give equal text. Only snapshots from
 * takeSnapshot qualify, since the text follows their key order.
 * @param snapshot - A snapshot from takeSnapshot
 * @returns The snapshot as JSON
 */
export function getSnapshotText(snapshot: StateSnapshot): string {
  return JSON.stringify(snapshot)
}

/**
 * The 32-bit FNV-1a hash of the snapshot's text form, over its UTF-8 bytes.
 * @param snapshot - A snapshot from takeSnapshot
 * @returns The hash, as an unsigned 32-bit integer
 */
export function getSnapshotHash(snapshot: StateSnapshot): number {
  return hashText(getSnapshotText(snapshot))
}

/**
 * The hash of the state as it is now, written the way replays and the engine
 * scripts show it.
 * @param state - The rules playing a chamber
 * @returns Eight hexadecimal digits
 */
export function getStateHash(state: State): string {
  return formatHash(getSnapshotHash(takeSnapshot(state)))
}
