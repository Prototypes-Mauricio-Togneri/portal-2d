import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {dirname, extname, join, relative, resolve, sep} from 'node:path'
import {fileURLToPath} from 'node:url'
import {isSpriteName, SPRITE_EXTENSIONS} from '@/game/sprite_set'

// Checks that every file under src/assets is used, since the loading screen
// downloads every audio and image file there (src/services/asset_preloader.ts)
// whether the game uses it or not. Every file must be imported, or named in a
// CSS url(), by production source: the .ts, .vue and .css files under src/
// but src/dev/ (development pages, never built), and index.html. The chamber
// sprites (src/assets/images/chamber/) are found by a folder glob and matched
// by name (src/game/sprite_sources.ts), so no source names them: instead each
// entry there must be a file named like a sprite, with an extension a
// sprite's file may have, and no sprite may have two files. Prints one line
// per problem file, or one line when there is none, and exits non-zero on
// any problem.
//
// References are found in the text rather than by parsing each language:
// each source's comments are stripped by a small scanner that steps over
// string literals, so a path named only in a comment doesn't count while the
// // in a string such as 'https://...' isn't taken for a comment; then import
// statements and url() are matched with regular expressions. That is all the
// check needs, and it reads .ts, .vue, .css and .html alike. Globs
// (import.meta.glob) name no file, so they never count, and neither do a
// dynamic import(), new URL(..., import.meta.url) or a template's src
// attribute, which the source doesn't use for assets

/**
 * Which comments a source file's language has besides block comments, which
 * all of them have.
 */
type CommentSyntax = {
  readonly lineComments: boolean // Whether // starts a comment running to the end of its line
  readonly markupComments: boolean // Whether <!-- --> encloses a comment
}

/**
 * A production source file, read for references.
 */
type SourceFile = {
  readonly path: string // Its absolute path
  readonly syntax: CommentSyntax // The comments its language has
}

/**
 * A file under src/assets that fails the check.
 */
type Problem = {
  readonly path: string // Its absolute path
  readonly reason: string // What is wrong with it
}

/**
 * What the check went through.
 */
type CheckTotals = {
  readonly referenced: number // Files outside the sprites' folder that production source references
  readonly sprites: number // Sprites with one file in the sprites' folder
  readonly sources: number // Production source files read
}

/** The repository's root folder */
const ROOT = fileURLToPath(new URL('..', import.meta.url))

/** Where the source is */
const SOURCE_DIRECTORY = join(ROOT, 'src')

/** Where the assets are */
const ASSETS_DIRECTORY = join(SOURCE_DIRECTORY, 'assets')

/** Where the chamber sprites are, matched by name rather than referenced */
const SPRITES_DIRECTORY = join(ASSETS_DIRECTORY, 'images', 'chamber')

/** Where the development pages are, which are never built */
const DEV_DIRECTORY = join(SOURCE_DIRECTORY, 'dev')

/** The page Vite builds from, outside src/ */
const INDEX_PAGE = join(ROOT, 'index.html')

/** The comments of a page or a Vue file, which can hold markup, scripts and styles */
const MARKUP_SYNTAX: CommentSyntax = {
  lineComments: true,
  markupComments: true,
}

/** The production source files' extensions under src/, each with the comments its language has */
const SOURCE_EXTENSIONS: Readonly<Record<string, CommentSyntax>> = {
  '.ts': {
    lineComments: true,
    markupComments: false,
  },
  '.vue': MARKUP_SYNTAX,
  '.css': {
    lineComments: false,
    markupComments: false,
  },
}

