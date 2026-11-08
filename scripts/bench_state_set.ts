import {parseArgs} from 'node:util'
import {NO_ENTRY, StateSet} from '@/solver/state_set'
import {readNumberOption} from '@scripts/number_option'
import {createRandom} from '@scripts/seeded_random'

// Measures the solver's state set (docs/solver.md): adds seeded random
// 64-bit keys, each with a parent and an action, finds every one again with
// its parent and action, then checks that as many other keys are absent.
// Prints the times and the memory used; fails when a key is lost, a parent
// or action is wrong, an absent key is found, or the set's arrays take more
// than MAX_SET_BYTES. Run by hand; not part of npm run verify.
// Options: --keys=<number> (default 10000000), --seed=<number> (default 1)

/** Keys unless --keys says otherwise */
const DEFAULT_KEYS = 10_000_000

/** Seed unless --seed says otherwise */
const DEFAULT_SEED = 1

/** The most the set's arrays may take, the budget the roadmap sets */
const MAX_SET_BYTES = 250 * 1024 * 1024

/** Actions are numbered below this, like the rules' eleven */
const ACTION_COUNT = 11

/** Bytes in a mebibyte, for the report */
const MEBIBYTE = 1024 * 1024

/**
 * Makes a seeded source of 64-bit keys.
 * @param seed - The seed
 * @returns A function writing the next key's two words into the given pair
 */
function createKeys(seed: number): (key: Uint32Array) => void {
  const random = createRandom(seed)

  return (key: Uint32Array): void => {
    key[0] = Math.floor(random() * 4294967296)
    key[1] = Math.floor(random() * 4294967296)
  }
}

/**
 * Times a piece of work.
 * @param work - The work
 * @returns How long it took, in seconds
 */
function timeSeconds(work: () => void): number {
  const startTime = performance.now()

  work()

  return (performance.now() - startTime) / 1000
}

/**
 * Runs the benchmark and reports it.
 * @returns Whether every check passed
 */
function runBenchmark(): boolean {
  const options = parseArgs({
    options: {
      keys: {
        type: 'string',
      },
      seed: {
        type: 'string',
      },
    },
  }).values
  const keyCount = readNumberOption(options.keys, DEFAULT_KEYS, 'keys')
  const seed = readNumberOption(options.seed, DEFAULT_SEED, 'seed')
  const set = new StateSet(keyCount)
  const key = new Uint32Array(2)
  const failures: string[] = []
  let duplicates = 0
  let wrongEntries = 0
  let foundAbsent = 0

  const addSeconds = timeSeconds(() => {
    const nextKey = createKeys(seed)

    for (let i = 0; i < keyCount; i++) {
      nextKey(key)

      if (set.addIfAbsent(key[0] ?? 0, key[1] ?? 0, i - 1, i % ACTION_COUNT) === NO_ENTRY) {
        duplicates++
      }
    }
  })

  const findSeconds = timeSeconds(() => {
    const nextKey = createKeys(seed)

    for (let i = 0; i < keyCount; i++) {
      nextKey(key)

      const entry = set.find(key[0] ?? 0, key[1] ?? 0)

      if ((entry === NO_ENTRY) || (set.keyLow(entry) !== key[0]) || (set.keyHigh(entry) !== key[1])) {
        wrongEntries++
      } else if ((duplicates === 0) && ((set.parentOf(entry) !== (i - 1)) || (set.actionOf(entry) !== (i % ACTION_COUNT)))) {
        wrongEntries++
      }
    }
  })

  const absentSeconds = timeSeconds(() => {
    const nextKey = createKeys(seed + 1)

    for (let i = 0; i < keyCount; i++) {
      nextKey(key)

      if (set.find(key[0] ?? 0, key[1] ?? 0) !== NO_ENTRY) {
        foundAbsent++
      }
    }
  })

  const memory = process.memoryUsage()

  console.log(`Seed ${seed}, ${keyCount} keys, ${set.size} held, ${duplicates} drawn twice`)
  console.log(`add ${addSeconds.toFixed(2)} s, find ${findSeconds.toFixed(2)} s, find absent ${absentSeconds.toFixed(2)} s`)
  console.log(`set arrays ${(set.byteSize / MEBIBYTE).toFixed(0)} MiB, rss ${(memory.rss / MEBIBYTE).toFixed(0)} MiB, array buffers ${(memory.arrayBuffers / MEBIBYTE).toFixed(0)} MiB, heap used ${(memory.heapUsed / MEBIBYTE).toFixed(0)} MiB`)

  if (wrongEntries > 0) {
    failures.push(`${wrongEntries} keys not found again, or found with the wrong parent or action`)
  }

  if (foundAbsent > 0) {
    failures.push(`${foundAbsent} keys found that were never added`)
  }

  if (set.byteSize > MAX_SET_BYTES) {
    failures.push(`the set's arrays take more than ${MAX_SET_BYTES / MEBIBYTE} MiB`)
  }

  for (const failure of failures) {
    console.error(`FAILED: ${failure}`)
  }

  return failures.length === 0
}

if (!runBenchmark()) {
  process.exitCode = 1
}
