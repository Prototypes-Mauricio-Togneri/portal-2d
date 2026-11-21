import type {PositionData} from '@/game/chamber_data'
import {partPath, partRule, pitSides, type SpritePart} from '@/game/element_parts'
import {PALETTE, withAlpha} from '@/game/palette'
import type {CompiledChamber} from '@/game/rules/compiled_chamber'
import type {ElementKind} from '@/game/rules/element_registry'
import {keptImage, makeCanvas, type ScaledSprite, scaledSprite} from '@/game/sprite_scaling'
import {SPRITE_TILE_SIZE, type SpriteName, TILE_QUARTERS, type TileQuarter, quarterRect} from '@/game/sprite_set'
import {chamberSeed, cloudNoise, tileNumbers} from '@/game/surface_noise'
import {roomLightAt} from '@/game/surface_tone'

// The element detail (docs/sprites.md): each box, mirror box, button,
// switch, arrow, turnable arrow and ditch given a look of its own, drawn in
// code over its sprites, so no two read as one sprite stamped everywhere.
// Each takes the floor's room light where it stands (a box where it
// started, so it keeps one look wherever it goes), and most a shade of
// their own: lighter or darker, and some warmer or cooler; an open pit's
// sides are shaded in long soft stretches, and each grate has a band of
// bars rubbed paler and a scratch or two on its frame. Every look is laid
// only where the sprite already has pixels, so shapes and shadows stay as
// they are, and the parts that carry meaning (a dome's red or yellow, a
// mirror) are put back as drawn. Each look comes from the chamber's number,
// the instance's tile (a box's start tile) and a salt, so it is the same
// every time and at any size; its image is made once per tile size and kept
// with that size's sprites (sprite_scaling)

/**
 * One colour laid evenly over a part of some sprites.
 */
type LookFill = {
  readonly sprites: readonly SpriteName[] // The sprites it is laid over
  readonly part: SpritePart // Where on them
  readonly colour: string // Its colour and strength, as rgba()
}

/**
 * A scratch on a grate's frame, as drawn on its top side before it is turned.
 */
type GrateScratch = {
  readonly quarters: number // Quarter turns clockwise to the frame's side it lies on
  readonly x: number // Its middle across, in the sprite's frame
  readonly y: number // Its middle down, within the frame's top side
  readonly length: number // Its length, in the sprite's frame
  readonly tilt: number // How far it leans off the side's line, in radians
}

/**
 * The marks of a grate: a band of its bars rubbed paler, and its scratches.
 */
type GrateMarks = {
  readonly across: boolean // Whether the band runs across the grate, left to right, rather than up and down
  readonly middle: number // The band's middle, in the sprite's frame
  readonly half: number // Half the band's width, in the sprite's frame
  readonly scratches: readonly GrateScratch[] // The scratches on its frame
}

/**
 * Where the subject's box-holding sprite shows its box, so a carried box's
 * look is laid over the box in its hands.
 */
type HeldBox = {
  readonly ahead: number // How far ahead of the tile's middle the box's middle is, in tiles, as drawn facing up
  readonly size: number // The side of the box sprite drawn there, in tiles
}

/**
 * One instance's look: the colours laid over its sprites, and a grate's
 * marks.
 */
export type ElementLook = {
  readonly key: string // Sets the look apart from every other: its images are kept by it
  readonly fills: readonly LookFill[] // Laid over its sprites in order
  readonly grate: GrateMarks | null // A grate's marks, or null
  readonly held: HeldBox | null // Where it is laid over the subject's box-holding sprite, or null for a look of a box lying in the chamber
}

/**
 * What a chamber's looks are worked out from, once per chamber.
 */
type ChamberDetail = {
  readonly seed: number // The chamber's number, from chamberSeed()
  readonly looks: Map<string, ElementLook | null> // Each instance's look worked out so far, by type and index
}

/**
 * Works out one instance's look.
 * @param chamber - The chamber
 * @param index - Its index in the chamber's list of its type
 * @param seed - The chamber's number
 * @returns Its look, or null for none
 */
type LookMaker = (chamber: CompiledChamber, index: number, seed: number) => ElementLook | null

/** How dark an element is at the foot of a wall: the floor's darkening towards the walls, at the strength chosen for elements */
const ROOM_SHADE = 0.11

