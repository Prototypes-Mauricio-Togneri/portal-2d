import {drawPlaceholder} from '@/game/sprite_placeholders'
import {isSpriteName, SPRITE_EXTENSIONS, SPRITE_OVERHANG, SPRITE_SHAPES, SPRITE_TILE_SIZE, STRIP_TILES, type SpriteName} from '@/game/sprite_set'

/**
 * The chamber sprites' files, and what the game draws for each sprite: its
 * file, decoded, or else its placeholder. Every file in
 * `src/assets/images/chamber/` is found at build time and named by its
 * sprite (`docs/sprites.md`). The loading screen hands each one over as it
 * downloads (useSpriteFile); a page it doesn't run before, such as a dev
 * page, loads them itself (loadSprites). A file that is missing, can't be
 * decoded or has the wrong size leaves its sprite to its placeholder for the
 * rest of the visit, and is reported in development.
 */

/**
 * A sprite as the game draws it.
 */
export type Sprite = {
  readonly image: ImageBitmap | HTMLCanvasElement // Its file, decoded, or its placeholder
  readonly overhang: number // Margin around its tile on every side, in the image's pixels: 0, or SPRITE_OVERHANG
}

/**
 * What became of a sprite's file: there is none in the folder ('missing'),
 * it hasn't been handed over yet, or its download failed ('notLoaded'), the
 * game draws it ('inUse'), or it was refused because it can't be decoded or
 * has the wrong size ('refused'). Every sprite but one in use is drawn as its
 * placeholder.
 */
export type SpriteFileStatus = 'missing' | 'notLoaded' | 'inUse' | 'refused'

/**
 * A sprite's file as the game has it, for the gallery.
 */
export type SpriteFileReport = {
  readonly status: SpriteFileStatus // What became of the file
  readonly reason: string | null // Why it was refused, or null when it wasn't
}

// Every file in the sprites' folder, by its path, found at build time, so a new sprite needs no list to update
const SPRITE_FILES = import.meta.glob<string>('@/assets/images/chamber/*', {
  eager: true,
  import: 'default',
  query: '?url',
})

/**
 * Logs a problem with the sprites' files, in development only.
 * @param message - What is wrong
 */
function reportInDevelopment(message: string): void {
  if (import.meta.env.DEV) {
    console.error(message)
  }
}

/**
 * Refuses a sprite's file, keeping why for the gallery and logging it in
 * development.
 * @param name - The sprite
 * @param reason - Why its file is refused
 */
function refuse(name: SpriteName, reason: string): void {
  refusals.set(name, reason)
  reportInDevelopment(`Sprite ${name}'s file is refused: ${reason}`)
}

/**
 * Names each sprite's file from its path, reporting every file that isn't
 * one sprite's.
 * @returns The address of each sprite's file, by the sprite's name
 */
function findSpriteFiles(): Map<SpriteName, string> {
  const urls = new Map<SpriteName, string>()

  for (const [
    path,
    url,
  ] of Object.entries(SPRITE_FILES)) {
    const fileName = path.slice(path.lastIndexOf('/') + 1)
    const dot = fileName.lastIndexOf('.')
    const baseName = (dot === -1) ? fileName : fileName.slice(0, dot)
    const extension = (dot === -1) ? '' : fileName.slice(dot + 1)

    if (!isSpriteName(baseName) || !SPRITE_EXTENSIONS.includes(extension)) {
      reportInDevelopment(`${fileName} in src/assets/images/chamber/ is not a sprite's file (see docs/sprites.md)`)
    } else if (urls.has(baseName)) {
      reportInDevelopment(`Sprite ${baseName} has more than one file in src/assets/images/chamber/; ${fileName} is ignored`)
    } else {
      urls.set(baseName, url)
    }
  }

  return urls
}

/**
 * Groups the sprites by the address of their files. A build gives
 * byte-identical files one address, so an address can serve several sprites.
 * @param urls - The address of each sprite's file, by the sprite's name
 * @returns The names of the sprites each address serves
 */
function groupNamesByUrl(urls: Map<SpriteName, string>): Map<string, SpriteName[]> {
  const names = new Map<string, SpriteName[]>()

  for (const [
    name,
    url,
  ] of urls) {
    names.set(url, [
      ...names.get(url) ?? [],
      name,
    ])
  }

  return names
}

const urlsByName = findSpriteFiles() // The address of each sprite's file, by the sprite's name
const namesByUrl = groupNamesByUrl(urlsByName) // The names of the sprites each file's address serves
const decodedSprites = new Map<SpriteName, Sprite>() // Each sprite whose file has been handed over, decoded and fits, by name
const placeholders = new Map<SpriteName, Sprite | null>() // Each placeholder drawn so far, by its sprite's name; null for a glow
const refusals = new Map<SpriteName, string>() // Why each sprite whose file was refused has no file in use, by name

