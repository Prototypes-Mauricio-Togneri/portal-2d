import '@/assets/styles.css'
import {type JoinBoardKind, joinBoardData, SPECIMEN_OFF, SPECIMEN_ON, type SpecimenRun} from '@/dev/gallery_layouts'
import type {ChamberData} from '@/game/chamber_data'
import {ELEMENT_DRAWINGS} from '@/game/element_drawings'
import {drawBackdrop, Renderer} from '@/game/renderer'
import type {Action} from '@/game/rules/action'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {loadChamber, readChamber} from '@/game/rules/load_chamber'
import {PORTAL_COLORS} from '@/game/rules/portal_color'
import type {RulesState} from '@/game/rules/rules_state'
import {NO_BOX} from '@/game/rules/state_layout'
import {startChamber, step} from '@/game/rules/step'
import {drawPlaceholder} from '@/game/sprite_placeholders'
import type {STRIP_TILE} from '@/game/sprite_set'
import {SPRITE_OVERHANG, SPRITE_SHAPES, SPRITE_TILE_SIZE, STRIP_TILES, type SpriteName} from '@/game/sprite_set'
import {loadSprites, spriteFileReport, spriteOf} from '@/game/sprite_sources'
import {TilePainter} from '@/game/tile_painter'
import {CHAMBERS} from '@/services/chamber_catalogue'

// Development only (src/dev/sprite_gallery.html, served by `npm run dev`,
// never built): where the author checks the chamber sprites while drawing
// them (docs/sprites.md). Shows every sprite as the game has it, then the
// game's own drawing of two specimen chambers, every way walls and open
// ditches join, and each chamber. Every canvas is shown one canvas pixel to
// one screen pixel. The sprites' folder is found at build time, so a file
// landing there reloads the page

/**
 * A tile size the specimens and the join boards are drawn at, with what it
 * stands for.
 */
type GallerySize = {
  readonly tileSize: number // Side of a tile, in canvas pixels
  readonly label: string // What the size is, as a heading
}

/**
 * A specimen as the gallery shows it.
 */
type Specimen = {
  readonly run: SpecimenRun // The chamber and its actions
  readonly caption: string // What it shows
}

/**
 * A join board as the gallery shows it.
 */
type JoinBoard = {
  readonly kind: JoinBoardKind // Whether it holds walls or open ditches
  readonly caption: string // What it shows
}

/**
 * What the game draws for a sprite, as its card says it.
 */
type StatusLine = {
  readonly text: string // What is drawn, and why
  readonly lampClass: string // The lamp's look: lit for a file in use, red for a file not used, none for no file
}

/** Width of the home menu's map in a 1920 × 1080 window, in page pixels */
const MENU_MAP_WIDTH = 647

/** Height of the home menu's map in a 1920 × 1080 window, in page pixels */
const MENU_MAP_HEIGHT = 485

/** How long a saved placeholder's address is kept after its download starts, in milliseconds */
const DOWNLOAD_URL_LIFETIME_MILLISECONDS = 10000

/** Side of a tile the chambers are drawn at, in canvas pixels */
const CHAMBER_TILE_SIZE = 40

/** The other tile sizes the specimens and join boards are drawn at, in canvas pixels, smallest first */
const TILE_SIZES: readonly number[] = [
  40,
  100,
  230,
]

/** What each strip tile shows, in strip order */
const STRIP_TILE_LABELS: Readonly<Record<keyof typeof STRIP_TILE, string>> = {
  lone: 'Lone',
  horizontalRun: 'Horizontal run',
  verticalRun: 'Vertical run',
  innerCorners: 'Inner corners',
  solid: 'Solid',
}

/** The specimens, everything on first */
const SPECIMENS: readonly Specimen[] = [
  {
    run: SPECIMEN_ON,
    caption: 'Everything on',
  },
  {
    run: SPECIMEN_OFF,
    caption: 'Everything off',
  },
]

/** The join boards, walls first */
const JOIN_BOARDS: readonly JoinBoard[] = [
  {
    kind: 'wall',
    caption: 'Walls',
  },
  {
    kind: 'ditch',
    caption: 'Open ditches',
  },
]

/** Every sprite, in the spec's order */
const SPRITE_NAMES = Object.keys(SPRITE_SHAPES) as SpriteName[]

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
 * Makes an element with a class and, optionally, its text.
 * @param tag - The element's tag
 * @param className - Its classes
 * @param text - Its text, if any
 * @returns The element
 */
function makeElement<Tag extends keyof HTMLElementTagNameMap>(tag: Tag, className: string, text: string | null = null): HTMLElementTagNameMap[Tag] {
  const element = document.createElement(tag)

  element.className = className

  if (text !== null) {
    element.textContent = text
  }

  return element
}

/**
 * Shows a canvas one canvas pixel to one screen pixel.
 * @param canvas - The canvas, already sized
 */