/** An import statement's module, as in import x from '<spec>', import {a, b} from '<spec>' or import '<spec>'; it also matches CSS's @import '<spec>' */
const IMPORT_PATTERN = /\bimport\b(?:[\s\w$*{},]*?\bfrom)?\s*(['"])([^'"\n]+)\1/g

/** A CSS url(), as in url('<spec>'), url("<spec>") or url(<spec>) */
const URL_PATTERN = /\burl\(\s*(['"]?)([^'"()\s]+)\1\s*\)/g

/** A specifier that starts with a scheme, such as data: or https:, so names no file in the repository */
const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i

/**
 * Whether a path lies inside a folder, at any depth.
 * @param path - The absolute path
 * @param directory - The folder's absolute path
 * @returns True when the path is inside it
 */
function isInside(path: string, directory: string): boolean {
  return path.startsWith(directory + sep)
}

/**
 * Lists every file under a folder, at any depth.
 * @param directory - The folder
 * @returns Their absolute paths, sorted
 */
function listFiles(directory: string): string[] {
  return readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
  })
    .filter((entry) => !entry.isDirectory())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()
}

/**
 * Lists the production source files: the .ts, .vue and .css files under
 * src/ but src/dev/, and index.html.
 * @returns Each file with the comments its language has
 */
function listSources(): SourceFile[] {
  const sources: SourceFile[] = []

  for (const path of listFiles(SOURCE_DIRECTORY)) {
    const syntax = SOURCE_EXTENSIONS[extname(path)]

    if ((syntax !== undefined) && (!isInside(path, DEV_DIRECTORY))) {
      sources.push({
        path: path,
        syntax: syntax,
      })
    }
  }

  sources.push({
    path: INDEX_PAGE,
    syntax: MARKUP_SYNTAX,
  })

  return sources
}

/**
 * Finds where a string literal ends. A quoted string that isn't closed on
 * its line ends there: JavaScript and CSS strings can't span lines, and in
 * markup this keeps an apostrophe in the text from hiding the rest of the
 * file.
 * @param text - The source
 * @param start - Where the string's opening quote is
 * @returns Where the string ends, just after its closing quote
 */
function findStringEnd(text: string, start: number): number {
  const quote = text.charAt(start)
  let index = start + 1

  while (index < text.length) {
    const character = text.charAt(index)

    if (character === '\\') {
      index += 2
    } else if (character === quote) {
      return index + 1
    } else if ((character === '\n') && (quote !== '`')) {
      return index
    } else {
      index++
    }
  }

  return text.length
}

/**
 * Strips a source's comments, leaving its string literals as they are.
 * @param text - The source
 * @param syntax - The comments its language has
 * @returns The source without its comments
 */
function stripComments(text: string, syntax: CommentSyntax): string {
  const source = syntax.markupComments ? text.replace(/<!--[\s\S]*?-->/g, ' ') : text
  const kept: string[] = []
  let keptFrom = 0
  let index = 0

  while (index < source.length) {
    const character = source.charAt(index)
    const next = source.charAt(index + 1)

    if ((character === '\'') || (character === '"') || (character === '`')) {
      index = findStringEnd(source, index)
    } else if ((character === '/') && (next === '*')) {
      kept.push(source.slice(keptFrom, index), ' ')
      const close = source.indexOf('*/', index + 2)
      index = (close === -1) ? source.length : close + 2
      keptFrom = index
    } else if (syntax.lineComments && (character === '/') && (next === '/')) {
      kept.push(source.slice(keptFrom, index))
      const lineEnd = source.indexOf('\n', index)
      index = (lineEnd === -1) ? source.length : lineEnd
      keptFrom = index
    } else {
      index++
    }
  }

  kept.push(source.slice(keptFrom))

  return kept.join('')
}

/**
 * Finds the file a module specifier or url() names, the way Vite does for
 * what the source writes: @/ is src/, and anything else that isn't absolute
 * is relative to the referencing file. A bare name resolves there too, as
 * CSS reads url(x.png) that way; an import of a package then names no file
 * under src/assets, which is harmless. A ?query is left out.
 * @param specifier - The specifier as written
 * @param file - The referencing file's absolute path
 * @returns The absolute path it names, or null when it names no file in the repository (a scheme, the public folder's /, a fragment)
 */
function resolveSpecifier(specifier: string, file: string): string | null {
  const queryStart = specifier.indexOf('?')
  const path = (queryStart === -1) ? specifier : specifier.slice(0, queryStart)

  if (path.startsWith('@/')) {
    return join(SOURCE_DIRECTORY, path.slice(2))
  }

  if ((path === '') || path.startsWith('/') || path.startsWith('#') || SCHEME_PATTERN.test(path)) {
    return null
  }

  return resolve(dirname(file), path)
}

/**
 * Finds every file the production source imports or names in a CSS url().
 * @param sources - The production source files
 * @returns The absolute path of every file named
 * @throws Error naming a source file that can't be read
 */
function collectReferences(sources: readonly SourceFile[]): Set<string> {
  const references = new Set<string>()

  for (const source of sources) {
    let text: string

    try {
      text = readFileSync(source.path, 'utf8')
    } catch (error) {
      throw new Error(`can't read ${relative(ROOT, source.path)}: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      })
    }

    const code = stripComments(text, source.syntax)

    for (const match of [
      ...code.matchAll(IMPORT_PATTERN),
      ...code.matchAll(URL_PATTERN),
    ]) {
      const specifier = match[2]
      const path = (specifier === undefined) ? null : resolveSpecifier(specifier, source.path)

      if (path !== null) {
        references.add(path)
      }
    }
  }

  return references
}

/**
 * Checks the sprites' folder: each entry must be a file named like a sprite,
 * with an extension a sprite's file may have, and no sprite may have two
 * files.
 * @param problems - Where each problem found is added
 * @returns How many sprites have a file there, without a problem
 */
function checkSprites(problems: Problem[]): number {
  if (!existsSync(SPRITES_DIRECTORY)) {
    return 0
  }

  const fileNamesBySprite = new Map<string, string[]>()
  const entries = readdirSync(SPRITES_DIRECTORY, {
    withFileTypes: true,
  }).sort((first, second) => first.name.localeCompare(second.name))

  for (const entry of entries) {
    const path = join(SPRITES_DIRECTORY, entry.name)

    if (entry.isDirectory()) {
      problems.push({
        path: path,
        reason: 'a folder; the sprites\' folder holds only sprite files, and the loading screen downloads the files in it for nothing',
      })
      continue
    }

    const dot = entry.name.lastIndexOf('.')
    const baseName = (dot === -1) ? entry.name : entry.name.slice(0, dot)
    const extension = (dot === -1) ? '' : entry.name.slice(dot + 1)
    const reasons: string[] = []

    if (!isSpriteName(baseName)) {
      reasons.push(`${baseName} is not a sprite's name (see docs/sprites.md)`)
    }

    if (!SPRITE_EXTENSIONS.includes(extension)) {
      reasons.push(`a sprite's file must end in ${SPRITE_EXTENSIONS.map((allowed) => `.${allowed}`).join(' or ')}`)
    }

    if (reasons.length > 0) {
      problems.push({
        path: path,
        reason: reasons.join('; '),
      })
    } else {
      fileNamesBySprite.set(baseName, [
        ...fileNamesBySprite.get(baseName) ?? [],
        entry.name,
      ])
    }
  }

  let sprites = 0

  for (const [
    sprite,
    fileNames,
  ] of fileNamesBySprite) {
    if (fileNames.length === 1) {
      sprites++
      continue
    }

    for (const fileName of fileNames) {
      problems.push({
        path: join(SPRITES_DIRECTORY, fileName),
        reason: `sprite ${sprite} has more than one file (${fileNames.join(', ')}); the game draws one, and the loading screen downloads the others for nothing`,
      })
    }
  }

  return sprites
}

/**
 * Checks every file under src/assets.
 * @param problems - Where each problem found is added
 * @returns What was checked
 * @throws Error naming a source file that can't be read
 */
function checkAssets(problems: Problem[]): CheckTotals {
  const sourceFiles = listSources()
  const references = collectReferences(sourceFiles)
  let referenced = 0

  for (const path of listFiles(ASSETS_DIRECTORY)) {
    if (isInside(path, SPRITES_DIRECTORY)) {
      continue
    }

    if (references.has(path)) {
      referenced++
    } else {
      problems.push({
        path: path,
        reason: 'no production source imports it or names it in a CSS url(), yet the loading screen downloads it',
      })
    }
  }

  return {
    referenced: referenced,
    sprites: checkSprites(problems),
    sources: sourceFiles.length,
  }
}

/**
 * Checks every file under src/assets and reports each problem, or the
 * totals when there is none.
 * @returns Whether every file passed
 */
function runCheck(): boolean {
  const problems: Problem[] = []
  let totals: CheckTotals

  try {
    totals = checkAssets(problems)
  } catch (error) {
    console.error(`src/assets FAILED: ${error instanceof Error ? error.message : String(error)}`)

    return false
  }

  problems.sort((first, second) => first.path.localeCompare(second.path))

  for (const problem of problems) {
    console.error(`${relative(ROOT, problem.path)} FAILED: ${problem.reason}`)
  }

  if (problems.length > 0) {
    return false
  }

  console.log(`src/assets OK: ${totals.referenced} files referenced from ${totals.sources} production source files, ${totals.sprites} sprite files`)

  return true
}

if (!runCheck()) {
  process.exitCode = 1
}