/** How far an element is lifted towards white in the open, away from every wall */
const ROOM_LIFT = 0.075

/** How strongly an instance a shade lighter is drawn, as a share of one a shade darker, since lightening shows more on these sprites */
const LIGHTER_SHARE = 0.8

/** How an instance's number is bent before it sets its shade: under 1, most instances land clearly off the middle */
const SPREAD_POWER = 0.7

/** A mirror box's plates: how far lighter or darker, and how far warmer or cooler, at most */
const MIRROR_SHADE = 0.14
const MIRROR_TINT = 0.07

/** A button's or a switch's plate and clamps: how far lighter or darker, and how far warmer or cooler, at most */
const PLATE_SHADE = 0.06
const PLATE_TINT = 0.03

/** A floor arrow's paint: how far lighter or darker, at most */
const ARROW_SHADE = 0.18

/** A turnable arrow's disc: how far lighter or darker, at most */
const DISC_SHADE = 0.05

/** A grate: how far lighter or darker, at most */
const GRATE_SHADE = 0.12

/** A grate's band of bars rubbed paler, at its middle */
const GRATE_POLISH = 0.07

/** A grate's scratches, at their strongest */
const GRATE_SCRATCH = 0.25

/** Where a grate's band can lie: its middle from this far in, over this span; its half width from this, plus up to that much more */
const BAND_FROM = 70
const BAND_SPAN = 116
const BAND_HALF = 22
const BAND_HALF_SPAN = 16

/** A grate's scratches: up to this many more than one, along the frame's sides, this long and up to that much longer */
const SCRATCHES_MORE = 3
const SCRATCH_FROM = 40
const SCRATCH_SPAN = 176
const SCRATCH_DEPTH = 15
const SCRATCH_DEPTH_SPAN = 8
const SCRATCH_LENGTH = 30
const SCRATCH_LENGTH_SPAN = 50
const SCRATCH_TILT = 0.15

/** An open pit's sides: how far darker at most, how much of that they lighten, and how wide its stretches are, in tiles */
const PIT_SHADE = 0.16
const PIT_LIGHTER_SHARE = 0.7
const PIT_SPAN = 2.5

/** Samples of the pits' shade to a tile's side, painted over the whole chamber, its edges included, so neighbouring tiles meet without a seam */
const PIT_SAMPLES = 8

/** A pixel of the subject's box-holding sprite is the painted box's grey when it is this opaque or more, and its channels lie this close or closer */
const HELD_OPAQUE = 200
const HELD_GREY = 14

/** Opacities finer than this are left out, and the rest rounded to it, so looks that differ by nothing visible share their images */
const FINEST_ALPHA = 0.001

/** Each look's numbers, by what it is: a salt per use, well apart from the surface detail's (10 to 55, then 1000 to 4000) */
const MIRROR_SALT = 6000
const BUTTON_SALT = 6100
const SWITCH_SALT = 6200
const ARROW_SALT = 6300
const DISC_SALT = 6400
const GRATE_SALT = 6500
const BAND_SALT = 6600
const SCRATCH_SALT = 6700
const PIT_SALT = 6800

/** The sprites a button's look is laid over: released and pressed alike, so pressing it never changes its look */
const BUTTON_SPRITES: readonly SpriteName[] = [
  'button_up',
  'button_pressed',
]

/** The part of each sprite that carries its meaning, put back as drawn after its look is laid over it */
const KEPT_PARTS: Partial<Readonly<Record<SpriteName, Exclude<SpritePart, 'whole'>>>> = {
  box_mirror: 'mirror',
  button_up: 'buttonDome',
  button_pressed: 'buttonDome',
  switch: 'buttonDome',
}

/** Chambers' pit shades kept at once, as the surface detail keeps its soft layers */
const KEPT_PIT_SHADES = 24

/** Every chamber's pit shade painted so far, by its number, the most recently used last: it depends only on the chamber's size and walls, so the home menu's map and the chamber share it */
const pitShades = new Map<number, HTMLCanvasElement>()

/** Each chamber's looks, worked out as they are first asked for */
const chamberDetails = new WeakMap<CompiledChamber, ChamberDetail>()