function showAtScreenPixels(canvas: HTMLCanvasElement): void {
  const pixelRatio = window.devicePixelRatio

  canvas.style.width = `${canvas.width / pixelRatio}px`
  canvas.style.height = `${canvas.height / pixelRatio}px`
}

/**
 * Makes a figure: a drawing that scrolls sideways on its own when it is
 * wider than the page, over its caption.
 * @param canvas - The drawing
 * @param caption - What it shows
 * @returns The figure
 */
function makeFigure(canvas: HTMLCanvasElement, caption: string): HTMLElement {
  const figure = makeElement('figure', 'gallery-figure')
  const frame = makeElement('div', 'gallery-figure-frame')

  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', caption)
  frame.append(canvas)
  figure.append(frame, makeElement('figcaption', 'gallery-caption', caption))

  return figure
}

/**
 * Reads what an error says.
 * @param error - The error thrown
 * @returns Its message
 */
function errorText(error: unknown): string {
  return (error instanceof Error) ? error.message : String(error)
}

/**
 * Makes a line reporting something the gallery couldn't draw, and logs it.
 * @param message - What went wrong
 * @returns The line
 */
function makeError(message: string): HTMLElement {
  console.error(`[sprite gallery] ${message}`)

  return makeElement('p', 'gallery-error', message)
}

/**
 * Downloads a sprite's placeholder as a PNG of its file's size, named as its
 * file, to draw over.
 * @param name - The sprite
 */
