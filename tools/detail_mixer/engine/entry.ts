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
//   ChamberEngine.stepEvents(index, step)   what happened in the step that led to a state
//   ChamberEngine.play(targets, index, tileSize, options)   the recorded solution replayed with the game's animation
//
// Besides the game's chambers and the playground, `chambers` lists line-up boards (`board` names
// the thing): a dozen of one thing side by side, read without the layout checks.
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
import {loadChamber, readChamber} from '@/game/rules/load_chamber'
import type {RulesState} from '@/game/rules/rules_state'
import {NOT_STORED} from '@/game/rules/state_layout'
import {startChamber, step} from '@/game/rules/step'
import {loadSprites} from '@/game/sprite_sources'
import {BoxFall} from '@/game/box_fall'
import {ElementTransitions} from '@/game/element_transitions'
import {exitOuterSide} from '@/game/exit_shadow'
import {FizzleParticles} from '@/game/fizzle_particles'
import {GameEvent} from '@/game/game_event'
import {MissRipple} from '@/game/miss_ripple'
import {PortalOpenings} from '@/game/portal_openings'
import type {PortalColor} from '@/game/rules/portal_color'
import {legReach, StepAnimation} from '@/game/step_animation'
import {SubjectTurn} from '@/game/subject_turn'

type Listing = {
  name: string // What the page calls it
  data: unknown // Its chamber file
  actions: readonly string[] // Its recorded solution's actions, none for the playground
  board?: string // For a line-up board, the thing it lines up; read without the layout checks
}

// ---------- Line-up boards: a dozen of one thing side by side on the real floor ----------

const BOARD_WIDTH = 14 // Tiles across a board: twelve things and a wall each side
const WAYS = ['UP', 'RIGHT', 'DOWN', 'LEFT']

/** A board: a room of floor in a ring of walls, the exit in its left wall, the subject in a corner (the page hides it). */
function board(height: number, fill: Record<string, unknown>): unknown {
  return {
    version: 2,
    size: {width: BOARD_WIDTH, height: height},
    subject: {x: BOARD_WIDTH - 2, y: 1, direction: 'UP'},
    exit: {x: 0, y: Math.floor(height / 2)},
    walls: [
      {xFrom: 0, xTo: BOARD_WIDTH - 1, yFrom: 0, yTo: 0},
      {xFrom: 0, xTo: BOARD_WIDTH - 1, yFrom: height - 1, yTo: height - 1},
      {xFrom: 0, xTo: 0, yFrom: 1, yTo: Math.floor(height / 2) - 1},
      {xFrom: 0, xTo: 0, yFrom: Math.floor(height / 2) + 1, yTo: height - 2},
      {xFrom: BOARD_WIDTH - 1, xTo: BOARD_WIDTH - 1, yFrom: 1, yTo: height - 2},
    ],
    ...fill,
  }
}

/** Twelve things in a row, one per column from 1. */
function row(y: number, make: (x: number, i: number) => Record<string, unknown>): Record<string, unknown>[] {
  return Array.from({length: 12}, (_unused, i) => ({x: i + 1, y: y, ...make(i + 1, i)}))
}

const BOARDS: Listing[] = [
  {name: 'Line-up: boxes', board: 'box', actions: [], data: board(5, {boxes: row(2, () => ({}))})},
  {name: 'Line-up: mirror boxes', board: 'box_mirror', actions: [], data: board(5, {boxes: row(2, (_x, i) => ({mirror: (i < 6) ? '/' : '\\'}))})},
  // Top row released; bottom row the same twelve looks pressed, each held by a box the page hides
  {name: 'Line-up: buttons', board: 'button', actions: [], data: board(6, {buttons: [...row(3, () => ({links: []})), ...row(1, () => ({links: []}))], boxes: row(1, () => ({}))})},
  {name: 'Line-up: switches', board: 'switch', actions: [], data: board(5, {switches: row(2, () => ({links: []}))})},
  {name: 'Line-up: arrows', board: 'arrow', actions: [], data: board(5, {arrows: row(2, (_x, i) => ({direction: WAYS[i % 4]}))})},
  {name: 'Line-up: turnable arrows', board: 'turntable', actions: [], data: board(5, {arrows: row(2, (_x, i) => ({direction: WAYS[i % 4], id: i + 1, turnedDirection: WAYS[(i + 1) % 4]}))})},
  // Top: one pit twelve tiles long; bottom: twelve grates, each on its own
  {name: 'Line-up: ditches', board: 'ditch', actions: [], data: board(6, {ditches: [...row(3, () => ({})), ...row(1, () => ({blocked: false}))]})},
  // A box set on a grate falls when the button under the other box is freed; the subject carries that one, turning, onto
  // the button and into a fizzler, where it breaks up from its hands; the button turns an arrow both ways and slides the grate
  {
    name: 'Motion: fall, break-up, turns',
    board: 'motion',
    actions: ['interact', 'turnUp', 'turnRight', 'right', 'right', 'interact', 'turnDown', 'interact', 'down', 'down'],
    data: board(6, {
      subject: {x: 1, y: 3, direction: 'RIGHT'},
      boxes: [{x: 2, y: 3}, {x: 3, y: 2}],
      buttons: [{x: 3, y: 2, links: [1, 2]}],
      ditches: [{x: 4, y: 3, id: 1}],
      fizzlers: [{x: 3, y: 1}],
      arrows: [{x: 7, y: 3, direction: 'UP', id: 2, turnedDirection: 'RIGHT'}, {x: 9, y: 3, direction: 'LEFT'}],
      switches: [{x: 9, y: 2, links: []}],
    }),
  },
]

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
  ...BOARDS,
]

