import {GameEvent} from '@/game/game_event'
import {CHAMBER_FIELDS} from '@/game/rules/chamber_parser'
import {formatChamberProblem} from '@/game/rules/chamber_problem'
import {CompiledChamber, type LinkTarget, NO_ELEMENT, type PlacedKind} from '@/game/rules/compiled_chamber'
import type {ElementDefinition} from '@/game/rules/element_definition'
import {CORE_STEP_EVENTS, ELEMENT_REGISTRY} from '@/game/rules/element_registry'
import {loadChamber, readChamber} from '@/game/rules/load_chamber'
import {CHAMBER_FILES, listChamberFiles} from '@scripts/chamber_files'
import {listFixtureChambers} from '@scripts/fixtures/fixtures'
import {CHAMBER_CASES, type ChamberCase, FORMAT_V2_EXAMPLE} from '@scripts/fixtures/format_examples'

// Loads every chamber file the way the game does (every field read, the
// layout checked). Every chamber in src/chambers must load without an error,
// and each case in scripts/fixtures/format_examples.ts must report exactly
// the problems pinned for it. The format 2 example, compiled, must reach
// exactly the pinned links (its link group expanded) and refuse portals on
// exactly the pinned walls. Every chamber file, fixture chamber and the
// format 2 example, compiled, must answer wall, no portals and no element on
// the ring of tiles just outside its edge. Then checks the element registry
// against the format: every element's field is one the parser accepts and
// is registered once, and every game event has one owner. Prints one line
// per chamber, case, compiled example and registry check, then any problem
// below it, and exits non-zero on any failure

/** What each button's and switch's links reach in the compiled format 2 example: its group stands for the door and the barrier, in that order */
const EXAMPLE_LINKS: readonly string[] = [
  'button 0: door 0, barrier 0',
  'switch 0: door 0, barrier 0, exit 0',
]

/** The wall tiles of the compiled format 2 example that refuse portals, row by row from the bottom: the wall in the middle and the top row */
const EXAMPLE_WALLS_REFUSING_PORTALS: readonly string[] = [
  '(3, 2)',
  '(0, 4)',
  '(1, 4)',
  '(2, 4)',
  '(3, 4)',
  '(4, 4)',
  '(5, 4)',
  '(6, 4)',
]

/** The registry's element definitions, read through the plain definition type */
const DEFINITIONS: readonly ElementDefinition[] = ELEMENT_REGISTRY

/** The element types the compiled chamber finds by tile, in registry order */
const PLACED_KINDS: readonly PlacedKind[] = ELEMENT_REGISTRY
  .map((definition) => definition.kind)
  .filter((kind): kind is PlacedKind => (kind !== 'wall') && (kind !== 'box'))

/** Wrong answers listed for one chamber before the rest are only counted */
const LISTED_MISMATCHES = 5

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
 * Compiles a chamber, read without the layout checks, and asks about every
 * tile on the ring just outside its edge: each must be a wall that takes no
 * portals and holds no element.
 * @param label - What the chamber is, for the report
 * @param data - The chamber file as parsed JSON
 * @returns Whether every tile on the ring answered as it must
 */
function checkOutsideEdge(label: string, data: unknown): boolean {
  const read = readChamber(data)

  if (read.chamber === null) {
    console.error(`outside the edge of ${label} FAILED: it doesn't read: ${read.problems.map((problem) => problem.message).join('; ')}`)

    return false
  }

  const compiled = new CompiledChamber(read.chamber)
  const mismatches: string[] = []
  let tiles = 0

  for (let y = -1; y <= compiled.height; y++) {
    for (let x = -1; x <= compiled.width; x++) {
      if ((x >= 0) && (y >= 0) && (x < compiled.width) && (y < compiled.height)) {
        continue
      }

      tiles++

      if (!compiled.isWall(x, y)) {
        mismatches.push(`(${x}, ${y}) is not a wall`)
      }

      if (compiled.takesPortals(x, y)) {
        mismatches.push(`(${x}, ${y}) takes portals`)
      }

      for (const kind of PLACED_KINDS) {
        if (compiled.elementAt(kind, x, y) !== NO_ELEMENT) {
          mismatches.push(`(${x}, ${y}) holds ${kind} ${compiled.elementAt(kind, x, y)}`)
        }
      }
    }
  }

  if (mismatches.length === 0) {
    console.log(`outside the edge of ${label} OK: ${tiles} tiles, each a wall that takes no portals and holds no element`)

    return true
  }

  const more = (mismatches.length > LISTED_MISMATCHES) ? `; and ${mismatches.length - LISTED_MISMATCHES} more` : ''

  console.error(`outside the edge of ${label} FAILED: ${mismatches.slice(0, LISTED_MISMATCHES).join('; ')}${more}`)

  return false
}

/**
 * Lists the lines of one list that the other doesn't have, under a label.
 * @param label - What the lines are, such as "not pinned"
 * @param lines - The lines to look through
 * @param other - The lines to look for them in
 */
function printMissing(label: string, lines: readonly string[], other: readonly string[]): void {
  for (const line of lines.filter((candidate) => !other.includes(candidate))) {
    console.error(`  ${label}: ${line}`)
  }
}

/**
 * Compiles the format 2 example and compares its links and the walls that
 * refuse portals with what is pinned.
 * @returns Whether both are as pinned
 */
