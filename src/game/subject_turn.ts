import {type Direction, WAY_ANGLES} from '@/game/direction'
import type {RulesState} from '@/game/rules/rules_state'
import type {SubjectPose} from '@/game/subject_pose'

/**
 * A turn of the subject as drawn: from the angle it was drawn at when the
 * turn started to the way it faces now.
 */
type Turn = {
  readonly from: number // The angle it starts from, in radians clockwise on the canvas from facing up
  readonly turn: number // How far it turns, in radians clockwise on the canvas, up to a half turn either way
  readonly way: Direction // The way it ends facing
  readonly startTime: number // When it started, in milliseconds on the frame clock
  readonly duration: number // How long it takes to draw, in milliseconds
}

/** How long a quarter turn takes to draw, in milliseconds; a half turn takes half as long again, and a turn resumed part way less */
const QUARTER_TURN_MILLISECONDS = 100

/** A quarter turn, in radians */
const QUARTER_TURN = Math.PI / 2

/** A full turn, in radians */
const FULL_TURN = 2 * Math.PI

/** How far back a turn's drawing starts, in milliseconds: one frame at 60 Hz, as a step's does, so the frame that takes the press already shows part of it */
const FIRST_FRAME_LEAD_MILLISECONDS = 1000 / 60

/**
 * The shorter turn from one angle to another, a half turn going clockwise.
 * @param from - The angle turned from, in radians
 * @param to - The angle turned to, in radians
 * @returns The turn, in radians clockwise on the canvas, from just over minus a half turn up to a half turn
 */
function shorterTurn(from: number, to: number): number {
  const clockwise = (((to - from) % FULL_TURN) + FULL_TURN) % FULL_TURN

  return (clockwise > Math.PI) ? clockwise - FULL_TURN : clockwise
}

/**
 * The subject's facing as drawn, turning on a clock of its own: whenever its
 * pose comes to face another way, it turns there from the angle it is drawn
 * at, the shorter way round (a half turn clockwise), over
 * QUARTER_TURN_MILLISECONDS a quarter turn, eased out. Purely visual: the
 * rules have already turned it, and nothing waits for it. A press doesn't
 * cut a turn short, so turns keep flowing through quick presses: the next
 * one carries on from the angle drawn. Through a portal it faces its new way
 * at once, since it came out elsewhere rather than turning.
 */
export class SubjectTurn {
  private latestTurn: Turn | null = null // The latest turn, kept once over for the way it ends facing; null until a frame follows the pose after a load
  private followedState: RulesState | null = null // The state the latest frame drew
  private followedPortalsAhead = 0 // The portals the subject still had to pass through in the latest frame

  /**
   * Forgets every turn, so the next frame draws the subject squarely the way
   * its pose faces.
   */
  clear(): void {
    this.latestTurn = null
    this.followedState = null
    this.followedPortalsAhead = 0
  }

  /**
   * How far the subject is turned in a frame, following the way its pose
   * faces. A pose facing another way than the latest turn's starts a turn
   * there, from the angle drawn now. A pose that has come out of a portal
   * since the latest frame, or follows a step that ended or was replaced
   * before the subject came out of a portal it was passing through, faces its
   * way at once.
   * @param state - The state drawn
   * @param pose - Where the subject is drawn, from subjectPose()
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns The angle, in radians clockwise on the canvas from facing up, while it turns, or null when it faces the pose's way squarely
   */
  angleFor(state: RulesState, pose: SubjectPose, time: number): number | null {
    const cameThrough = (pose.portalsAhead < this.followedPortalsAhead) || ((state !== this.followedState) && (this.followedPortalsAhead > 0))
    const latest = this.latestTurn

    this.followedState = state
    this.followedPortalsAhead = pose.portalsAhead

    if ((latest === null) || cameThrough) {
      this.latestTurn = SubjectTurn.still(pose.facing, time)

      return null
    }

    let current = latest

    if (latest.way !== pose.facing) {
      // Started a frame back, from where the subject was drawn a frame back,
      // so a turn interrupting another doesn't show two frames' turning at once;
      // from a turn already over, at its way's exact angle, so the angle never
      // winds up past a full turn, whose rounding could send a half turn
      // anticlockwise
      const startTime = time - FIRST_FRAME_LEAD_MILLISECONDS
      const from = SubjectTurn.isRunning(latest, startTime) ? SubjectTurn.angleOf(latest, startTime) : WAY_ANGLES[latest.way]
      const turn = shorterTurn(from, WAY_ANGLES[pose.facing])

      current = {
        from: from,
        turn: turn,
        way: pose.facing,
        startTime: startTime,
        duration: QUARTER_TURN_MILLISECONDS * (0.5 + (0.5 * Math.abs(turn) / QUARTER_TURN)),
      }
      this.latestTurn = current
    }

    return SubjectTurn.isRunning(current, time) ? SubjectTurn.angleOf(current, time) : null
  }

  /**
   * Whether the subject is still turning at a time.
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns True while a turn is left to draw
   */
  isRunningAt(time: number): boolean {
    return (this.latestTurn !== null) && SubjectTurn.isRunning(this.latestTurn, time)
  }

  /**
   * A turn already over, facing a way squarely.
   * @param way - The way faced
   * @param time - Now, in milliseconds on the frame clock
   * @returns The turn
   */
  private static still(way: Direction, time: number): Turn {
    return {
      from: WAY_ANGLES[way],
      turn: 0,
      way: way,
      startTime: time,
      duration: 0,
    }
  }

  /**
   * Whether a turn is still being drawn at a time.
   * @param turn - The turn
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns True until the time reaches its end
   */
  private static isRunning(turn: Turn, time: number): boolean {
    return (time - turn.startTime) < turn.duration
  }

  /**
   * The angle drawn part way through a turn, eased out: quick at first,
   * settling gently into its new way, so most of it shows right after the
   * key.
   * @param turn - The turn
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns The angle, in radians clockwise on the canvas from facing up
   */
  private static angleOf(turn: Turn, time: number): number {
    const linear = (turn.duration > 0) ? Math.min(Math.max((time - turn.startTime) / turn.duration, 0), 1) : 1

    // Cubic ease-out
    return turn.from + (turn.turn * (1 - ((1 - linear) ** 3)))
  }
}
