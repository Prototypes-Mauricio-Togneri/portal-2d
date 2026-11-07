import {GameEvent} from '@/game/game_event'
import type {ElementDefinition, ElementEntry} from '@/game/rules/element_definition'
import {ARROW_ELEMENT} from '@/game/rules/elements/arrow'
import {BARRIER_ELEMENT} from '@/game/rules/elements/barrier'
import {BOX_ELEMENT} from '@/game/rules/elements/box'
import {BUTTON_ELEMENT} from '@/game/rules/elements/button'
import {DITCH_ELEMENT} from '@/game/rules/elements/ditch'
import {DOOR_ELEMENT} from '@/game/rules/elements/door'
import {EXIT_ELEMENT} from '@/game/rules/elements/exit'
import {FIZZLER_ELEMENT} from '@/game/rules/elements/fizzler'
import {LASER_ELEMENT} from '@/game/rules/elements/laser'
import {SWITCH_ELEMENT} from '@/game/rules/elements/switch'
import {WALL_ELEMENT} from '@/game/rules/elements/wall'

/** Every element type a chamber can hold, in today's drawing order; the subject and the portals belong to the core step */
export const ELEMENT_REGISTRY = [
  ARROW_ELEMENT,
  WALL_ELEMENT,
  BARRIER_ELEMENT,
  DITCH_ELEMENT,
  LASER_ELEMENT,
  DOOR_ELEMENT,
  EXIT_ELEMENT,
  BUTTON_ELEMENT,
  SWITCH_ELEMENT,
  BOX_ELEMENT,
  FIZZLER_ELEMENT,
] as const satisfies readonly ElementDefinition[]

/** The events the core step reports itself rather than an element: portals opening, crossing a portal, and a refusal (a missed shot, a refused crossing, a switch used while carrying a box) */
export const CORE_STEP_EVENTS: readonly GameEvent[] = [
  GameEvent.BLUE_PORTAL_OPENED,
  GameEvent.ORANGE_PORTAL_OPENED,
  GameEvent.CROSSED,
  GameEvent.REFUSED,
]

/**
 * One of the element types in the registry.
 */
type RegisteredElement = (typeof ELEMENT_REGISTRY)[number]

/**
 * The name of an element type in the registry, such as 'barrier'.
 */
export type ElementKind = RegisteredElement['kind']

/**
 * A chamber file's element fields, from the registry: a required entry for
 * an element there is one of (the exit), and a list for every other one,
 * which may be left out when the chamber has none.
 */
export type ChamberElementFields = {
  readonly [Definition in RegisteredElement as Definition['count'] extends 'one' ? Definition['fileKey'] : never]: ElementEntry<Definition>
} & {
  readonly [Definition in RegisteredElement as Definition['count'] extends 'many' ? Definition['fileKey'] : never]?: readonly ElementEntry<Definition>[]
}