/**
 * Reads how far a sprite's file overhangs its tile from the file's size,
 * checking it against the size its shape asks for.
 * @param name - The sprite
 * @param width - Width of its file, in pixels
 * @param height - Height of its file, in pixels
 * @returns The margin around its tile on every side, in pixels, or null when its shape doesn't allow that size
 */
function overhangFor(name: SpriteName, width: number, height: number): number | null {
  const overhanging = SPRITE_TILE_SIZE + (2 * SPRITE_OVERHANG)

  switch (SPRITE_SHAPES[name]) {
    case 'strip':
      return ((width === SPRITE_TILE_SIZE * STRIP_TILES) && (height === SPRITE_TILE_SIZE)) ? 0 : null

    case 'glow':
      return ((width === overhanging) && (height === overhanging)) ? SPRITE_OVERHANG : null

    case 'tile':
      if ((width === SPRITE_TILE_SIZE) && (height === SPRITE_TILE_SIZE)) {
        return 0
      }

      return ((width === overhanging) && (height === overhanging)) ? SPRITE_OVERHANG : null
  }
}

/**
 * The sizes a sprite's file may have, for reporting one that doesn't fit.
 * @param name - The sprite
 * @returns The sizes, in words
 */
function allowedSizes(name: SpriteName): string {
  const tile = `${SPRITE_TILE_SIZE} × ${SPRITE_TILE_SIZE} px`
  const overhanging = SPRITE_TILE_SIZE + (2 * SPRITE_OVERHANG)
  const overhangingTile = `${overhanging} × ${overhanging} px`

  switch (SPRITE_SHAPES[name]) {
    case 'strip':
      return `${SPRITE_TILE_SIZE * STRIP_TILES} × ${SPRITE_TILE_SIZE} px`

    case 'glow':
      return overhangingTile

    case 'tile':
      return `${tile} or ${overhangingTile}`
  }
}

/**
 * Takes a downloaded file, decoded, for each sprite it serves whose shape
 * allows its size. Does nothing for a file that is not a sprite's, nor for
 * one whose sprites all have theirs already. Never rejects: a file that can't
 * be decoded or has the wrong size leaves its sprites to their placeholders.
 * @param url - Address of the file, as found at build time
 * @param file - The downloaded file
 */
export async function useSpriteFile(url: string, file: Blob): Promise<void> {
  const names = namesByUrl.get(url) ?? []

  // The preloader lists an address once per file, so an address several sprites share arrives more than once
  if (names.every((name) => decodedSprites.has(name))) {
    return
  }

  let image: ImageBitmap

  try {
    image = await createImageBitmap(file)
  } catch (_error) {
    for (const name of names) {
      refuse(name, 'it can\'t be decoded')
    }

    return
  }

  let used = false

  for (const name of names) {
    const overhang = overhangFor(name, image.width, image.height)

    if (overhang === null) {
      refuse(name, `it is ${image.width} × ${image.height} px; it must be ${allowedSizes(name)}`)
    } else if (!decodedSprites.has(name)) {
      // Checked again after decoding: the same address may have been decoded meanwhile
      decodedSprites.set(name, {
        image: image,
        overhang: overhang,
      })
      used = true
    }
  }

  if (!used) {
    image.close()
  }
}

/**
 * Downloads and decodes every sprite's file, for a page the loading screen
 * doesn't run before, such as a dev page. Never rejects: a file that fails
 * leaves its sprite to its placeholder.
 */
export async function loadSprites(): Promise<void> {
  await Promise.all([...urlsByName.values()].map(async (url) => {
    try {
      const response = await fetch(url)

      if (response.ok) {
        await useSpriteFile(url, await response.blob())
      }
    } catch (_error) {
      // Offline or blocked: the sprite keeps its placeholder
    }
  }))
}

/**
 * What the game draws for a sprite: its file, decoded, or else its
 * placeholder, drawn the first time it is asked for.
 * @param name - The sprite
 * @returns The sprite, or null for a glow without a usable file
 */
export function spriteOf(name: SpriteName): Sprite | null {
  const decoded = decodedSprites.get(name)

  if (decoded !== undefined) {
    return decoded
  }

  if (!placeholders.has(name)) {
    const image = drawPlaceholder(name)

    placeholders.set(name, (image === null) ? null : {
      image: image,
      overhang: 0,
    })
  }

  return placeholders.get(name) ?? null
}

/**
 * What became of a sprite's file, for the gallery.
 * @param name - The sprite
 * @returns Its file's status, and why it was refused
 */
export function spriteFileReport(name: SpriteName): SpriteFileReport {
  if (decodedSprites.has(name)) {
    return {
      status: 'inUse',
      reason: null,
    }
  }

  const reason = refusals.get(name)

  if (reason !== undefined) {
    return {
      status: 'refused',
      reason: reason,
    }
  }

  return {
    status: urlsByName.has(name) ? 'notLoaded' : 'missing',
    reason: null,
  }
}
