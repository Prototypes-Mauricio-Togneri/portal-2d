import chamberThreeData from '@/chambers/chamber_3.json'
import {Renderer} from '@/game/renderer'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {loadChamber} from '@/game/rules/load_chamber'
import type {RulesState} from '@/game/rules/rules_state'
import {startChamber} from '@/game/rules/step'
import {loadSprites} from '@/game/sprite_sources'

// Development only (src/dev/render_profile.html, served by `npm run dev`,
// never built): the baseline for stage 03's 60 fps checks. Draws chamber 3,
// the largest, at its settled start with the game's renderer, sized as the
// chamber screen sizes it in a 1920 × 1080 window, and redraws it on every
// animation frame, first at pixel ratio 1, then 2. The ratio is emulated by
// the canvas's size, so ratio 2 can be measured on any screen. Reports each
// ratio's draw time (the renderer's own work, timed around one render) and
// frame interval (between animation frames, which shows whether the browser
// keeps up) on the page and in the console

/** Width the chamber screen's stage leaves the chamber in a 1920 × 1080 window, in page pixels */
const STAGE_WIDTH = 1486

/** Height the chamber screen's stage leaves the chamber in a 1920 × 1080 window, in page pixels */
const STAGE_HEIGHT = 1014

/** The pixel ratios measured, in order */
const PIXEL_RATIOS: readonly number[] = [
  1,
  2,
]

/** Animation frames with no drawing, timed to find the display's refresh interval */
const IDLE_FRAMES = 120

/** Frames drawn before measuring each ratio, so the first frames' setup doesn't count */
const WARM_UP_FRAMES = 60

/** Frames drawn and measured at each ratio */
const MEASURED_FRAMES = 600

/** A frame interval longer than this misses 60 frames per second, in milliseconds */
const SLOW_FRAME_MILLISECONDS = 16.7

/** A frame interval longer than this many refresh intervals skipped at least one refresh */
const MISSED_FRAME_FACTOR = 1.5

/** An idle frame interval longer than this means the browser is slowing the tab, such as when its window is covered or minimized, in milliseconds */
const THROTTLED_REFRESH_MILLISECONDS = 50

/** Wait after the page loads before measuring, in milliseconds */
const START_DELAY_MILLISECONDS = 1000

/**
 * What a run of animation frames measured, one entry per measured frame.
 */
type FrameSamples = {
  readonly drawTimes: readonly number[] // Time spent drawing in each frame, in milliseconds
  readonly intervals: readonly number[] // Time since the previous frame started, in milliseconds
}

/**
 * One pixel ratio's results.
 */
type RatioResult = {
  readonly pixelRatio: number // Canvas pixels per page pixel
  readonly canvasWidth: number // Canvas width, in canvas pixels
  readonly canvasHeight: number // Canvas height, in canvas pixels
  readonly samples: FrameSamples // What its measured frames took
}

/**
 * The chamber profiled, at its settled start.
 */
type ProfiledChamber = {
  readonly chamber: CompiledChamber // The chamber compiled for the rules
  readonly state: RulesState // Its settled start, as a load shows it
}

let tabHidden = false // Set once the tab is hidden while measuring, since hidden tabs slow their frames

/**
 * Finds an element of the page.
 * @param id - Its id
 * @returns The element
 * @throws Error when the page has no element with that id
 */
function findElement(id: string): HTMLElement {
  const element = document.getElementById(id)

  if (element === null) {
    throw new Error(`The page has no element #${id}`)
  }

  return element
}

/**
 * Finds the page's canvas.
 * @returns The canvas
 * @throws Error when the page has no canvas #canvas
 */
function findCanvas(): HTMLCanvasElement {
  const element = findElement('canvas')

  if (!(element instanceof HTMLCanvasElement)) {
    throw new Error('The page has no canvas #canvas')
  }

  return element
}

/**
 * Shows text as the page's result.
 * @param text - The text
 */
function showResult(text: string): void {
  findElement('result').textContent = text
}

/**
 * Waits for the next animation frame.
 * @returns The frame's start time, in milliseconds
 */
function nextFrame(): Promise<number> {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve)
  })
}

/**
 * Runs animation frames, drawing in each, and times the frames after the
 * warm-up ones.
 * @param warmUpFrames - Frames run first and not measured; at least 1, so the first measured frame has an interval
 * @param measuredFrames - Frames measured
 * @param draw - What each frame draws, or null to draw nothing
 * @returns The measured frames' draw times and intervals
 */