function savePlaceholder(name: SpriteName): void {
  const canvas = drawPlaceholder(name)

  canvas?.toBlob((blob) => {
    if (blob === null) {
      return
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${name}.png`
    link.click()

    // Kept a moment, since a browser may still be reading it for the download
    window.setTimeout(() => {
      URL.revokeObjectURL(url)
    }, DOWNLOAD_URL_LIFETIME_MILLISECONDS)
  }, 'image/png')
}

/**
 * Describes the size of a sprite's image as the game has it.
 * @param name - The sprite
 * @param width - The image's width, in pixels
 * @param height - The image's height, in pixels
 * @returns The size, with what it means
 */
function describeSize(name: SpriteName, width: number, height: number): string {
  if (SPRITE_SHAPES[name] === 'strip') {
    return `${width} × ${height} px, a strip of ${STRIP_TILES} tiles`
  }

  return (width > SPRITE_TILE_SIZE) ? `${width} × ${height} px, its ${SPRITE_TILE_SIZE} px tile in the middle` : `${width} × ${height} px`
}

/**
 * Describes what the game draws for a sprite, and why.
 * @param name - The sprite
 * @returns The status line
 */
function describeStatus(name: SpriteName): StatusLine {
  const report = spriteFileReport(name)
  const glow = SPRITE_SHAPES[name] === 'glow'

  switch (report.status) {
    case 'inUse':
      return {
        text: 'Its file, in use',
        lampClass: 'gallery-lamp-lit',
      }

    case 'refused':
      return {
        text: `${glow ? 'Nothing glows' : 'Placeholder'}: its file is refused, as ${report.reason ?? 'it doesn\'t fit'}`,
        lampClass: 'gallery-lamp-refused',
      }

    case 'notLoaded':
      return {
        text: `${glow ? 'Nothing glows' : 'Placeholder'}: its file didn't download`,
        lampClass: 'gallery-lamp-refused',
      }

    case 'missing':
      return {
        text: glow ? 'No file yet, so nothing glows' : 'Placeholder: no file yet',
        lampClass: '',
      }
  }
}

/**
 * Makes the labels under a strip, one per tile.
 * @param width - The strip's width on the page, as a CSS length
 * @returns The labels' row, as wide as the strip
 */
function makeStripLabels(width: string): HTMLElement {
  const labels = makeElement('ol', 'gallery-strip-labels')

  labels.style.width = width

  for (const label of Object.values(STRIP_TILE_LABELS)) {
    labels.append(makeElement('li', '', label))
  }

  return labels
}

/**
 * Makes one sprite's card: its image as the game has it, on a checkerboard,
 * its name, size and status, and for a placeholder a button saving it.
 * @param name - The sprite
 * @returns The card
 */
function makeSpriteCard(name: SpriteName): HTMLElement {
  const sprite = spriteOf(name)
  const card = makeElement('article', `gallery-sprite gallery-sprite-${SPRITE_SHAPES[name]}`)
  const scroller = makeElement('div', 'gallery-figure-frame')
  const frame = makeElement('div', 'gallery-checkerboard')
  const canvas = document.createElement('canvas')
  const status = describeStatus(name)

  // A glow without a file has no image: an empty frame of its file's size
  const overhanging = SPRITE_TILE_SIZE + (2 * SPRITE_OVERHANG)

  canvas.width = sprite?.image.width ?? overhanging
  canvas.height = sprite?.image.height ?? overhanging

  if (sprite !== null) {
    canvas.getContext('2d')?.drawImage(sprite.image, 0, 0)
  }

  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', `Sprite ${name}`)
  showAtScreenPixels(canvas)
  frame.append(canvas)
  scroller.append(frame)

  // The labels scroll with the strip
  if (SPRITE_SHAPES[name] === 'strip') {
    scroller.append(makeStripLabels(canvas.style.width))
  }

  card.append(scroller)

  const heading = makeElement('h3', 'gallery-sprite-name', name)
  const size = makeElement('p', 'gallery-sprite-size', describeSize(name, canvas.width, canvas.height))
  const statusLine = makeElement('p', 'gallery-sprite-status')

  statusLine.append(makeElement('span', `gallery-lamp ${status.lampClass}`), status.text)
  statusLine.firstElementChild?.setAttribute('aria-hidden', 'true')
  card.append(heading, size, statusLine)

  if ((spriteFileReport(name).status !== 'inUse') && (SPRITE_SHAPES[name] !== 'glow')) {
    const button = makeElement('button', 'button button-quiet gallery-save', 'Save placeholder as PNG')

    button.type = 'button'
    button.addEventListener('click', () => {
      savePlaceholder(name)
    })
    card.append(button)
  }

  return card
}

/**
 * Loads a chamber and plays actions from its settled start.
 * @param data - The chamber
 * @param actions - The actions
 * @returns The state they leave
 * @throws Error when the rules can't load the chamber
 */
function playChamber(data: ChamberData, actions: readonly Action[]): RulesState {
  const loaded = loadChamber(data)

  if (loaded.chamber === null) {
    throw new Error(`the rules can't load it: ${loaded.problems.map((problem) => problem.message).join('; ')}`)
  }

  const chamber = new CompiledChamber(loaded.chamber)
  let state = startChamber(chamber).state

  for (const action of actions) {
    state = step(chamber, state, action).state
  }

  return state
}

/**
 * Plays a specimen, checking it leaves what the gallery shows: the subject
 * carrying a box, with both portals open.
 * @param run - The specimen and its actions
 * @returns The state its actions leave
 * @throws Error when the rules can't load it, or its actions leave something else
 */
function playSpecimen(run: SpecimenRun): RulesState {
  const state = playChamber(run.data, run.actions)

  if (state.carriedBox === NO_BOX) {
    throw new Error('its actions leave the subject without a box; update src/dev/gallery_layouts.ts for the rules')
  }

  if (PORTAL_COLORS.some((color) => state.portalSide(color) === null)) {
    throw new Error('its actions leave a portal closed; update src/dev/gallery_layouts.ts for the rules')
  }

  return state
}

/**
 * Draws a state with the game's renderer at a tile size.
 * @param state - The state
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The canvas, shown one canvas pixel to one screen pixel
 */
function drawState(state: RulesState, tileSize: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const chamber = state.chamber
  const renderer = new Renderer(canvas, chamber.width * tileSize, chamber.height * tileSize)

  renderer.setSize(chamber.width, chamber.height)
  renderer.render(state)
  showAtScreenPixels(canvas)

  return canvas
}

/**
 * Draws a join board at a tile size by the game's own drawing: its
 * backdrop (the floor, and walls with their shadow), then any ditches, and
 * nothing else, so neither the subject nor the exit shows.
 * @param state - The board's state
 * @param kind - Whether it holds walls or open ditches
 * @param tileSize - Side of a tile, in canvas pixels
 * @returns The canvas, shown one canvas pixel to one screen pixel
 */
function drawJoinBoard(state: RulesState, kind: JoinBoardKind, tileSize: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const chamber = state.chamber
  const painter = new TilePainter(canvas, chamber.width * tileSize, chamber.height * tileSize)

  painter.setSize(chamber.width, chamber.height)
  drawBackdrop(painter, state)

  if (kind === 'ditch') {
    ELEMENT_DRAWINGS.ditch(painter, state)
  }

  showAtScreenPixels(canvas)

  return canvas
}

/**
 * Reads a join board's state, without the layout checks.
 * @param kind - Whether it holds walls or open ditches
 * @returns Its settled start
 * @throws Error when the rules can't read it
 */
function joinBoardState(kind: JoinBoardKind): RulesState {
  const read = readChamber(joinBoardData(kind))

  if (read.chamber === null) {
    throw new Error(`the rules can't read it: ${read.problems.map((problem) => problem.message).join('; ')}`)
  }

  return startChamber(new CompiledChamber(read.chamber)).state
}

/**
 * The smallest tile the home menu's map draws a chamber at in a 1920 × 1080
 * window, at pixel ratio 1: the largest chamber's, fitted to the map as the
 * renderer fits it.
 * @returns Side of a tile, in canvas pixels
 */
function menuMapTileSize(): number {
  const sizes = CHAMBERS.map((entry) => Math.min(Math.trunc(MENU_MAP_WIDTH / entry.data.size.width), Math.trunc(MENU_MAP_HEIGHT / entry.data.size.height)))

  return Math.min(...sizes)
}

/**
 * Every size the specimens and join boards are drawn at, smallest first.
 * @returns The sizes, with their headings
 */
function gallerySizes(): GallerySize[] {
  const menuMap = menuMapTileSize()

  return [
    {
      tileSize: menuMap,
      label: `${menuMap} px per tile, the smallest the home menu's map draws (in a 1920 × 1080 window)`,
    },
    ...TILE_SIZES.map((tileSize) => ({
      tileSize: tileSize,
      label: `${tileSize} px per tile`,
    })),
  ]
}

/**
 * Makes a group of figures under a size's heading.
 * @param label - The heading
 * @param figures - The figures
 * @returns The group
 */
function makeSizeGroup(label: string, figures: readonly HTMLElement[]): HTMLElement {
  const group = makeElement('div', 'gallery-size')
  const row = makeElement('div', 'gallery-figures')

  row.append(...figures)
  group.append(makeElement('h3', 'gallery-size-label', label), row)

  return group
}

/**
 * Shows how many sprites have a file in use, and how many files are refused.
 */
function showSummary(): void {
  const statuses = SPRITE_NAMES.map((name) => spriteFileReport(name).status)
  const inUse = statuses.filter((status) => status === 'inUse').length
  const failing = statuses.filter((status) => (status === 'refused') || (status === 'notLoaded')).length
  const failingText = (failing === 0) ? '' : `, and ${failing} ${(failing === 1) ? 'file isn\'t' : 'files aren\'t'} used (see below)`

  findElement('summary').textContent = `${inUse} of ${SPRITE_NAMES.length} sprites have a file in use${failingText}.`
}

/**
 * Fills the sprites section: a card per sprite.
 */
function buildSprites(): void {
  findElement('sprites-list').append(...SPRITE_NAMES.map(makeSpriteCard))
}

/**
 * Fills the specimens section: both specimens at every size.
 */
function buildSpecimens(): void {
  const section = findElement('specimens-list')
  const played: {state: RulesState,
    caption: string}[] = []

  for (const specimen of SPECIMENS) {
    try {
      played.push({
        state: playSpecimen(specimen.run),
        caption: specimen.caption,
      })
    } catch (error) {
      section.append(makeError(`The specimen with ${specimen.caption.toLowerCase()} can't be drawn: ${errorText(error)}`))
    }
  }

  for (const size of gallerySizes()) {
    section.append(makeSizeGroup(size.label, played.map((specimen) => makeFigure(drawState(specimen.state, size.tileSize), `${specimen.caption}, ${size.tileSize} px per tile`))))
  }
}

/**
 * Fills the joins section: the wall and the ditch board at every size.
 */
function buildJoins(): void {
  const section = findElement('joins-list')
  const read: {board: JoinBoard,
    state: RulesState}[] = []

  for (const board of JOIN_BOARDS) {
    try {
      read.push({
        board: board,
        state: joinBoardState(board.kind),
      })
    } catch (error) {
      section.append(makeError(`The board of ${board.caption.toLowerCase()} can't be drawn: ${errorText(error)}`))
    }
  }

  for (const size of gallerySizes()) {
    section.append(makeSizeGroup(size.label, read.map((entry) => makeFigure(drawJoinBoard(entry.state, entry.board.kind, size.tileSize), `${entry.board.caption}, ${size.tileSize} px per tile`))))
  }
}

/**
 * Fills the chambers section: each chamber's settled start.
 */
function buildChambers(): void {
  const section = findElement('chambers-list')
  const figures: HTMLElement[] = []

  for (const entry of CHAMBERS) {
    const caption = (entry.name === `Chamber ${entry.number}`) ? entry.name : `${entry.name} (chamber ${entry.number})`

    try {
      figures.push(makeFigure(drawState(playChamber(entry.data, []), CHAMBER_TILE_SIZE), caption))
    } catch (error) {
      section.append(makeError(`${caption} can't be drawn: ${errorText(error)}`))
    }
  }

  section.append(makeSizeGroup(`${CHAMBER_TILE_SIZE} px per tile`, figures))
}

/**
 * Loads the sprites, then fills every section.
 */
async function buildGallery(): Promise<void> {
  // The chamber sprites, which the loading screen hands the game before any chamber opens
  await loadSprites()

  showSummary()
  buildSprites()
  buildSpecimens()
  buildJoins()
  buildChambers()
}

buildGallery().catch((error: unknown) => {
  findElement('summary').replaceWith(makeError(`The gallery failed: ${errorText(error)}`))
})
