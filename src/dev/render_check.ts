import type {ChamberData} from '@/game/chamber_data'
import {Chamber} from '@/game/classic/chamber'
import {createRulesState} from '@/game/classic/rules_state_bridge'
import {State} from '@/game/classic/state'
import {takeSnapshot} from '@/game/classic/state_snapshot'
import {runFrame, settleClassic} from '@/game/classic/step_classic'
import {Subject} from '@/game/classic/subject'
import {EMPTY_FRAME_INPUT} from '@/game/frame_input'
import {parseReplayFrame} from '@/game/replay_data'
import {Renderer} from '@/game/renderer'
import {RendererV2} from '@/game/renderer_v2'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {readChamber} from '@/game/rules/load_chamber'
import {CHAMBERS} from '@/services/chamber_catalogue'

// Development only (src/dev/render_check.html, served by `npm run dev`,
// never built): plays every chamber's recorded solution on today's rules and
// after every frame, empty frames included, draws the state with today's
// renderer and, translated into a v2 state, with the v2 renderer, both at
// pixel ratio 1 on the same screen size, then compares the two canvases
// pixel by pixel. Stops at the first mismatch. The result is shown on the
// page and logged to the console

/** Width and height available to each chamber, in canvas pixels */
const SCREEN_SIZE = 800

/** Every recorded solution, by file path */
const SOLUTIONS: Readonly<Record<string, unknown>> = import.meta.glob('@/chambers/*.solution.json', {
  eager: true,
  import: 'default',
})

/**
 * A chamber drawn by both renderers, in step.
 */
type DrawnChamber = {
  readonly name: string // The chamber, as the result names it
  readonly state: State // The chamber on today's rules
  readonly compiled: CompiledChamber // The chamber compiled for the v2 rules
  readonly classicRenderer: Renderer // Draws today's state on the left canvas
  readonly v2Renderer: RendererV2 // Draws the v2 state on the right canvas
  readonly classicCanvas: HTMLCanvasElement // The left canvas
  readonly v2Canvas: HTMLCanvasElement // The right canvas
}

/**
 * Finds a canvas of the page.
 * @param id - Its id
 * @returns The canvas
 * @throws Error when the page has no canvas with that id
 */
function findCanvas(id: string): HTMLCanvasElement {
  const element = document.getElementById(id)

  if (!(element instanceof HTMLCanvasElement)) {
    throw new Error(`The page has no canvas #${id}`)
  }

  return element
}

/**
 * Reads the pixels of a whole canvas.
 * @param canvas - The canvas
 * @returns Its RGBA bytes, row by row from the top
 * @throws Error when the canvas has no 2D context
 */
function readPixels(canvas: HTMLCanvasElement): Uint8ClampedArray {
  const context = canvas.getContext('2d')

  if (context === null) {
    throw new Error('The canvas has no 2D context')
  }

  return context.getImageData(0, 0, canvas.width, canvas.height).data
}

/**
 * Reads the key frames of a chamber's recorded solution.
 * @param id - The chamber's permanent id, which names its solution file
 * @returns The frames, in their text form
 * @throws Error when there is no solution or it has no list of frames
 */
function readSolutionFrames(id: number): string[] {
  const fileName = `/chamber_${id}.solution.json`
  const path = Object.keys(SOLUTIONS).find((candidate) => candidate.endsWith(fileName))
  const solution: unknown = (path === undefined) ? undefined : SOLUTIONS[path]
  const frames: unknown = ((typeof solution === 'object') && (solution !== null) && ('frames' in solution)) ? solution.frames : null

  if (!Array.isArray(frames)) {
    throw new Error(`No solution with a list of frames for chamber ${id}`)
  }

  const frameValues: readonly unknown[] = frames

  return frameValues.map((frame) => String(frame))
}

/**
 * Draws the current state with both renderers and compares the canvases.
 * @param drawn - The chamber on both renderers
 * @param frame - The frame the state follows, as the result names it
 * @returns A description of the first differing pixel, or null when every pixel agrees
 */
