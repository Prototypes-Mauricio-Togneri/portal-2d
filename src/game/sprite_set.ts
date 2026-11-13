/**
 * What a sprite's file holds: one tile, which may overhang it; a strip of
 * tiles that walls or ditches join from; or a glow, which always overhangs
 * and is drawn only when its file exists.
 */
export type SpriteShape = 'tile' | 'strip' | 'glow'

/** Side of a tile in a sprite's file, in pixels */
export const SPRITE_TILE_SIZE = 256

/** Margin around the tile of a sprite that overhangs it, on every side, in pixels */
export const SPRITE_OVERHANG = 64

/** Tiles side by side in a strip */
export const STRIP_TILES = 5

/**
 * Where each tile of a strip sits in it, counted from 0 at the left; for a
 * ditch, read wall as open ditch (`docs/sprites.md`, joins).
 */
export const STRIP_TILE = {
  lone: 0, // One wall tile with floor all round
  horizontalRun: 1, // Walls left and right, floor above and below
  verticalRun: 2, // Walls above and below, floor left and right
  innerCorners: 3, // Walls on all four sides, floor on all four diagonals
  solid: 4, // Wall all round
} as const

/**
 * Every chamber sprite (`docs/sprites.md`) by its name, which is also its
 * file's name in `src/assets/images/chamber/`, with its shape.
 */
export const SPRITE_SHAPES = {
  floor: 'tile',
  wall: 'strip',
  ditch: 'strip',
  ditch_bridged: 'tile',
  barrier_raised: 'tile',
  barrier_lowered: 'tile',
  door_closed: 'tile',
  door_open: 'tile',
  exit_closed: 'tile',
  exit_open: 'tile',
  button_up: 'tile',
  button_pressed: 'tile',
  switch: 'tile',
  box: 'tile',
  fizzler_on: 'tile',
  fizzler_off: 'tile',
  laser_on: 'tile',
  laser_off: 'tile',
  laser_glow: 'glow',
  arrow: 'tile',
  portal_blue: 'tile',
  portal_orange: 'tile',
  portal_blue_glow: 'glow',
  portal_orange_glow: 'glow',
  subject: 'tile',
} as const satisfies Readonly<Record<string, SpriteShape>>

/**
 * A chamber sprite, by name.
 */
export type SpriteName = keyof typeof SPRITE_SHAPES

/**
 * Whether a text names a chamber sprite.
 * @param text - The text, such as a file's name without its extension
 * @returns True when it is a sprite's name
 */
export function isSpriteName(text: string): text is SpriteName {
  return Object.keys(SPRITE_SHAPES).includes(text)
}