/** The look laid over the subject's box-holding sprite for each box's look */
const heldLooks = new WeakMap<ElementLook, ElementLook>()

/**
 * Bends an instance's number into a share from -1 to 1, so most instances
 * land clearly lighter or darker, warmer or cooler.
 * @param number - The number, from 0 to 1
 * @returns The share
 */
function spread(number: number): number {
  const value = (number * 2) - 1

  return Math.sign(value) * (Math.abs(value) ** SPREAD_POWER)
}

/**
 * A colour from the palette at an opacity, rounded so looks that differ by
 * nothing visible share their images, or null when too faint to show.
 * @param colour - The colour, as rgba()
 * @param alpha - Its opacity
 * @returns The colour at that opacity, or null
 */
function faint(colour: string, alpha: number): string | null {
  const rounded = Math.round(alpha / FINEST_ALPHA) * FINEST_ALPHA

  return (rounded < FINEST_ALPHA) ? null : withAlpha(colour, Number(rounded.toFixed(3)))
}

/**
 * The fills of an instance's own shade: a shade lighter or darker, and,
 * when it has a tint, warmer or cooler.
 * @param numbers - The instance's numbers
 * @param sprites - The sprites it is laid over
 * @param part - Where on them
 * @param shade - How far lighter or darker at most
 * @param tint - How far warmer or cooler at most, 0 for none
 * @returns The fills
 */
function shadeFills(numbers: () => number, sprites: readonly SpriteName[], part: SpritePart, shade: number, tint: number): LookFill[] {
  const light = spread(numbers())
  const warm = spread(numbers())
  const colours = [
    (light > 0) ? faint(PALETTE.surfaceLight, light * shade * LIGHTER_SHARE) : faint(PALETTE.surfaceDark, -light * shade),
    (tint > 0) ? faint((warm > 0) ? PALETTE.elementWarm : PALETTE.elementCool, Math.abs(warm) * tint) : null,
  ]

  return colours.filter((colour): colour is string => colour !== null).map((colour) => ({
    sprites: sprites,
    part: part,
    colour: colour,
  }))
}

/**
 * The fills of the floor's room light at a tile: darker by a wall, lifted
 * in the open.
 * @param chamber - The chamber
 * @param tile - Where the instance is lit
 * @param sprites - The sprites they are laid over
 * @param part - Where on them
 * @returns The fills
 */
function lightFills(chamber: CompiledChamber, tile: PositionData, sprites: readonly SpriteName[], part: SpritePart): LookFill[] {
  const light = roomLightAt(chamber, tile.x, tile.y)
  const colours = [
    faint(PALETTE.floorWallShade, ROOM_SHADE * light.wallShade),
    faint(PALETTE.surfaceLight, ROOM_LIFT * light.openLift),
  ]

  return colours.filter((colour): colour is string => colour !== null).map((colour) => ({
    sprites: sprites,
    part: part,
    colour: colour,
  }))
}

/**
 * A look from its fills and a grate's marks, with the key its images are
 * kept by.
 * @param fills - Its fills, in order
 * @param grate - A grate's marks, or null
 * @returns The look
 */
function makeLook(fills: readonly LookFill[], grate: GrateMarks | null): ElementLook {
  const fillKeys = fills.map((fill) => `${fill.sprites.join('+')}/${fill.part}/${fill.colour}`)
  const grateKey = (grate === null) ? '' : `|${JSON.stringify(grate)}`

  return {
    key: fillKeys.join(';') + grateKey,
    fills: fills,
    grate: grate,
    held: null,
  }
}

/**
 * A box's look: the room light where it started, and a mirror box's own
 * shade too. Laid over the subject's box-holding sprite as well, so a box
 * keeps its look in the subject's hands.
 * @param chamber - The chamber
 * @param index - The box's index
 * @param seed - The chamber's number
 * @returns Its look, or null for a box the chamber doesn't have
 */