async function runFrames(warmUpFrames: number, measuredFrames: number, draw: (() => void) | null): Promise<FrameSamples> {
  const drawTimes: number[] = []
  const intervals: number[] = []
  let previousFrameTime: number | null = null

  for (let i = 0; i < warmUpFrames + measuredFrames; i++) {
    const frameTime = await nextFrame()
    const drawStart = performance.now()

    if (draw !== null) {
      draw()
    }

    const drawTime = performance.now() - drawStart

    if ((i >= warmUpFrames) && (previousFrameTime !== null)) {
      drawTimes.push(drawTime)
      intervals.push(frameTime - previousFrameTime)
    }

    previousFrameTime = frameTime
  }

  return {
    drawTimes: drawTimes,
    intervals: intervals,
  }
}

/**
 * Reads a percentile of some values, by the nearest-rank method.
 * @param values - The values, in any order
 * @param fraction - The percentile as a fraction, such as 0.5 for the median
 * @returns The value at that rank
 * @throws Error when there are no values
 */
function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((first, second) => first - second)
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))
  const value = sorted[rank]

  if (value === undefined) {
    throw new Error('No values to take a percentile of')
  }

  return value
}

/**
 * Formats a duration for the results.
 * @param milliseconds - The duration, in milliseconds
 * @returns The duration with two decimals, such as "16.67 ms"
 */
function formatMilliseconds(milliseconds: number): string {
  return `${milliseconds.toFixed(2)} ms`
}

/**
 * Reads the graphics card's name from WebGL, when the browser tells it.
 * @returns The name, or "unknown"
 */
function readGpuName(): string {
  const context = document.createElement('canvas').getContext('webgl')

  if (context === null) {
    return 'unknown'
  }

  const debugInfo = context.getExtension('WEBGL_debug_renderer_info')
  const name: unknown = context.getParameter((debugInfo === null) ? context.RENDERER : debugInfo.UNMASKED_RENDERER_WEBGL)

  return (typeof name === 'string') ? name : 'unknown'
}

/**
 * Loads chamber 3 and settles its start, as a load shows it.
 * @returns The compiled chamber and its settled start
 * @throws Error when the rules can't load the chamber
 */
function loadChamberThree(): ProfiledChamber {
  const loaded = loadChamber(chamberThreeData)

  if (loaded.chamber === null) {
    throw new Error(`The rules can't load chamber 3: ${loaded.problems.map((problem) => problem.message).join('; ')}`)
  }

  const chamber = new CompiledChamber(loaded.chamber)

  return {
    chamber: chamber,
    state: startChamber(chamber).state,
  }
}

/**
 * Sizes the canvas for a pixel ratio, as the chamber screen does, and
 * measures redrawing the state every frame.
 * @param renderer - Draws on the page's canvas
 * @param canvas - The page's canvas
 * @param chamber - The chamber drawn
 * @param state - The state drawn
 * @param pixelRatio - Canvas pixels per page pixel
 * @returns The ratio's results
 */
async function measureRatio(renderer: Renderer, canvas: HTMLCanvasElement, chamber: CompiledChamber, state: RulesState, pixelRatio: number): Promise<RatioResult> {
  renderer.resize(STAGE_WIDTH * pixelRatio, STAGE_HEIGHT * pixelRatio)
  renderer.setSize(chamber.width, chamber.height)
  canvas.style.width = `${canvas.width / pixelRatio}px`
  canvas.style.height = `${canvas.height / pixelRatio}px`

  const samples = await runFrames(WARM_UP_FRAMES, MEASURED_FRAMES, () => {
    renderer.render(state)
  })

  return {
    pixelRatio: pixelRatio,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    samples: samples,
  }
}

/**
 * Describes one pixel ratio's results.
 * @param result - The ratio's results
 * @param refreshInterval - The display's refresh interval, in milliseconds
 * @returns Its lines of the results
 */