const compiled = new Map<number, CompiledChamber>() // Each chamber, compiled the first time it is asked for
const playthroughs = new Map<number, RulesState[]>() // Each chamber's states along its recorded solution, as far as they have been asked for
const playEvents = new Map<number, (readonly string[])[]>() // The events of each step along it, the settled start's first

function chamberOf(index: number): CompiledChamber {
  let chamber = compiled.get(index)

  if (chamber === undefined) {
    const loaded = (LIST[index]!.board === undefined) ? loadChamber(LIST[index]!.data as ChamberData) : readChamber(LIST[index]!.data as ChamberData)

    if (loaded.chamber === null) {
      throw new Error(loaded.problems.map((problem) => problem.message).join('; '))
    }

    chamber = new CompiledChamber(loaded.chamber)
    compiled.set(index, chamber)
  }

  return chamber
}

/** A flag the game keeps for some element types only: null for a type, or an element, that has none. */
function flagOf(read: () => boolean): boolean | null {
  try {
    return read()
  } catch (_error) {
    return null
  }
}

/** The state after a number of the recorded solution's actions, played with the game's own rules. */
function stateAt(index: number, stepNumber = 0): RulesState {
  const chamber = chamberOf(index)
  const actions = LIST[index]!.actions
  const wanted = Math.max(0, Math.min(Math.floor(stepNumber), actions.length))
  let states = playthroughs.get(index)
  let events = playEvents.get(index)

  if ((states === undefined) || (events === undefined)) {
    const start = startChamber(chamber)

    states = [start.state]
    events = [start.events]
    playthroughs.set(index, states)
    playEvents.set(index, events)
  }

  while (states.length <= wanted) {
    const result = step(chamber, states[states.length - 1]!, actions[states.length - 1] as Action)

    states.push(result.state)
    events.push(result.events)
  }

  return states[wanted]!
}

/** What happened in the step that led to a state along the recorded solution: its game events (the settled start's for step 0). */
export function stepEvents(index: number, stepNumber: number): readonly string[] {
  stateAt(index, stepNumber)

  return playEvents.get(index)?.[Math.max(0, Math.min(Math.floor(stepNumber), LIST[index]!.actions.length))] ?? []
}

/** The recorded solution's actions, one per step. */
export function actionsOf(index: number): readonly string[] {
  return LIST[index]!.actions
}

/** Resolves once every sprite is decoded */
export const ready = loadSprites()