function boxLook(chamber: CompiledChamber, index: number, seed: number): ElementLook | null {
  const start = chamber.boxStarts[index]

  if (start === undefined) {
    return null
  }

  const mirror = chamber.mirrorOf(index) !== null
  const sprites: readonly SpriteName[] = [
    mirror ? 'box_mirror' : 'box',
    'subject_holding_box',
  ]
  const part = mirror ? 'mirrorPlates' : 'boxPlates'
  const shade = mirror ? shadeFills(tileNumbers(seed, start.x, start.y, MIRROR_SALT), sprites, part, MIRROR_SHADE, MIRROR_TINT) : []

  return makeLook([
    ...shade,
    ...lightFills(chamber, start, sprites, part),
  ], null)
}

/**
 * An arrow's look: a floor arrow's paint a shade of its own; a turnable
 * arrow's disc a shade of its own, its chevron, which turns, only lit.
 * Both take the room light.
 * @param chamber - The chamber
 * @param index - The arrow's index
 * @param seed - The chamber's number
 * @returns Its look
 */
function arrowLook(chamber: CompiledChamber, index: number, seed: number): ElementLook {
  const position = chamber.positionOf('arrow', index)

  if (chamber.turnedDirectionOf('arrow', index) === null) {
    const sprites: readonly SpriteName[] = ['arrow']

    return makeLook([
      ...shadeFills(tileNumbers(seed, position.x, position.y, ARROW_SALT), sprites, 'whole', ARROW_SHADE, 0),
      ...lightFills(chamber, position, sprites, 'whole'),
    ], null)
  }

  return makeLook([
    ...shadeFills(tileNumbers(seed, position.x, position.y, DISC_SALT), ['turntable'], 'discFace', DISC_SHADE, 0),
    ...lightFills(chamber, position, [
      'turntable',
      'turntable_arrow',
    ], 'whole'),
  ], null)
}

/**
 * A button's or a switch's look: its plate and clamps a shade of their own
 * and lit by the room, its dome as drawn.
 * @param kind - Button or switch
 * @param salt - Its numbers' salt
 * @returns Works out the look of each
 */
function plateLook(kind: 'button' | 'switch', salt: number): LookMaker {
  const sprites: readonly SpriteName[] = (kind === 'button') ? BUTTON_SPRITES : ['switch']

  return (chamber, index, seed) => {
    const position = chamber.positionOf(kind, index)

    return makeLook([
      ...shadeFills(tileNumbers(seed, position.x, position.y, salt), sprites, 'buttonPlate', PLATE_SHADE, PLATE_TINT),
      ...lightFills(chamber, position, sprites, 'buttonPlate'),
    ], null)
  }
}

/**
 * A ditch's look, for its grate: a shade of its own, the room light, a band
 * of bars rubbed paler and a scratch or a few on its frame. Its pit, joined
 * to its neighbours, is shaded tile by tile (pitTile()).
 * @param chamber - The chamber
 * @param index - The ditch's index
 * @param seed - The chamber's number
 * @returns Its look
 */
function grateLook(chamber: CompiledChamber, index: number, seed: number): ElementLook {
  const position = chamber.positionOf('ditch', index)
  const sprites: readonly SpriteName[] = ['ditch_bridged']
  const band = tileNumbers(seed, position.x, position.y, BAND_SALT)
  const marks = tileNumbers(seed, position.x, position.y, SCRATCH_SALT)
  const count = 1 + Math.floor(marks() * SCRATCHES_MORE)
  const scratches: GrateScratch[] = []

  for (let i = 0; i < count; i++) {
    scratches.push({
      quarters: Math.floor(marks() * 4),
      x: SCRATCH_FROM + (marks() * SCRATCH_SPAN),
      y: SCRATCH_DEPTH + (marks() * SCRATCH_DEPTH_SPAN),
      length: SCRATCH_LENGTH + (marks() * SCRATCH_LENGTH_SPAN),
      tilt: (marks() - 0.5) * SCRATCH_TILT,
    })
  }

  return makeLook([
    ...shadeFills(tileNumbers(seed, position.x, position.y, GRATE_SALT), sprites, 'grateFace', GRATE_SHADE, 0),
    ...lightFills(chamber, position, sprites, 'grateFace'),
  ], {
    across: band() < 0.5,
    middle: BAND_FROM + (band() * BAND_SPAN),
    half: BAND_HALF + (band() * BAND_HALF_SPAN),
    scratches: scratches,
  })
}

