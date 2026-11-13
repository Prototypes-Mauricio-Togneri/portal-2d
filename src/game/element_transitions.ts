import type {RulesState} from '@/game/rules/rules_state'

/**
 * The element types drawn changing over a short time when a step switches
 * them: doors and the exit slide open or shut, fizzlers crumble away or form
 * again, and lasers fade out or in.
 */
export type TransitionKind = 'door' | 'exit' | 'fizzler' | 'laser'

/**
 * How far blocked an element is drawn, from 0 (a door or the exit open, a
 * fizzler or a laser off) to 1 (shut, on), or null to draw it as the state
 * says.
 */
export type BlockedShares = (kind: TransitionKind, index: number) => number | null

/**
 * How one element type changes.
 */
type TransitionStyle = {
  readonly milliseconds: number // How long a whole change takes, in milliseconds
  readonly eased: boolean // Whether it eases out, quick at first, or goes at an even pace
}

/**
 * One element changing.
 */
type Transition = {
  readonly kind: TransitionKind // Its type
  readonly index: number // Its number among its type's elements
  readonly from: number // How far blocked it was drawn when the change started, from 0 to 1
  readonly to: number // How far blocked it ends: 0 or 1
  readonly startTime: number // When the change started, in milliseconds on the frame clock
  readonly duration: number // How long the change takes, in milliseconds
}

/** The element types that change over time, in the order they are looked through */
const TRANSITION_KINDS: readonly TransitionKind[] = [
  'door',
  'exit',
  'fizzler',
  'laser',
]

/** How each element type changes: a door or the exit slides, eased like a step's glide; a field crumbles at an even pace, its pieces each in their own time; a beam fades at an even pace */
const TRANSITION_STYLES: Readonly<Record<TransitionKind, TransitionStyle>> = {
  door: {
    milliseconds: 300,
    eased: true,
  },
  exit: {
    milliseconds: 300,
    eased: true,
  },
  fizzler: {
    milliseconds: 400,
    eased: false,
  },
  laser: {
    milliseconds: 250,
    eased: false,
  },
}

/**
 * The doors and the exit sliding open or shut, the fizzlers crumbling away
 * or forming again and the lasers fading out or in, over a short time after
 * a step switched them.
 * Purely visual: the rules have already switched them, and nothing waits
 * for a change, so a press never cuts one short. An element switched back
 * part way changes back from where it is drawn.
 */
export class ElementTransitions {
  private transitions: readonly Transition[] = [] // The changes running, empty when none is

  /**
   * Starts changing each door, exit, fizzler and laser that a step switched, from
   * where it is drawn now.
   * @param before - The state before the step
   * @param after - The state after the step
   * @param time - Now, in milliseconds on the frame clock
   */
  start(before: RulesState, after: RulesState, time: number): void {
    const started: Transition[] = []

    for (const kind of TRANSITION_KINDS) {
      for (let i = 0; i < after.chamber.countOf(kind); i++) {
        const blocked = after.isBlocked(kind, i)

        if (before.isBlocked(kind, i) === blocked) {
          continue
        }

        const to = blocked ? 1 : 0
        const from = this.blockedAt(kind, i, time) ?? (1 - to)

        started.push({
          kind: kind,
          index: i,
          from: from,
          to: to,
          startTime: time,
          duration: TRANSITION_STYLES[kind].milliseconds * Math.abs(to - from),
        })
      }
    }

    if (started.length > 0) {
      const replaced = (transition: Transition): boolean => started.some((newTransition) => (newTransition.kind === transition.kind) && (newTransition.index === transition.index))

      this.transitions = [
        ...this.transitions.filter((transition) => !replaced(transition) && (time - transition.startTime < transition.duration)),
        ...started,
      ]
    }
  }

  /**
   * Ends every change at once, so each element is drawn as the state says.
   */
  clear(): void {
    this.transitions = []
  }

  /**
   * Whether anything is still changing at a time. A change whose time has
   * reached its end is over.
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns True while a door, the exit, a fizzler or a laser is changing
   */
  isRunningAt(time: number): boolean {
    if (this.transitions.some((transition) => time - transition.startTime >= transition.duration)) {
      this.transitions = this.transitions.filter((transition) => time - transition.startTime < transition.duration)
    }

    return this.transitions.length > 0
  }

  /**
   * How far blocked an element is drawn at a time.
   * @param kind - Its type
   * @param index - Its number among its type's elements
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns From 0 (a door or the exit open, a fizzler or a laser off) to 1 (shut, on), or null when it isn't changing
   */
  blockedAt(kind: TransitionKind, index: number, time: number): number | null {
    const transition = this.transitions.find((running) => (running.kind === kind) && (running.index === index))

    if ((transition === undefined) || (transition.duration <= 0)) {
      return null
    }

    const linear = (time - transition.startTime) / transition.duration

    if (linear >= 1) {
      return null
    }

    const evenPace = Math.max(linear, 0)
    // Cubic ease-out, like a step's glide: quick at first, then settling
    const progress = TRANSITION_STYLES[kind].eased ? 1 - ((1 - evenPace) ** 3) : evenPace

    return transition.from + ((transition.to - transition.from) * progress)
  }
}
