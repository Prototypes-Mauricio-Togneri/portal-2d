import {allowedSizes, isSpriteName, overhangFor, SPRITE_EXTENSIONS, type SpriteName} from '@/game/sprite_set'

/**
 * The chamber sprites' files, and what the game draws for each sprite: its
 * file, decoded, or else nothing. Every file in
 * `src/assets/images/chamber/` is found at build time and named by its
 * sprite (`docs/sprites.md`). The loading screen hands each one over as it
 * downloads (useSpriteFile); a page it doesn't run before, such as a dev
 * page, loads them itself (loadSprites). A file that is missing, can't be
 * decoded or has the wrong size leaves its sprite undrawn for the rest of the
 * visit, and is reported in development; `npm run assets:check` keeps a
 * missing file, or one of the wrong size, from being deployed.
 */

/**
 * A sprite as the game draws it.
 */
export type Sprite = {
  readonly image: ImageBitmap // Its file, decoded
  readonly overhang: number // Margin around its tile on every side, in the image's pixels: 0, or SPRITE_OVERHANG
}

/**
 * What became of a sprite's file: there is none in the folder ('missing'),
 * it hasn't been handed over yet, or its download failed ('notLoaded'), the
 * game draws it ('inUse'), or it was refused because it can't be decoded or
 * has the wrong size ('refused'). Only a sprite in use is drawn.
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
const refusals = new Map<SpriteName, string>() // Why each sprite whose file was refused has no file in use, by name

/**
 * Takes a downloaded file, decoded, for each sprite it serves whose shape
 * allows its size. Does nothing for a file that is not a sprite's, nor for
 * one whose sprites all have theirs already. Never rejects: a file that can't
 * be decoded or has the wrong size leaves its sprites undrawn.
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
 * leaves its sprite undrawn.
 */
export async function loadSprites(): Promise<void> {
  await Promise.all([...urlsByName.values()].map(async (url) => {
    try {
      const response = await fetch(url)

      if (response.ok) {
        await useSpriteFile(url, await response.blob())
      }
    } catch (_error) {
      // Offline or blocked: the sprite stays undrawn
    }
  }))
}

/**
 * What the game draws for a sprite: its file, decoded.
 * @param name - The sprite
 * @returns The sprite, or null when it has no usable file
 */
export function spriteOf(name: SpriteName): Sprite | null {
  return decodedSprites.get(name) ?? null
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
