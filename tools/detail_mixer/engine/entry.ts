// The mixer's engine: the game's real chambers, rules and renderer behind a
// small API a mock-up page can call. Bundled by engine/vite.config.mjs into
// build/engine.js, which defines the global `ChamberEngine`. Nothing here is
// part of the game; it is never built or shipped with it.
//
//   ChamberEngine.ready                     resolves once every sprite is decoded
//   ChamberEngine.chambers                  [{name, width, height, steps}]
//   ChamberEngine.grid(index)               what each tile holds, as the screen shows it
//   ChamberEngine.instances(index, step)    every element, box and the subject in a state
//   ChamberEngine.render(canvas, index, tileSize, options)
//
// `step` counts actions of the chamber's recorded solution: 0 is the settled
// start, `chambers[index].steps` the completed chamber. The playground has no
// recorded solution, so only step 0.

import chamber0 from '@/chambers/chamber_0.json'
import solution0 from '@/chambers/chamber_0.solution.json'
import chamber1 from '@/chambers/chamber_1.json'
import solution1 from '@/chambers/chamber_1.solution.json'
import chamber2 from '@/chambers/chamber_2.json'
import solution2 from '@/chambers/chamber_2.solution.json'
import chamber3 from '@/chambers/chamber_3.json'
import solution3 from '@/chambers/chamber_3.solution.json'
import chamber4 from '@/chambers/chamber_4.json'
import solution4 from '@/chambers/chamber_4.solution.json'
import chamber5 from '@/chambers/chamber_5.json'
import solution5 from '@/chambers/chamber_5.solution.json'
import chamber6 from '@/chambers/chamber_6.json'
import solution6 from '@/chambers/chamber_6.solution.json'
import chamber7 from '@/chambers/chamber_7.json'
import solution7 from '@/chambers/chamber_7.solution.json'
import chamber8 from '@/chambers/chamber_8.json'
import solution8 from '@/chambers/chamber_8.solution.json'
import chamber9 from '@/chambers/chamber_9.json'
import solution9 from '@/chambers/chamber_9.solution.json'
import playground from '@/dev/playground.json'
import type {ChamberData} from '@/game/chamber_data'
import {Renderer} from '@/game/renderer'
import type {Action} from '@/game/rules/action'
import {CompiledChamber, NO_ELEMENT, type PlacedKind} from '@/game/rules/compiled_chamber'
import {ELEMENT_REGISTRY} from '@/game/rules/element_registry'
import {loadChamber} from '@/game/rules/load_chamber'
import type {RulesState} from '@/game/rules/rules_state'
import {NOT_STORED} from '@/game/rules/state_layout'
import {startChamber, step} from '@/game/rules/step'
import {loadSprites} from '@/game/sprite_sources'

type Listing = {
  name: string // What the page calls it
  data: unknown // Its chamber file
  actions: readonly string[] // Its recorded solution's actions, none for the playground
}

/** What the page may pass to render() */
type RenderOptions = {
  step?: number // Actions of the recorded solution played before drawing; 0, the settled start, by default
  surfaceDetail?: boolean // Whether the game's own surface detail (floor and walls) is drawn; true by default
  hooks?: Record<string, ((...parts: never[]) => unknown) | undefined> // The page's own drawing, see engine/patch_sources.py: floor, walls, skin, afterTile
}

const LIST: Listing[] = [
  {name: 'Tutorial', data: chamber0, actions: solution0.actions},
  {name: 'Chamber 1', data: chamber1, actions: solution1.actions},
  {name: 'Chamber 2', data: chamber2, actions: solution2.actions},
  {name: 'Chamber 3', data: chamber3, actions: solution3.actions},
  {name: 'Chamber 4', data: chamber4, actions: solution4.actions},
  {name: 'Chamber 5', data: chamber5, actions: solution5.actions},
  {name: 'Chamber 6', data: chamber6, actions: solution6.actions},
  {name: 'Chamber 7', data: chamber7, actions: solution7.actions},
  {name: 'Chamber 8', data: chamber8, actions: solution8.actions},
  {name: 'Chamber 9', data: chamber9, actions: solution9.actions},
  {name: 'Playground', data: playground, actions: []},
]

const compiled = new Map<number, CompiledChamber>() // Each chamber, compiled the first time it is asked for
const playthroughs = new Map<number, RulesState[]>() // Each chamber's states along its recorded solution, as far as they have been asked for

function chamberOf(index: number): CompiledChamber {
  let chamber = compiled.get(index)

  if (chamber === undefined) {
    const loaded = loadChamber(LIST[index]!.data as ChamberData)

    if (loaded.chamber === null) {
      throw new Error(loaded.problems.map((problem) => problem.message).join('; '))
    }

    chamber = new CompiledChamber(loaded.chamber)
    compiled.set(index, chamber)
  }

  return chamber
}

/** The state after a number of the recorded solution's actions, played with the game's own rules. */
function stateAt(index: number, stepNumber = 0): RulesState {
  const chamber = chamberOf(index)
  const actions = LIST[index]!.actions
  const wanted = Math.max(0, Math.min(Math.floor(stepNumber), actions.length))
  let states = playthroughs.get(index)

  if (states === undefined) {
    states = [startChamber(chamber).state]
    playthroughs.set(index, states)
  }

  while (states.length <= wanted) {
    states.push(step(chamber, states[states.length - 1]!, actions[states.length - 1] as Action).state)
  }

  return states[wanted]!
}