function compareFrame(drawn: DrawnChamber, frame: string): string | null {
  drawn.classicRenderer.render(drawn.state)
  drawn.v2Renderer.render(createRulesState(drawn.compiled, takeSnapshot(drawn.state)))

  const classic = drawn.classicCanvas
  const v2 = drawn.v2Canvas

  if ((classic.width !== v2.width) || (classic.height !== v2.height)) {
    return `${drawn.name}, ${frame}: the canvases are ${classic.width} × ${classic.height} and ${v2.width} × ${v2.height}`
  }

  const classicPixels = readPixels(classic)
  const v2Pixels = readPixels(v2)

  for (let i = 0; i < classicPixels.length; i++) {
    if (classicPixels[i] !== v2Pixels[i]) {
      const pixel = Math.floor(i / 4)
      const start = pixel * 4
      const classicColor = Array.from(classicPixels.slice(start, start + 4)).join(', ')
      const v2Color = Array.from(v2Pixels.slice(start, start + 4)).join(', ')

      return `${drawn.name}, ${frame}: pixel (${pixel % classic.width}, ${Math.floor(pixel / classic.width)}) is RGBA ${classicColor} today and ${v2Color} on v2`
    }
  }

  return null
}

/**
 * Plays one chamber's solution and compares every frame, its start first.
 * @param id - The chamber's permanent id
 * @param data - The chamber JSON
 * @returns How many frames were compared, or a description of the first mismatch
 * @throws Error when the chamber can't be read for the v2 rules or its solution holds an undo or redo
 */
function checkChamber(id: number, data: ChamberData): number | string {
  const read = readChamber(data)

  if (read.chamber === null) {
    throw new Error(`Chamber ${id} can't be read for the v2 rules`)
  }

  const classicCanvas = findCanvas('classic')
  const v2Canvas = findCanvas('v2')
  const drawn: DrawnChamber = {
    name: `chamber ${id}`,
    state: new State(new Chamber(data), new Subject(data.subject)),
    compiled: new CompiledChamber(read.chamber),
    classicRenderer: new Renderer(classicCanvas, SCREEN_SIZE, SCREEN_SIZE, 1),
    v2Renderer: new RendererV2(v2Canvas, SCREEN_SIZE, SCREEN_SIZE, 1),
    classicCanvas: classicCanvas,
    v2Canvas: v2Canvas,
  }

  drawn.classicRenderer.setSize(data.size.width, data.size.height)
  drawn.v2Renderer.setSize(data.size.width, data.size.height)

  let compared = 1
  const startMismatch = compareFrame(drawn, 'start')

  if (startMismatch !== null) {
    return startMismatch
  }

  for (const [
    index,
    text,
  ] of readSolutionFrames(id).entries()) {
    const frame = parseReplayFrame(text)
    const input = frame.input

    if (typeof input === 'string') {
      throw new Error(`Chamber ${id}'s solution holds an ${input} at key frame ${index + 1}, which this check doesn't play`)
    }

    for (let i = 0; i <= frame.gap; i++) {
      // The gap's empty frames, then the key frame
      runFrame(drawn.state, (i < frame.gap) ? EMPTY_FRAME_INPUT : input)
      compared++

      const mismatch = compareFrame(drawn, `frame ${compared - 1} (key frame ${index + 1}, ${text})`)

      if (mismatch !== null) {
        return mismatch
      }
    }
  }

  let settleMismatch: string | null = null

  settleClassic(drawn.state, () => {
    runFrame(drawn.state, EMPTY_FRAME_INPUT)
    compared++
    settleMismatch = settleMismatch ?? compareFrame(drawn, `frame ${compared - 1} (settling after the last key frame)`)
  })

  return settleMismatch ?? compared
}

/**
 * Checks every chamber in the catalogue and shows the result.
 */
function checkAll(): void {
  const result = document.getElementById('result')
  let total = 0
  let line = ''

  try {
    for (const chamber of CHAMBERS) {
      const outcome = checkChamber(chamber.id, chamber.data)

      if (typeof outcome === 'string') {
        line = `Mismatch: ${outcome}`
        break
      }

      total += outcome
    }

    if (line === '') {
      line = `${total} frames across ${CHAMBERS.length} chambers, 0 mismatches`
    }
  } catch (error) {
    line = `Failed: ${error instanceof Error ? error.message : String(error)}`
  }

  console.log(`[render check] ${line}`)

  if (result !== null) {
    result.textContent = line
  }
}

checkAll()