/**
 * Whether, and how, each element type takes a look of its own. Every type is
 * listed, so a new one has to be given its answer: a way to work out its
 * look, or null when its sprites are drawn as they are.
 */
const LOOK_MAKERS: Readonly<Record<ElementKind, LookMaker | null>> = {
  wall: null,
  slideFloor: null,
  arrow: arrowLook,
  blockedWall: null,
  emitter: null,
  lightBarrier: null,
  ditch: grateLook,
  laser: null,
  door: null,
  exit: null,
  button: plateLook('button', BUTTON_SALT),
  receiver: null,
  switch: plateLook('switch', SWITCH_SALT),
  fizzler: null,
  box: boxLook,
}

/**
 * What a chamber's looks are worked out from, worked out once per chamber.
 * @param chamber - The chamber
 * @returns Its detail
 */
function detailOf(chamber: CompiledChamber): ChamberDetail {
  let detail = chamberDetails.get(chamber)

  if (detail === undefined) {
    detail = {
      seed: chamberSeed(chamber),
      looks: new Map(),
    }
    chamberDetails.set(chamber, detail)
  }

  return detail
}

/**
 * The look of one instance, worked out the first time it is asked for.
 * @param chamber - The chamber
 * @param kind - The instance's element type
 * @param index - Its index in the chamber's list of that type
 * @returns Its look, or null for a type drawn as its sprites are
 */
export function lookOf(chamber: CompiledChamber, kind: ElementKind, index: number): ElementLook | null {
  const maker = LOOK_MAKERS[kind]

  if (maker === null) {
    return null
  }

  const detail = detailOf(chamber)
  const key = `${kind}:${index}`

  if (!detail.looks.has(key)) {
    detail.looks.set(key, maker(chamber, index, detail.seed))
  }

  return detail.looks.get(key) ?? null
}

/**
 * A box's look as laid over the subject's box-holding sprite, over the box
 * painted in its hands.
 * @param look - The box's look
 * @param ahead - How far ahead of the tile's middle the painted box's middle is, in tiles
 * @param size - The side of the box sprite drawn there, in tiles
 * @returns The look to draw the subject's sprite with
 */
export function heldLook(look: ElementLook, ahead: number, size: number): ElementLook {
  let held = heldLooks.get(look)

  if (held === undefined) {
    held = {
      ...look,
      key: `${look.key}|held ${ahead} ${size}`,
      held: {
        ahead: ahead,
        size: size,
      },
    }
    heldLooks.set(look, held)
  }

  return held
}

/**
 * Lays each of a look's fills over a canvas, each where its part is.
 * @param ctx - The canvas's context
 * @param fills - The fills
 * @param transform - The sprite's frame on the canvas: its scale and where its top left corner lies
 * @param transform.scale - Canvas pixels to one of the sprite's 256
 * @param transform.left - Its left edge, in canvas pixels
 * @param transform.top - Its top edge, in canvas pixels
 * @param composite - How they are laid down
 * @param part - The part every fill is laid over instead of its own, or null for each its own
 */
function layFills(ctx: CanvasRenderingContext2D, fills: readonly LookFill[], transform: {scale: number,
  left: number,
  top: number}, composite: GlobalCompositeOperation, part: SpritePart | null = null): void {
  for (const fill of fills) {
    const where = part ?? fill.part

    ctx.save()

    try {
      ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.left, transform.top)
      ctx.globalCompositeOperation = composite

      if (where !== 'whole') {
        ctx.clip(partPath(where), partRule(where))
      }

      ctx.fillStyle = fill.colour
      ctx.fillRect(0, 0, SPRITE_TILE_SIZE, SPRITE_TILE_SIZE)
    } finally {
      ctx.restore()
    }
  }
}

/**
 * Draws a grate's marks over it: the band of bars rubbed paler, then the
 * scratches on its frame, each a pixel wide, faint at both ends.
 * @param ctx - The grate's canvas, in the sprite's frame
 * @param marks - Its marks
 * @param pixel - One canvas pixel, in the sprite's frame
 */
