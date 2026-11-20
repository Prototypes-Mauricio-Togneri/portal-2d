#!/usr/bin/env python3
"""Makes the patched copies of game files that the mixer's engine is bundled from.

The engine bundles the game's real drawing code, so a mock-up shows exactly
what the game would. Four files are copied into build/patched/ with small
changes, and engine/vite.config.mjs points their imports at the copies; the
game's own files are never touched:

  sprite_sources.ts    decodes the sprites from the data URLs the bundle
                       inlines, with no request (an Artifact page may not fetch)
  renderer.ts          lets the page switch the game's surface detail off, and
                       draw over the floor, and over the walls before their
                       shadow is made (the 'floor' and 'walls' hooks)
  tile_painter.ts      lets the page hand back another image for a sprite
                       drawn on a tile with drawSprite() (the 'skin' hook)
  element_drawings.ts  lets the page draw over each joined tile (a wall, a
                       blocked wall, an open ditch) right after its four
                       quarters (the 'afterTile' hook)

Every change is an exact text replacement that must match once. When the game
moves on and one no longer matches, this script stops and names it: open the
game file, find where that code went, and update the text here.
"""

import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent
OUT = HERE.parent / 'build' / 'patched'


def patch(name, replacements):
    source = (REPO / 'src' / 'game' / name).read_text()

    for label, old, new in replacements:
        if source.count(old) != 1:
            sys.exit(f'patch_sources.py: "{label}" in src/game/{name} matches {source.count(old)} times, not once. The game file changed: update this patch.')

        source = source.replace(old, new)

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(source)
    print(f'patched {name}: {len(replacements)} changes')


MIXER = '(globalThis as {__mixer?: {surfaceDetail?: boolean, hooks?: Record<string, ((...parts: never[]) => unknown) | undefined>}}).__mixer'

# ---------- sprite_sources.ts: sprites from inlined data URLs ----------

source = (REPO / 'src' / 'game' / 'sprite_sources.ts').read_text()
start = source.index('export async function loadSprites()')
end = source.index('/**\n * What the game draws for a sprite: its file, decoded.')
load_sprites = source[start:end]

patch('sprite_sources.ts', [
    ('loadSprites', load_sprites, '''export async function loadSprites(): Promise<void> {
  await Promise.all([...urlsByName.values()].map(async (url) => {
    try {
      // Mixer only: the files are inlined as data URLs, decoded here without a request
      const comma = url.indexOf(',')
      const mime = url.slice(5, url.indexOf(';'))
      const bytes = Uint8Array.from(atob(url.slice(comma + 1)), (character) => character.charCodeAt(0))

      await useSpriteFile(url, new Blob([bytes], {type: mime}))
    } catch (_error) {
      // The sprite stays undrawn
    }
  }))
}

'''),
])

# ---------- renderer.ts: surface detail on or off, and the two layer hooks ----------

patch('renderer.ts', [
    ('floor detail and hook', '''  drawElementsOn(painter, state, 'floor')
  drawFloorTone(painter, state.chamber)
  drawFloorWear(painter, state.chamber)
}
''', '''  drawElementsOn(painter, state, 'floor')

  if (mixerSurfaceDetail()) {
    drawFloorTone(painter, state.chamber)
    drawFloorWear(painter, state.chamber)
  }

  runMixerLayerHook('floor', painter, state)
}
'''),
    ('wall detail and hook', '''  drawElementsOn(structure, state, 'structure')
  drawWallTone(structure, state.chamber)
  drawWallWear(structure, state.chamber)
  painter.drawLayer(structure, true)
''', '''  drawElementsOn(structure, state, 'structure')

  if (mixerSurfaceDetail()) {
    drawWallTone(structure, state.chamber)
    drawWallWear(structure, state.chamber)
  }

  runMixerLayerHook('walls', structure, state)
  painter.drawLayer(structure, true)
'''),
    ('helpers', '''/**
 * Draws every element type on a layer, in registry order.''', '''/**
 * Mixer only: whether the game's own surface detail is drawn (on unless the page switches it off).
 */
function mixerSurfaceDetail(): boolean {
  return ''' + MIXER + '''?.surfaceDetail !== false
}

/**
 * Mixer only: lets the page draw over the floor, or over the walls before their shadow is made,
 * in a frame on the chamber's top left corner, x to the right and y down, in canvas pixels.
 */
function runMixerLayerHook(name: 'floor' | 'walls', painter: TilePainter, state: RulesState): void {
  const hook = ''' + MIXER + '''?.hooks?.[name] as ((ctx: CanvasRenderingContext2D, tileSize: number) => void) | undefined

  if (hook !== undefined) {
    painter.drawInFrame(0, state.chamber.height, Direction.UP, hook)
  }
}

/**
 * Draws every element type on a layer, in registry order.'''),
])

