import type {GameEvent} from '@/game/game_event'
import type {DrawLayer} from '@/game/rules/draw_layer'
import type {StateDraft} from '@/game/rules/state_draft'

/**
 * How many of an element a chamber file holds: one required entry, or a list
 * that may be left out.
 */
export type ElementCount = 'one' | 'many'

/**
 * Which tiles an element can sit on.
 */
export type ElementGround = 'floor' | 'wall' | 'floorOrWall'

/**
 * When an element keeps the subject from stepping onto its tile:
 * alongDirection means always, except while moving the element's way, and
 * while on its tile only that way acts (an arrow).
 */
export type WalkBlocking = 'never' | 'whenBlocked' | 'always' | 'alongDirection'

/**
 * When an element stops a portal shot on its tile.
 */
export type ShotBlocking = 'never' | 'whenBlocked' | 'always'

/**
 * When standing on an element's tile keeps the portal keys from shooting at
 * all, without a sound.
 */
export type ShootingFromBlocking = 'never' | 'whenBlocked'

/**
 * What an element does in a step of the v2 rules, beyond what its fixed data
 * says. Each hook gets the draft of the step's state and the element's index
 * in its type's list. A step runs them in this order: the action (interact
 * reaches the element on the subject's tile), then, in every pass of the
 * repeat loop, first subjectInside for the elements on the subject's tile,
 * then everyPass for every element, type by type in registry order; links
 * run linkUnblocked or linkBlocked on their targets whenever a button or
 * switch acts.
 */
export type ElementHooks = {
  readonly interact?: (draft: StateDraft, index: number) => boolean // The interact key on its tile; true when it took the key, so nothing else does (a switch)
  readonly subjectInside?: (draft: StateDraft, index: number) => void // Each pass, while the subject stands on its tile (a fizzler's rule)
  readonly everyPass?: (draft: StateDraft, index: number) => void // Each pass, in list order (a button judging whether it is held down)
  readonly linkUnblocked?: (draft: StateDraft, index: number) => void // A link unblocks it: a button goes down or a switch is used
  readonly linkBlocked?: (draft: StateDraft, index: number) => void // A link blocks it: a button comes up
}

// Never exists at runtime: only its type is used, as the key that carries a
// definition's entry type
declare const entryType: unique symbol

/**
 * What an element type is: as fixed data, where it sits in a chamber file,
 * what it blocks, whether links reach it, what it reports and where it is
 * drawn; and its hooks, what it does in a step beyond that. How it is drawn
 * stays with the browser-side renderer, looked up by kind.
 */
export type ElementDefinition<Entry = unknown> = {
  readonly kind: string // Its name, such as 'barrier'
  readonly fileKey: string // Its field in a chamber file
  readonly count: ElementCount // One required entry, or a list that may be left out
  readonly sitsOn: ElementGround // Which tiles it can sit on
  readonly layer: DrawLayer // Where it is drawn
  readonly linkable: boolean // Whether a button or switch link can name it
  readonly defaultBlocked: boolean | null // Its blocked flag when the file leaves it out, or null when it has none
  readonly blocksWalking: WalkBlocking // When it keeps the subject off its tile
  readonly blocksShots: ShotBlocking // When it stops a portal shot on its tile
  readonly stopsShootingFrom: ShootingFromBlocking // When standing on it keeps the portal keys from shooting
  readonly takesPortals: boolean // Whether a portal can open on it; a wall entry can refuse them
  readonly reactsToSubject: boolean // Whether entering or leaving its tile can change the state
  readonly events: readonly GameEvent[] // The events it reports
  readonly hooks?: ElementHooks // What it does in a step beyond its fixed data; absent when the core step does it all
  readonly [entryType]?: Entry // Never set: carries the type of its entries in a chamber file
}

/**
 * The type of an element's entries in a chamber file.
 */
export type ElementEntry<Definition extends ElementDefinition> = Exclude<Definition[typeof entryType], undefined>

/**
 * Takes an element definition and returns it with its literal values kept
 * and its entry type attached.
 */
export type ElementDefiner<Entry> = <const Definition extends ElementDefinition<Entry>>(definition: Definition) => Definition & ElementDefinition<Entry>

/**
 * Starts an element definition whose entries in a chamber file have the given
 * type. It takes two calls so that the entry type can be named while every
 * other value is inferred as written.
 * @returns A function that takes the definition and returns it, typed
 */
export function defineElement<Entry>(): ElementDefiner<Entry> {
  return (definition) => definition
}