function drawGrateMarks(ctx: CanvasRenderingContext2D, marks: GrateMarks, pixel: number): void {
  ctx.save()
  ctx.clip(partPath('grateBars'), partRule('grateBars'))

  const band = marks.across ? ctx.createLinearGradient(0, marks.middle - marks.half, 0, marks.middle + marks.half) : ctx.createLinearGradient(marks.middle - marks.half, 0, marks.middle + marks.half, 0)

  band.addColorStop(0, withAlpha(PALETTE.gratePolish, 0))
  band.addColorStop(0.5, withAlpha(PALETTE.gratePolish, GRATE_POLISH))
  band.addColorStop(1, withAlpha(PALETTE.gratePolish, 0))
  ctx.fillStyle = band
  ctx.fillRect(0, 0, SPRITE_TILE_SIZE, SPRITE_TILE_SIZE)
  ctx.restore()

  ctx.save()
  ctx.clip(partPath('grateFrame'), partRule('grateFrame'))
  ctx.lineWidth = pixel
  ctx.lineCap = 'butt'

  for (const scratch of marks.scratches) {
    const half = scratch.length / 2
    const dx = Math.cos(scratch.tilt) * half
    const dy = Math.sin(scratch.tilt) * half
    const fade = ctx.createLinearGradient(scratch.x - dx, scratch.y - dy, scratch.x + dx, scratch.y + dy)

    fade.addColorStop(0, withAlpha(PALETTE.grateScratch, 0))
    fade.addColorStop(0.25, withAlpha(PALETTE.grateScratch, GRATE_SCRATCH))
    fade.addColorStop(0.7, withAlpha(PALETTE.grateScratch, GRATE_SCRATCH))
    fade.addColorStop(1, withAlpha(PALETTE.grateScratch, 0))

    ctx.save()
    // Turned onto its own side of the frame, about the tile's middle
    ctx.translate(SPRITE_TILE_SIZE / 2, SPRITE_TILE_SIZE / 2)
    ctx.rotate(scratch.quarters * Math.PI / 2)
    ctx.translate(-SPRITE_TILE_SIZE / 2, -SPRITE_TILE_SIZE / 2)
    ctx.strokeStyle = fade
    ctx.beginPath()
    ctx.moveTo(scratch.x - dx, scratch.y - dy)
    ctx.lineTo(scratch.x + dx, scratch.y + dy)
    ctx.stroke()
    ctx.restore()
  }

  ctx.restore()
}

/**
 * Where the subject's box-holding sprite, at a tile size, is the painted
 * box's grey: opaque white there, see-through elsewhere, so a box's look
 * never lands on the hands that hold it.
 * @param sprite - The subject's box-holding sprite at that size
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The mask, kept with that size's sprites
 */
function heldGrey(sprite: ScaledSprite, tileSize: number): HTMLCanvasElement {
  return keptImage(tileSize, 'heldBoxGrey', () => {
    const mask = makeCanvas(sprite.image.width, sprite.image.height)

    mask.context.drawImage(sprite.image, 0, 0)

    const pixels = mask.context.getImageData(0, 0, mask.canvas.width, mask.canvas.height)
    const data = pixels.data

    for (let i = 0; i < data.length; i += 4) {
      const red = data[i] ?? 0
      const green = data[i + 1] ?? 0
      const blue = data[i + 2] ?? 0
      const grey = ((data[i + 3] ?? 0) >= HELD_OPAQUE) && ((Math.max(red, green, blue) - Math.min(red, green, blue)) <= HELD_GREY)

      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = grey ? 255 : 0
    }

    mask.context.putImageData(pixels, 0, 0)

    return mask.canvas
  })
}

/**
 * The subject's box-holding sprite with a carried box's look laid over the
 * box painted in its hands: on its plates, as the box's own sprite takes
 * it, and only on the painted box's grey.
 * @param sprite - The subject's box-holding sprite at a tile size
 * @param tileSize - Side of a tile, in canvas pixels
 * @param look - The carried box's look, laid over the subject's sprite
 * @param held - Where the painted box is
 * @returns The sprite with the look
 */