# ---------- tile_painter.ts: another image for a sprite drawn on a tile ----------

patch('tile_painter.ts', [
    ('skin helpers', '''export class TilePainter {''', '''/** Mixer only: what the 'skin' hook is told about the sprite being drawn */
type MixerSprite = {
  name: SpriteName // The sprite
  tileSize: number // Side of a tile, in canvas pixels
  x: number // Column; part way between two while something glides
  y: number // Row, counted from the bottom as the game counts
  row: number // Row, counted from the top as the screen shows it
  way: Direction // The way it is turned
  image: HTMLCanvasElement // The sprite shrunk to the tile size, with any overhang: never draw on it, copy it
  margin: number // Its overhang on every side, in canvas pixels
}

let mixerTile: {x: number, y: number, row: number} | null = null // Mixer only: the tile of the sprite drawSprite() is drawing

/**
 * Mixer only: the image the page hands back for a sprite drawn on a tile, the same size as the
 * sprite's own and with the same shape, so its shadow still fits; or the sprite's own.
 */
function mixerSkinned(name: SpriteName, size: number, way: Direction, sprite: ScaledSprite): ScaledSprite {
  const skin = ''' + MIXER + '''?.hooks?.skin as ((sprite: MixerSprite) => HTMLCanvasElement | null | undefined) | undefined

  if ((skin === undefined) || (mixerTile === null)) {
    return sprite
  }

  const image = skin({
    name: name,
    tileSize: size,
    x: mixerTile.x,
    y: mixerTile.y,
    row: mixerTile.row,
    way: way,
    image: sprite.image,
    margin: sprite.margin,
  })

  return ((image === null) || (image === undefined)) ? sprite : {
    image: image,
    margin: sprite.margin,
  }
}

export class TilePainter {'''),
    ('tile of drawSprite', '''  drawSprite(name: SpriteName, x: number, y: number, way: Direction = Direction.UP): void {
    this.drawSized(name, Math.round(x * this.tileSize), Math.round(this.tileTop(y)), this.tileSize, way)
  }
''', '''  drawSprite(name: SpriteName, x: number, y: number, way: Direction = Direction.UP): void {
    mixerTile = {
      x: x,
      y: y,
      row: this.rows - 1 - y,
    }

    try {
      this.drawSized(name, Math.round(x * this.tileSize), Math.round(this.tileTop(y)), this.tileSize, way)
    } finally {
      mixerTile = null
    }
  }

  /**
   * Mixer only: a row counted from the top, as the screen shows it.
   */
  mixerRowOf(y: number): number {
    return this.rows - 1 - y
  }
'''),
    ('skin in drawSized', '''    if (this.pass !== 'shadows') {
      this.drawTurned(sprite, left, top, size, way)
    }
''', '''    if (this.pass !== 'shadows') {
      this.drawTurned(mixerSkinned(name, size, way, sprite), left, top, size, way)
    }
'''),
])

# ---------- element_drawings.ts: drawing over a joined tile ----------

patch('element_drawings.ts', [
    ('afterTile hook', '''function drawJoinedTile(painter: TilePainter, name: SpriteName, joins: JoinTest, x: number, y: number): void {
  for (const tileQuarter of TILE_QUARTERS) {
    painter.drawStripQuarter(name, stripTileFor(joins, x, y, tileQuarter), tileQuarter, x, y)
  }
}
''', '''function drawJoinedTile(painter: TilePainter, name: SpriteName, joins: JoinTest, x: number, y: number): void {
  for (const tileQuarter of TILE_QUARTERS) {
    painter.drawStripQuarter(name, stripTileFor(joins, x, y, tileQuarter), tileQuarter, x, y)
  }

  // Mixer only: lets the page draw over the tile, in a frame on its top left corner, x to the right and y down
  const afterTile = ''' + MIXER + '''?.hooks?.afterTile as ((tile: {name: SpriteName, x: number, y: number, row: number, ctx: CanvasRenderingContext2D, tileSize: number}) => void) | undefined

  if (afterTile !== undefined) {
    painter.drawInFrame(x, y + 1, Direction.UP, (ctx, tileSize) => {
      afterTile({
        name: name,
        x: x,
        y: y,
        row: (painter as TilePainter & {mixerRowOf: (row: number) => number}).mixerRowOf(y),
        ctx: ctx,
        tileSize: tileSize,
      })
    })
  }
}
'''),
])