function checkCompiledExample(): boolean {
  const compiled = new CompiledChamber(FORMAT_V2_EXAMPLE)
  const describe = (targets: readonly LinkTarget[]): string => targets.map((target) => `${target.kind} ${target.index}`).join(', ')
  const links = [
    ...(FORMAT_V2_EXAMPLE.buttons ?? []).map((_, index) => `button ${index}: ${describe(compiled.linksOf('button', index))}`),
    ...(FORMAT_V2_EXAMPLE.switches ?? []).map((_, index) => `switch ${index}: ${describe(compiled.linksOf('switch', index))}`),
  ]
  const refusing: string[] = []

  for (let y = 0; y < compiled.height; y++) {
    for (let x = 0; x < compiled.width; x++) {
      if (compiled.isWall(x, y) && (!compiled.takesPortals(x, y))) {
        refusing.push(`(${x}, ${y})`)
      }
    }
  }

  const linksPinned = links.join('\n') === EXAMPLE_LINKS.join('\n')
  const wallsPinned = refusing.join('\n') === EXAMPLE_WALLS_REFUSING_PORTALS.join('\n')

  if (linksPinned && wallsPinned) {
    console.log(`compiled format_v2_example OK: ${links.length} link lists and ${refusing.length} walls refusing portals, as pinned`)

    return true
  }

  console.error('compiled format_v2_example FAILED: its links or the walls refusing portals differ from what is pinned')
  printMissing('links not pinned', links, EXAMPLE_LINKS)
  printMissing('links not reached', EXAMPLE_LINKS, links)
  printMissing('wall refusing portals, not pinned', refusing, EXAMPLE_WALLS_REFUSING_PORTALS)
  printMissing('wall pinned as refusing portals, but takes them', EXAMPLE_WALLS_REFUSING_PORTALS, refusing)

  return false
}

/**
 * Checks that the parser accepts every element's field.
 * @returns Whether every element's field is in the parser's field list
 */
function checkRegistryFields(): boolean {
  const notAccepted = DEFINITIONS.filter((definition) => !CHAMBER_FIELDS.includes(definition.fileKey))

  if (notAccepted.length === 0) {
    console.log('registry fields OK: the parser accepts every element\'s field')

    return true
  }

  console.error('registry fields FAILED: the parser doesn\'t accept some elements\' fields')

  for (const definition of notAccepted) {
    console.error(`  ${definition.kind}: ${definition.fileKey} is not in the parser's field list`)
  }

  return false
}

/**
 * Checks that no two elements share a field of the chamber file.
 * @returns Whether each element's field is registered once
 */
function checkRegistryElements(): boolean {
  const registered = DEFINITIONS.map((definition) => definition.fileKey)
  const registeredTwice = registered.filter((field, index) => registered.indexOf(field) !== index)

  if (registeredTwice.length === 0) {
    console.log(`registry elements OK: ${registered.length} elements, each field registered once`)

    return true
  }

  console.error('registry elements FAILED: some fields are registered twice')

  for (const field of registeredTwice) {
    console.error(`  registered twice: ${field}`)
  }

  return false
}

/**
 * Checks that each game event is reported by exactly one owner: an element
 * or the core step.
 * @returns Whether every event has one owner
 */
function checkRegistryEvents(): boolean {
  const events = Object.values(GameEvent)
  const wrong: string[] = []

  for (const event of events) {
    const owners = DEFINITIONS.filter((definition) => definition.events.includes(event)).map((definition) => definition.kind)

    if (CORE_STEP_EVENTS.includes(event)) {
      owners.push('the core step')
    }

    if (owners.length === 0) {
      wrong.push(`${event}: no owner`)
    } else if (owners.length > 1) {
      wrong.push(`${event}: ${owners.length} owners (${owners.join(', ')})`)
    }
  }

  if (wrong.length === 0) {
    console.log(`registry events OK: ${events.length} events, one owner each`)

    return true
  }

  console.error('registry events FAILED: some events don\'t have exactly one owner')

  for (const line of wrong) {
    console.error(`  ${line}`)
  }

  return false
}

/**
 * Checks that each element that blocks walking, shots or shooting only
 * while blocked has a blocked flag, which the step reads; without one, the
 * step would never see it block.
 * @returns Whether every such element has a flag
 */
function checkRegistryFlags(): boolean {
  const unflagged = DEFINITIONS.filter((definition) => (definition.defaultBlocked === null) && (
    (definition.blocksWalking === 'whenBlocked') ||
    (definition.blocksShots === 'whenBlocked') ||
    (definition.stopsShootingFrom === 'whenBlocked')
  ))

  if (unflagged.length === 0) {
    console.log('registry flags OK: every element that blocks only while blocked has a blocked flag')

    return true
  }

  console.error('registry flags FAILED: some elements block only while blocked but have no blocked flag')

  for (const definition of unflagged) {
    console.error(`  ${definition.kind}`)
  }

  return false
}

/**
 * Checks every chamber file in src/chambers, every case, the compiled format
 * 2 example, the ring outside every chamber's edge and the element registry.
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

  passed = checkCompiledExample() && passed

  // A chamber file missing from the shared list has already failed above
  for (const file of listChamberFiles()) {
    const data = CHAMBER_FILES[file]

    if (data !== undefined) {
      passed = checkOutsideEdge(file, data) && passed
    }
  }

  for (const fixtureChamber of listFixtureChambers()) {
    passed = checkOutsideEdge(`fixture chamber of ${fixtureChamber.name}`, fixtureChamber.chamber) && passed
  }

  passed = checkOutsideEdge('format_v2_example', FORMAT_V2_EXAMPLE) && passed

  passed = checkRegistryFields() && passed
  passed = checkRegistryElements() && passed
  passed = checkRegistryEvents() && passed
  passed = checkRegistryFlags() && passed

  return passed
}

if (!runAll()) {
  process.exitCode = 1
}