function paintHeldBox(sprite: ScaledSprite, tileSize: number, look: ElementLook, held: HeldBox): HTMLCanvasElement {
  const fills = look.fills.filter((fill) => fill.sprites.includes('subject_holding_box'))

  if (fills.length === 0) {
    return sprite.image
  }

  const skin = makeCanvas(sprite.image.width, sprite.image.height)
  const wear = makeCanvas(sprite.image.width, sprite.image.height)
  const scale = (held.size * tileSize) / SPRITE_TILE_SIZE
  // The painted box's frame: its middle the held distance ahead of the tile's middle, as drawn facing up
  const middleX = sprite.margin + (tileSize / 2)
  const middleY = sprite.margin + (tileSize / 2) - (held.ahead * tileSize)

  layFills(wear.context, fills, {
    scale: scale,
    left: middleX - (scale * SPRITE_TILE_SIZE / 2),
    top: middleY - (scale * SPRITE_TILE_SIZE / 2),
  }, 'source-over', 'boxPlates')
  wear.context.globalCompositeOperation = 'destination-in'
  wear.context.drawImage(heldGrey(sprite, tileSize), 0, 0)
  skin.context.drawImage(sprite.image, 0, 0)
  skin.context.drawImage(wear.canvas, 0, 0)

  return skin.canvas
}

/**
 * A sprite with an instance's look laid over it, only where it has pixels,
 * the part that carries its meaning put back as drawn.
 * @param name - The sprite
 * @param sprite - The sprite shrunk to the tile size
 * @param tileSize - Side of a tile, in canvas pixels
 * @param look - The instance's look
 * @returns The sprite with its look, or the sprite itself when the look lays nothing over it
 */
function paintLook(name: SpriteName, sprite: ScaledSprite, tileSize: number, look: ElementLook): HTMLCanvasElement {
  if ((name === 'subject_holding_box') && (look.held !== null)) {
    return paintHeldBox(sprite, tileSize, look, look.held)
  }

  const fills = look.fills.filter((fill) => fill.sprites.includes(name))
  const grate = (name === 'ditch_bridged') ? look.grate : null

  if ((fills.length === 0) && (grate === null)) {
    return sprite.image
  }

  const skin = makeCanvas(sprite.image.width, sprite.image.height)
  const scale = tileSize / SPRITE_TILE_SIZE
  const kept = KEPT_PARTS[name]

  skin.context.drawImage(sprite.image, 0, 0)
  layFills(skin.context, fills, {
    scale: scale,
    left: sprite.margin,
    top: sprite.margin,
  }, 'source-atop')

  if (kept !== undefined) {
    // The part that carries the meaning, as drawn
    skin.context.save()
    skin.context.setTransform(scale, 0, 0, scale, sprite.margin, sprite.margin)
    skin.context.clip(partPath(kept), partRule(kept))
    skin.context.setTransform(1, 0, 0, 1, 0, 0)
    skin.context.clearRect(0, 0, skin.canvas.width, skin.canvas.height)
    skin.context.drawImage(sprite.image, 0, 0)
    skin.context.restore()
  }

  if (grate !== null) {
    skin.context.save()
    skin.context.setTransform(scale, 0, 0, scale, sprite.margin, sprite.margin)
    skin.context.globalCompositeOperation = 'source-atop'
    drawGrateMarks(skin.context, grate, 1 / scale)
    skin.context.restore()
  }

  return skin.canvas
}

/**
 * A sprite shrunk to a tile size with an instance's look laid over it, made
 * the first time it is asked for and kept with that size's sprites.
 * @param name - The sprite
 * @param tileSize - Side of a tile, in canvas pixels
 * @param sprite - The sprite shrunk to that size
 * @param look - The instance's look
 * @returns The sprite with its look, the same size and shape as the sprite, so its shadow still fits
 */
export function lookedSprite(name: SpriteName, tileSize: number, sprite: ScaledSprite, look: ElementLook): ScaledSprite {
  const image = keptImage(tileSize, `${name}|${look.key}`, () => paintLook(name, sprite, tileSize, look))

  return (image === sprite.image) ? sprite : {
    image: image,
    margin: sprite.margin,
  }
}

/**
 * Paints the shade of every pit's sides over a whole chamber, lighter or
 * darker in long soft stretches, from noise over the chamber: a few samples
 * to a tile's side, one on each tile's edges, so a pit tile is cut from it
 * and stretched, and neighbouring tiles meet without a seam. It depends only
 * on the chamber's size and walls, so it is painted once per chamber.
 * @param chamber - The chamber
 * @param seed - The chamber's number
 * @returns The shade, a sample to a pixel, row 0 at the top
 */
