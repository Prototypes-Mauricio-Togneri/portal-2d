import chamber0 from '@/chambers/chamber_0.json'
import chamber1 from '@/chambers/chamber_1.json'
import chamber2 from '@/chambers/chamber_2.json'
import chamber3 from '@/chambers/chamber_3.json'
import chamber4 from '@/chambers/chamber_4.json'
import chamber5 from '@/chambers/chamber_5.json'
import chamber6 from '@/chambers/chamber_6.json'
import chamber7 from '@/chambers/chamber_7.json'
import chamber8 from '@/chambers/chamber_8.json'
import chamber9 from '@/chambers/chamber_9.json'
import playground from '@/dev/playground.json'
import type {ChamberData} from '@/game/chamber_data'
import {Renderer} from '@/game/renderer'
import {CompiledChamber, NO_ELEMENT} from '@/game/rules/compiled_chamber'
import {ELEMENT_REGISTRY} from '@/game/rules/element_registry'
import {loadChamber} from '@/game/rules/load_chamber'
import {startChamber} from '@/game/rules/step'
import {loadSprites} from '@/game/sprite_sources'

const LIST: {name: string, data: unknown}[] = [
  {name: 'Tutorial', data: chamber0},
  {name: 'Chamber 1', data: chamber1},
  {name: 'Chamber 2', data: chamber2},
  {name: 'Chamber 3', data: chamber3},
  {name: 'Chamber 4', data: chamber4},
  {name: 'Chamber 5', data: chamber5},
  {name: 'Chamber 6', data: chamber6},
  {name: 'Chamber 7', data: chamber7},
  {name: 'Chamber 8', data: chamber8},
  {name: 'Chamber 9', data: chamber9},
  {name: 'Playground', data: playground},
]

const compiled = new Map<number, CompiledChamber>()

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

/** Resolves once every sprite is decoded */
export const ready = loadSprites()

/** Each chamber's name and size, in tiles */
export const chambers = LIST.map((entry, index) => {
  const chamber = chamberOf(index)

  return {name: entry.name, width: chamber.width, height: chamber.height}
})

/** A chamber's tiles as the screen shows them, row 0 at the top: what each holds */
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

/** Draws a chamber's settled start as the game does, at a tile size, the hooks drawing over the floor and over the walls */
export function render(canvas: HTMLCanvasElement, index: number, tileSize: number, hooks?: Record<string, (ctx: CanvasRenderingContext2D, tileSize: number) => void>): void {
  const chamber = chamberOf(index)

  ;(globalThis as {__mockupHooks?: unknown}).__mockupHooks = hooks ?? {}

  try {
    const renderer = new Renderer(canvas, tileSize * chamber.width, tileSize * chamber.height)

    renderer.setSize(chamber.width, chamber.height)
    renderer.render(startChamber(chamber).state)
  } finally {
    (globalThis as {__mockupHooks?: unknown}).__mockupHooks = {}
  }
}
