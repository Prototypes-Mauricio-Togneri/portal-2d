import {existsSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs'
import {extname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseArgs} from 'node:util'

// Watches the build's size: totals the bytes of every file under dist/assets
// (the last npm run build) by kind, and compares each kind with the baseline
// in scripts/bundle_baseline.json. A kind fails when it has grown by more
// than 10% of its baseline and by more than 10 KB; shrinking is fine. Prints
// one line per kind, and exits non-zero on any failure.
// Options: --update writes the baseline from dist/assets instead of checking
// (npm run bundle:baseline builds first)

/**
 * A kind of file in the build, as the sizes are totalled.
 */
type BundleKind = 'js' | 'css' | 'images' | 'audio' | 'other'

/**
 * The bytes of each kind of file.
 */
type BundleSizes = Record<BundleKind, number>

/** Every kind, in the order they are printed and stored */
const BUNDLE_KINDS: readonly BundleKind[] = [
  'js',
  'css',
  'images',
  'audio',
  'other',
]

/** The kind of each file extension, lowercase without its dot; any other extension is 'other' */
const KIND_OF_EXTENSION: Readonly<Record<string, BundleKind>> = {
  js: 'js',
  mjs: 'js',
  css: 'css',
  webp: 'images',
  png: 'images',
  jpg: 'images',
  jpeg: 'images',
  gif: 'images',
  svg: 'images',
  avif: 'images',
  ico: 'images',
  mp3: 'audio',
  ogg: 'audio',
  wav: 'audio',
  m4a: 'audio',
  aac: 'audio',
  flac: 'audio',
  opus: 'audio',
}

/** Growth past this share of a kind's baseline fails, when it is also past MAX_GROWTH_BYTES */
const MAX_GROWTH_SHARE = 0.1

/** Growth past this many bytes fails, when it is also past MAX_GROWTH_SHARE of the baseline */
const MAX_GROWTH_BYTES = 10 * 1024

/** The build's assets, as Vite writes them */
const BUNDLE_DIRECTORY = fileURLToPath(new URL('../dist/assets/', import.meta.url))

/** The stored baseline */
const BASELINE_FILE = fileURLToPath(new URL('bundle_baseline.json', import.meta.url))

/**
 * Whether a text names a kind of file.
 * @param text - The text, such as a key of the baseline
 * @returns True when it is a kind
 */
function isBundleKind(text: string): text is BundleKind {
  return BUNDLE_KINDS.some((kind) => kind === text)
}

/**
 * Sizes with every kind at 0 bytes.
 * @returns The sizes
 */
function emptySizes(): BundleSizes {
  return {
    js: 0,
    css: 0,
    images: 0,
    audio: 0,
    other: 0,
  }
}

/**
 * Totals the bytes of every file under dist/assets, at any depth, by kind.
 * @returns The bytes of each kind
 * @throws Error when dist/assets is missing
 */
function measureBundle(): BundleSizes {
  if (!existsSync(BUNDLE_DIRECTORY)) {
    throw new Error('dist/assets/ is missing; run npm run build first')
  }

  const sizes = emptySizes()
  const entries = readdirSync(BUNDLE_DIRECTORY, {
    recursive: true,
    withFileTypes: true,
  })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      continue
    }

    const kind = KIND_OF_EXTENSION[extname(entry.name).slice(1).toLowerCase()] ?? 'other'

    sizes[kind] += statSync(join(entry.parentPath, entry.name)).size
  }

  return sizes
}

/**
 * Reads the stored baseline. A kind it leaves out counts as 0 bytes.
 * @returns The baseline bytes of each kind
 * @throws Error when the file is missing or malformed
 */
function readBaseline(): BundleSizes {
  if (!existsSync(BASELINE_FILE)) {
    throw new Error('it is missing; run npm run bundle:baseline')
  }

  let value: unknown

  try {
    value = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'))
  } catch (error) {
    throw new Error(`it is not valid JSON: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    })
  }

  if ((typeof value !== 'object') || (value === null) || Array.isArray(value)) {
    throw new Error('it is not an object of bytes by kind')
  }

  const baseline = emptySizes()

  for (const [
    key,
    bytes,
  ] of Object.entries(value)) {
    if (!isBundleKind(key)) {
      throw new Error(`${key} is not a kind; the kinds are ${BUNDLE_KINDS.join(', ')}`)
    }

    if ((typeof bytes !== 'number') || (!Number.isSafeInteger(bytes)) || (bytes < 0)) {
      throw new Error(`${key} is not a whole number of bytes of zero or more`)
    }

    baseline[key] = bytes
  }

  return baseline
}

/**
 * Writes the baseline.
 * @param sizes - The bytes of each kind
 */
function writeBaseline(sizes: BundleSizes): void {
  writeFileSync(BASELINE_FILE, `${JSON.stringify(sizes, null, 2)}\n`)
}

/**
 * Describes a kind's size against its baseline.
 * @param current - Its bytes now
 * @param baseline - Its baseline bytes
 * @returns Both sizes, the change and its share of the baseline
 */
function describeChange(current: number, baseline: number): string {
  const change = current - baseline
  const sign = (change > 0) ? '+' : ''
  let share = 'new'

  if (baseline > 0) {
    share = `${sign}${((change / baseline) * 100).toFixed(1)}%`
  } else if (change === 0) {
    share = '0.0%'
  }

  return `${baseline} bytes in the baseline, ${current} bytes now, ${sign}${change} bytes (${share})`
}

/**
 * Checks every kind against the baseline, or writes the baseline with
 * --update, and reports each kind.
 * @returns Whether every kind passed, or the baseline was written
 */
function runCheck(): boolean {
  const update = parseArgs({
    options: {
      update: {
        type: 'boolean',
      },
    },
  }).values.update === true
  let sizes: BundleSizes

  try {
    sizes = measureBundle()
  } catch (error) {
    console.error(`dist/assets FAILED: ${error instanceof Error ? error.message : String(error)}`)

    return false
  }

  if (update) {
    try {
      writeBaseline(sizes)
    } catch (error) {
      console.error(`scripts/bundle_baseline.json FAILED: ${error instanceof Error ? error.message : String(error)}`)

      return false
    }

    console.log('scripts/bundle_baseline.json written:')

    for (const kind of BUNDLE_KINDS) {
      console.log(`${kind} ${sizes[kind]} bytes`)
    }

    return true
  }

  let baseline: BundleSizes

  try {
    baseline = readBaseline()
  } catch (error) {
    console.error(`scripts/bundle_baseline.json FAILED: ${error instanceof Error ? error.message : String(error)}`)

    return false
  }

  let passed = true

  for (const kind of BUNDLE_KINDS) {
    const change = sizes[kind] - baseline[kind]
    const description = describeChange(sizes[kind], baseline[kind])

    if ((change > baseline[kind] * MAX_GROWTH_SHARE) && (change > MAX_GROWTH_BYTES)) {
      console.error(`${kind} FAILED: ${description}, more than ${MAX_GROWTH_SHARE * 100}% and ${MAX_GROWTH_BYTES / 1024} KB over the baseline`)
      passed = false
    } else {
      console.log(`${kind} OK: ${description}`)
    }
  }

  return passed
}

if (!runCheck()) {
  process.exitCode = 1
}