function paintPitShade(chamber: CompiledChamber, seed: number): HTMLCanvasElement {
  const width = (chamber.width * PIT_SAMPLES) + 1
  const height = (chamber.height * PIT_SAMPLES) + 1
  const noise = cloudNoise(seed, PIT_SALT, chamber.width / PIT_SPAN, chamber.height / PIT_SPAN)
  const shade = makeCanvas(width, height)
  const pixels = shade.context.createImageData(width, height)

  for (let down = 0; down < height; down++) {
    for (let across = 0; across < width; across++) {
      const level = noise(across / PIT_SAMPLES / PIT_SPAN, down / PIT_SAMPLES / PIT_SPAN) - 0.5
      const lighter = level > 0
      const at = ((down * width) + across) * 4

      pixels.data[at] = lighter ? 255 : 0
      pixels.data[at + 1] = lighter ? 255 : 0
      pixels.data[at + 2] = lighter ? 255 : 0
      pixels.data[at + 3] = Math.round(Math.min(1, Math.abs(level) * 2 * PIT_SHADE * (lighter ? PIT_LIGHTER_SHARE : 1)) * 255)
    }
  }

  shade.context.putImageData(pixels, 0, 0)

  return shade.canvas
}

/**
 * A chamber's pit shade, painted the first time it is asked for and kept.
 * @param chamber - The chamber
 * @param seed - The chamber's number, which sets it apart from every other chamber's
 * @returns The shade
 */
function keptPitShade(chamber: CompiledChamber, seed: number): HTMLCanvasElement {
  const shade = pitShades.get(seed) ?? paintPitShade(chamber, seed)

  // Asked for again, it moves to the end of the line
  pitShades.delete(seed)
  pitShades.set(seed, shade)

  if (pitShades.size > KEPT_PIT_SHADES) {
    const oldest = pitShades.keys().next()

    if (oldest.done !== true) {
      pitShades.delete(oldest.value)
    }
  }

  return shade
}

/**
 * An open pit's tile, joined to the open ditches round it: each quarter
 * from the strip tile its neighbours pick, then its sides shaded lighter or
 * darker in long soft stretches, from noise over the whole chamber, so the
 * sides of neighbouring tiles meet without a seam. Made the first time it is
 * asked for and kept with the tile size's sprites.
 * @param chamber - The chamber
 * @param x - Column
 * @param y - Row
 * @param quarters - The strip tile of each quarter, from STRIP_TILE
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The tile, or null when the ditch's strip has no usable file
 */
export function pitTile(chamber: CompiledChamber, x: number, y: number, quarters: Readonly<Record<TileQuarter, number>>, tileSize: number): HTMLCanvasElement | null {
  const strip = scaledSprite('ditch', tileSize)

  if (strip === null) {
    return null
  }

  const detail = detailOf(chamber)
  const joins = TILE_QUARTERS.map((quarter) => quarters[quarter]).join('')

  return keptImage(tileSize, `pit|${detail.seed}|${x},${y}|${joins}`, () => {
    const tile = makeCanvas(tileSize, tileSize)

    for (const quarter of TILE_QUARTERS) {
      const rect = quarterRect(tileSize, quarter)

      tile.context.drawImage(strip.image, (quarters[quarter] * tileSize) + rect.left, rect.top, rect.width, rect.height, rect.left, rect.top, rect.width, rect.height)
    }

    const shade = keptPitShade(chamber, detail.seed)
    const scale = tileSize / SPRITE_TILE_SIZE
    const row = chamber.height - 1 - y

    tile.context.save()
    tile.context.setTransform(scale, 0, 0, scale, 0, 0)
    tile.context.clip(pitSides(quarters))
    tile.context.setTransform(1, 0, 0, 1, 0, 0)
    tile.context.imageSmoothingEnabled = true
    // From the middle of the sample on the tile's left or top edge to that of the one on its right or bottom edge
    tile.context.drawImage(shade, (x * PIT_SAMPLES) + 0.5, (row * PIT_SAMPLES) + 0.5, PIT_SAMPLES, PIT_SAMPLES, 0, 0, tileSize, tileSize)
    tile.context.restore()

    return tile.canvas
  })
}
