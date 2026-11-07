import type {GameEvent} from '@/game/game_event'
import type {DrawLayer} from '@/game/rules/draw_layer'

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

// Never exists at runtime: only its type is used, as the key that carries a
// definition's entry type
declare const entryType: unique symbol

/**
 * What an element type is, as fixed data: where it sits in a chamber file,
 * what it blocks, whether links reach it, what it reports and where it is
 * drawn. What it does in a step (its hooks) arrives with the step (stage 01,
 * E8); how it is drawn stays with the renderer, looked up by kind (E10).
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