/** Resolves once every sprite is decoded */
export const ready = loadSprites()

/** Each chamber's name, its size in tiles, and how many actions its recorded solution has */
export const chambers = LIST.map((entry, index) => {
  const chamber = chamberOf(index)

  return {name: entry.name, width: chamber.width, height: chamber.height, steps: entry.actions.length}
})

/**
 * A chamber's tiles as the screen shows them, row 0 at the top: whether each is a wall, a blocked
 * wall's steel or an emitter's or receiver's wall, and which element types sit on it (with 'box'
 * and 'subject' on their start tiles). The same in every state.
 */
export function grid(index: number): {width: number, height: number, cells: {wall: boolean, steel: boolean, device: boolean, kinds: string[]}[]} {
  const chamber = chamberOf(index)
  const cells = []

  for (let row = 0; row < chamber.height; row++) {
    const y = chamber.height - 1 - row

    for (let x = 0; x < chamber.width; x++) {
      const kinds: string[] = []

      for (const definition of ELEMENT_REGISTRY) {
        if ((definition.kind !== 'wall') && (definition.kind !== 'box') && (chamber.elementAt(definition.kind, x, y) !== NO_ELEMENT)) {
          kinds.push(definition.kind)
        }
      }

      if (chamber.boxStarts.some((box) => (box.x === x) && (box.y === y))) {
        kinds.push('box')
      }

      if ((chamber.subjectStart.x === x) && (chamber.subjectStart.y === y)) {
        kinds.push('subject')
      }

      cells.push({
        wall: chamber.isWall(x, y),
        steel: kinds.includes('blockedWall'),
        device: kinds.includes('emitter') || kinds.includes('receiver'),
        kinds: kinds,
      })
    }
  }

  return {width: chamber.width, height: chamber.height, cells: cells}
}

/**
 * Everything in a chamber in one state, with what the game itself knows each by, so a page can
 * give each instance a look of its own: every placed element (its type, its index in the chamber
 * file's list, its tile, and its state), every box and the subject. Rows count from the top, as
 * the screen shows them; `y` counts from the bottom, as the game does.
 */
export function instances(index: number, stepNumber = 0): unknown {
  const chamber = chamberOf(index)
  const state = stateAt(index, stepNumber)
  const elements = []

  for (const definition of ELEMENT_REGISTRY) {
    if ((definition.kind === 'wall') || (definition.kind === 'box')) {
      continue
    }

    const kind: PlacedKind = definition.kind

    chamber.entriesOf(kind).forEach((entry, i) => {
      elements.push({
        kind: kind,
        index: i,
        x: entry.x,
        y: entry.y,
        row: chamber.height - 1 - entry.y,
        xTo: entry.xTo ?? entry.x,
        yTo: entry.yTo ?? entry.y,
        // Whether a link reaches it, so its blocked flag can change while the chamber is played; null for a type with no such flag
        linked: ('defaultBlocked' in definition) ? chamber.stateLayout.flagOffset(kind as never, i) !== NOT_STORED : null,
        blocked: ('defaultBlocked' in definition) ? state.isBlocked(kind as never, i) : null,
        pressed: (kind === 'button') ? state.isButtonPressed(i) : null,
        pointing: (kind === 'arrow') ? state.pointingWay('arrow', i) : null,
      })
    })
  }

  return {
    step: stepNumber,
    completed: state.completed,
    subject: {
      x: state.subjectX,
      y: state.subjectY,
      row: chamber.height - 1 - state.subjectY,
      facing: state.facing,
      carriedBox: state.isCarrying ? state.carriedBox : null,
    },
    boxes: chamber.boxStarts.map((start, i) => ({
      index: i,
      x: state.boxX(i),
      y: state.boxY(i),
      row: chamber.height - 1 - state.boxY(i),
      startX: start.x,
      startY: start.y,
      carried: state.isCarrying && (state.carriedBox === i),
      mirror: chamber.mirrorOf(i),
    })),
    elements: elements,
  }
}

/**
 * Draws a chamber as the game does, at a tile size, in the state after some of its recorded
 * solution's actions. The page's hooks draw over the game's own layers (engine/patch_sources.py
 * says where each one runs and what it is given).
 */
export function render(canvas: HTMLCanvasElement, index: number, tileSize: number, options: RenderOptions = {}): void {
  const chamber = chamberOf(index)
  const mixer = globalThis as {__mixer?: unknown}

  mixer.__mixer = {
    surfaceDetail: options.surfaceDetail !== false,
    hooks: options.hooks ?? {},
  }

  try {
    // A renderer of its own each time, so nothing drawn with other hooks is kept
    const renderer = new Renderer(canvas, tileSize * chamber.width, tileSize * chamber.height)

    renderer.setSize(chamber.width, chamber.height)
    renderer.render(stateAt(index, options.step ?? 0))
  } finally {
    mixer.__mixer = undefined
  }
}
