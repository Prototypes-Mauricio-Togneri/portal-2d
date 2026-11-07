import {formatChamberProblem} from '@/game/rules/chamber_problem'
import {loadChamber} from '@/game/rules/load_chamber'
import {CHAMBER_FILES, listChamberFiles} from '@scripts/chamber_files'
import {CHAMBER_CASES, type ChamberCase} from '@scripts/fixtures/format_examples'

// Loads every chamber file the way the v2 rules will (brought to the current
// format, every field read, the layout checked). Every chamber in
// src/chambers must load without an error, and each case in
// scripts/fixtures/format_examples.ts must report exactly the problems pinned
// for it. Prints one line per chamber and case, then any problem below it,
// and exits non-zero on any failure

/**
 * What loading a chamber file reported, as the check prints it.
 */
type LoadReport = {
  readonly loaded: boolean // Whether it loaded without an error
  readonly problems: readonly string[] // Every problem, one line each
}

/**
 * How many problems, in words.
 * @param count - The number of problems
 * @returns Such as "1 problem" or "3 problems"
 */
function countProblems(count: number): string {
  return (count === 1) ? '1 problem' : `${count} problems`
}

/**
 * Loads a chamber file and lists what it reports.
 * @param data - The file as parsed JSON
 * @returns Whether it loaded, and every problem as the check prints it
 */
function loadAndDescribe(data: unknown): LoadReport {
  const result = loadChamber(data)

  return {
    loaded: result.chamber !== null,
    problems: result.problems.map(formatChamberProblem),
  }
}

/**
 * Loads one of the chamber files the game plays.
 * @param file - Its file name
 * @returns Whether it loaded without an error
 */
function checkChamberFile(file: string): boolean {
  const data = CHAMBER_FILES[file]

  if (data === undefined) {
    console.error(`${file} FAILED: not listed in scripts/chamber_files.ts`)

    return false
  }

  const result = loadAndDescribe(data)
  const summary = (result.problems.length > 0) ? `: ${countProblems(result.problems.length)}` : ''

  if (result.loaded) {
    console.log(`${file} OK${summary}`)
  } else {
    console.error(`${file} FAILED${summary}`)
  }

  for (const problem of result.problems) {
    console.log(`  ${problem}`)
  }

  return result.loaded
}

/**
 * Loads a case and compares what it reports with what is pinned.
 * @param chamberCase - The case
 * @returns Whether it reported exactly the pinned problems
 */
function checkCase(chamberCase: ChamberCase): boolean {
  const reported = loadAndDescribe(chamberCase.data).problems
  const expected = chamberCase.problems

  if (reported.join('\n') === expected.join('\n')) {
    console.log(`case ${chamberCase.name} OK: ${countProblems(reported.length)}, as pinned`)

    return true
  }

  console.error(`case ${chamberCase.name} FAILED: it reports something other than what is pinned`)

  for (const problem of reported.filter((line) => !expected.includes(line))) {
    console.error(`  not pinned: ${problem}`)
  }

  for (const problem of expected.filter((line) => !reported.includes(line))) {
    console.error(`  not reported: ${problem}`)
  }

  if (reported.every((line) => expected.includes(line)) && expected.every((line) => reported.includes(line))) {
    console.error('  the same problems, in another order')
  }

  return false
}

/**
 * Checks every chamber file in src/chambers and every case.
 * @returns Whether all of them passed
 */
function runAll(): boolean {
  let passed = true

  for (const file of listChamberFiles()) {
    passed = checkChamberFile(file) && passed
  }

  for (const chamberCase of CHAMBER_CASES) {
    passed = checkCase(chamberCase) && passed
  }

  return passed
}

if (!runAll()) {
  process.exitCode = 1
}