/** Each chamber's name, its size in tiles, and how many actions its recorded solution has */
export const chambers = LIST.map((entry, index) => {
  const chamber = chamberOf(index)

  return {name: entry.name, width: chamber.width, height: chamber.height, steps: entry.actions.length, board: entry.board ?? null}
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
        linked: flagOf(() => chamber.stateLayout.flagOffset(kind as never, i) !== NOT_STORED),
        blocked: flagOf(() => state.isBlocked(kind as never, i)),
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

// ---------- Motion: a recorded solution replayed with the game's own animation ----------

/** One canvas a replay draws on, with its own renderer and effects, and the page's hooks for each frame. */
type PlayTarget = {
  canvas: HTMLCanvasElement // Where it is drawn
  hooksAt: (stepNumber: number) => Record<string, ((...parts: never[]) => unknown) | undefined> // The page's hooks for a frame whose state is after that many actions
}

/** What the page passes to play() */
type PlayOptions = {
  from?: number // The step to start from; 0 by default
  surfaceDetail?: boolean // Whether the game's own floor and wall detail is drawn; true by default
  speed?: number // How fast the clock runs: 1 as in the game, less for slow motion
  pause?: number // How long to wait after one step is drawn before the next action, in milliseconds of the slowed clock
  onStep?: (stepNumber: number) => void // Told each time an action is taken
  onEnd?: () => void // Told once the last action's drawing is over
}

/** The effects a frame is drawn with, as the game's level keeps them, one set per canvas. */
class Effects {
  readonly renderer: Renderer // Draws the chamber
  readonly animation = new StepAnimation() // The step being drawn
  readonly fizzle = new FizzleParticles() // What a fizzle or a destroyed box broke up
  readonly changes = new ElementTransitions() // Elements switching
  readonly ripple = new MissRipple() // A missed shot
  readonly fall = new BoxFall() // Boxes falling into pits
  readonly openings = new PortalOpenings() // Portals opening
  readonly turn = new SubjectTurn() // The subject turning

  constructor(canvas: HTMLCanvasElement, chamber: CompiledChamber, tileSize: number) {
    this.renderer = new Renderer(canvas, tileSize * chamber.width, tileSize * chamber.height)
    this.renderer.setSize(chamber.width, chamber.height)
  }

  /** What a step, or a part of a slide, sets off, as the game's level starts it. */
  playStep(before: RulesState, after: RulesState, events: readonly GameEvent[], shot: PortalColor | null, time: number, joining: boolean): void {
    if (after !== before) {
      this.changes.start(before, after, time)
    }

    if (events.includes(GameEvent.FIZZLED) || events.includes(GameEvent.PORTAL_FIZZLED) || events.includes(GameEvent.BOX_DESTROYED)) {
      this.fizzle.start(before, after, events, time, joining)
    }

    if (events.includes(GameEvent.BOX_DESTROYED)) {
      this.fall.start(before, after, events, time)
    }

    if (events.includes(GameEvent.BLUE_PORTAL_OPENED) || events.includes(GameEvent.ORANGE_PORTAL_OPENED)) {
      this.openings.start(after, events, time)
    }

    if ((shot !== null) && events.includes(GameEvent.REFUSED)) {
      this.ripple.start(after, shot, time)
    }
  }
}

/**
 * Replays a chamber's recorded solution from a step, drawn as the game draws it, with every
 * animation, on one or more canvases at once (the original and the one with detail), until the
 * end or until stopped. A slide's effects wait for the subject to reach each tile, as in the game.
 */
export function play(targets: PlayTarget[], index: number, tileSize: number, options: PlayOptions = {}): {stop: () => void} {
  const chamber = chamberOf(index)
  const actions = LIST[index]!.actions
  const speed = options.speed ?? 1
  const pause = options.pause ?? 250
  const sets = targets.map((target) => new Effects(target.canvas, chamber, tileSize))
  const mixer = globalThis as {__mixer?: unknown}
  const beats: {time: number, before: RulesState, after: RulesState, events: readonly GameEvent[], joining: boolean}[] = []
  let stepNumber = Math.max(0, Math.min(options.from ?? 0, actions.length))
  let state = stateAt(index, stepNumber)
  let started = -1
  let nextAt = 300
  let stopped = false
  let ended = false

  const frame = (now: number): void => {
    if (stopped) {
      return
    }

    started = (started < 0) ? now : started
    const time = (now - started) * speed

    // What a slide being drawn had waiting
    while ((beats.length > 0) && (beats[0]!.time <= time)) {
      const beat = beats.shift()!

      sets.forEach((set) => set.playStep(beat.before, beat.after, beat.events, null, beat.time, beat.joining))
    }

    if ((time >= nextAt) && (beats.length === 0) && (stepNumber < actions.length)) {
      const action = actions[stepNumber] as Action
      const before = state
      const result = step(chamber, before, action)
      const shot = ((action === 'blue') || (action === 'orange')) && !before.isCarrying ? action : null
      const arrival = result.path.at(-1)?.direction ?? result.state.facing
      const walkOut = (result.state.completed && (arrival === exitOuterSide(chamber))) ? arrival : null

      state = result.state
      stepNumber++

      if (state !== before) {
        sets.forEach((set) => set.animation.start(before, state, result.events, result.path, walkOut, time))
      }

      if ((state !== before) && (result.path.length > 0)) {
        const animation = sets[0]!.animation
        let from = before
        let legEvents = 0
        let brokeUp = false

        result.path.forEach((leg, legIndex) => {
          beats.push({time: animation.momentAt(legReach(result.path, legIndex)) ?? time, before: from, after: leg.state, events: leg.events, joining: brokeUp})
          from = leg.state
          legEvents += leg.events.length
          brokeUp = brokeUp || leg.events.includes(GameEvent.FIZZLED) || leg.events.includes(GameEvent.BOX_DESTROYED)
        })
        beats.push({time: animation.endTime ?? time, before: from, after: state, events: result.events.slice(legEvents), joining: brokeUp})
      } else {
        sets.forEach((set) => set.playStep(before, state, result.events, shot, time, false))
      }

      nextAt = (sets[0]!.animation.endTime ?? time) + pause
      options.onStep?.(stepNumber)
    }

    targets.forEach((target, i) => {
      const set = sets[i]!

      mixer.__mixer = {surfaceDetail: options.surfaceDetail !== false, hooks: target.hooksAt(stepNumber)}

      try {
        set.renderer.render(state, set.animation.transitionAt(time), time, set.fizzle, set.changes, set.ripple, set.fall, set.openings, set.turn)
      } finally {
        mixer.__mixer = undefined
      }
    })

    if (!ended && (stepNumber >= actions.length) && (beats.length === 0) && (time >= nextAt + 600)) {
      ended = true
      options.onEnd?.()
    }

    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)

  return {
    stop: () => {
      stopped = true
    },
  }
}