function describeRatio(result: RatioResult, refreshInterval: number): string[] {
  const drawTimes = result.samples.drawTimes
  const intervals = result.samples.intervals
  const slowFrames = intervals.filter((interval) => interval > SLOW_FRAME_MILLISECONDS).length
  const missedFrames = intervals.filter((interval) => interval > refreshInterval * MISSED_FRAME_FACTOR).length

  return [
    `Pixel ratio ${result.pixelRatio}: canvas ${result.canvasWidth} × ${result.canvasHeight}, ${MEASURED_FRAMES} frames`,
    `  Draw time: median ${formatMilliseconds(percentile(drawTimes, 0.5))}, p95 ${formatMilliseconds(percentile(drawTimes, 0.95))}, max ${formatMilliseconds(Math.max(...drawTimes))}`,
    `  Frame interval: median ${formatMilliseconds(percentile(intervals, 0.5))}, p95 ${formatMilliseconds(percentile(intervals, 0.95))}, ${slowFrames} over ${SLOW_FRAME_MILLISECONDS} ms, ${missedFrames} skipping a refresh (over ${MISSED_FRAME_FACTOR} × the refresh interval)`,
  ]
}

/**
 * Logs one pixel ratio's results as a table row.
 * @param result - The ratio's results
 * @param refreshInterval - The display's refresh interval, in milliseconds
 * @returns The row
 */
function tableRow(result: RatioResult, refreshInterval: number): Record<string, string | number> {
  const drawTimes = result.samples.drawTimes
  const intervals = result.samples.intervals

  return {
    'pixel ratio': result.pixelRatio,
    'canvas': `${result.canvasWidth} × ${result.canvasHeight}`,
    'draw median': percentile(drawTimes, 0.5),
    'draw p95': percentile(drawTimes, 0.95),
    'draw max': Math.max(...drawTimes),
    'interval median': percentile(intervals, 0.5),
    'interval p95': percentile(intervals, 0.95),
    'over 16.7 ms': intervals.filter((interval) => interval > SLOW_FRAME_MILLISECONDS).length,
    'skipping a refresh': intervals.filter((interval) => interval > refreshInterval * MISSED_FRAME_FACTOR).length,
  }
}

/**
 * Measures the display's refresh, then each pixel ratio, and shows the
 * results.
 */
async function profile(): Promise<void> {
  // The chamber sprites, which the loading screen hands the game before any chamber opens
  await loadSprites()

  const profiled = loadChamberThree()
  const chamber = profiled.chamber
  const canvas = findCanvas()
  const renderer = new Renderer(canvas, STAGE_WIDTH, STAGE_HEIGHT)

  // Hiding the tab before measuring starts spoils nothing
  tabHidden = false
  showResult('Measuring the display’s refresh…')

  const idle = await runFrames(1, IDLE_FRAMES, null)
  const refreshInterval = percentile(idle.intervals, 0.5)
  const results: RatioResult[] = []

  for (const pixelRatio of PIXEL_RATIOS) {
    showResult(`Measuring pixel ratio ${pixelRatio}…`)
    results.push(await measureRatio(renderer, canvas, chamber, profiled.state, pixelRatio))
  }

  const lines = [
    `Chamber 3 (${chamber.width} × ${chamber.height} tiles), its settled start redrawn every frame`,
    `Stage: ${STAGE_WIDTH} × ${STAGE_HEIGHT} page pixels, as the chamber screen leaves it in a 1920 × 1080 window`,
    `Browser: ${navigator.userAgent}`,
    `GPU: ${readGpuName()}`,
    `Cores: ${navigator.hardwareConcurrency}, screen pixel ratio ${window.devicePixelRatio}, window ${window.innerWidth} × ${window.innerHeight}`,
    `Refresh: ${formatMilliseconds(refreshInterval)} median interval (${(1000 / refreshInterval).toFixed(1)} Hz), over ${IDLE_FRAMES} idle frames`,
    '',
  ]

  for (const result of results) {
    lines.push(...describeRatio(result, refreshInterval), '')
  }

  if (tabHidden) {
    lines.push('The tab was hidden while measuring, so these numbers are not valid: keep it in front and reload.')
  }

  // A covered or minimized window can still count as visible
  if (refreshInterval > THROTTLED_REFRESH_MILLISECONDS) {
    lines.push('The browser slowed this tab\'s frames before anything was drawn, so these numbers are not valid: bring its window to the front and reload.')
  }

  const text = lines.join('\n')

  showResult(text)
  console.log(`[render profile]\n${text}`)
  console.table(results.map((result) => tableRow(result, refreshInterval)))
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    tabHidden = true
  }
})

window.setTimeout(() => {
  profile().catch((error: unknown) => {
    const line = `Failed: ${error instanceof Error ? error.message : String(error)}`

    showResult(line)
    console.error(`[render profile] ${line}`)
  })
}, START_DELAY_MILLISECONDS)
