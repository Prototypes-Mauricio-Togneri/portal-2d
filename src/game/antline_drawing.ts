import {Direction} from '@/game/direction'
import {PALETTE} from '@/game/palette'
import type {CompiledAntline} from '@/game/rules/compiled_chamber'
import type {RulesState} from '@/game/rules/rules_state'
import type {TilePainter} from '@/game/tile_painter'

// How the antlines are drawn (docs/sprites.md): dotted lines on the floor
// from a button or switch to an element it links, drawn by code, unlit in
// cyan and lit in amber while the element they lead to is unblocked, each
// dot ringed by a darker border. They lie over the floor and under
// everything else, so the renderer draws them into its backdrop

/**
 * A dot's middle, in tiles from the chamber's bottom-left corner: x to the
 * right, y upwards.
 */
type DotPoint = {
  readonly x: number // Tiles to the right
  readonly y: number // Tiles upwards
}

/** Dots along each tile of a line, one on the tile's middle */
const DOTS_PER_TILE = 3

/** A dot's width, in tiles */
const DOT_WIDTH = 0.15

/** The width of a dot's border, in tiles; it is never thinner than a pixel */
const BORDER_WIDTH = 0.025

/** Where a line stops on its last run, in tiles before the middle of the element's tile: its edge, so it ends the same whether the element is drawn or not */
const END_SHORT = 0.5

/** Leeway for comparing distances along a line, in tiles */
const LEEWAY = 1e-6

/**
 * Whether an antline is lit: while the element it leads to is unblocked (a
 * door or the exit open, a laser, a light barrier or a fizzler off, a ditch
 * bridged, a blocked wall taking portals). A box has no blocked flag, so a
 * line to it is never lit.
 * @param state - The state drawn
 * @param antline - The antline
 * @returns True when it is lit
 */
export function isAntlineLit(state: RulesState, antline: CompiledAntline): boolean {
  const kind = antline.target.kind

  return (kind !== 'box') && (!state.isBlocked(kind, antline.target.index))
}

/**
 * Which antlines are lit in a state, as one text to compare, so the backdrop
 * that holds them is drawn again only when one of them changes.
 * @param state - The state drawn
 * @returns One character per antline, in the chamber's order: 1 when lit, 0 when not
 */
export function antlinesLitKey(state: RulesState): string {
  return state.chamber.antlines.map((antline) => isAntlineLit(state, antline) ? '1' : '0').join('')
}

/**
 * The middles of an antline's dots, every tile middle along its path among
 * them and each corner once, from the middle of the button's or switch's
 * tile to just short of the element's tile.
 * @param path - Its corner tiles, from the button or switch to the element
 * @returns The dots, in order along the line
 */
function dotsAlong(path: CompiledAntline['path']): DotPoint[] {
  const dots: DotPoint[] = []
  const spacing = 1 / DOTS_PER_TILE

  for (let run = 0; run < path.length - 1; run++) {
    const from = path[run]
    const to = path[run + 1]

    if ((from === undefined) || (to === undefined)) {
      continue
    }

    const length = Math.abs(to.x - from.x) + Math.abs(to.y - from.y)
    const isLast = run === path.length - 2
    const reach = isLast ? (length - END_SHORT - LEEWAY) : (length + LEEWAY)
    const dx = Math.sign(to.x - from.x)
    const dy = Math.sign(to.y - from.y)

    // Every run after the first starts on the corner the run before ended on
    for (let dot = (run === 0) ? 0 : 1; dot * spacing <= reach; dot++) {
      const along = dot * spacing

      dots.push({
        x: from.x + 0.5 + (dx * along),
        y: from.y + 0.5 + (dy * along),
      })
    }
  }

  return dots
}

/**
 * Draws a set of antlines in one colour: every dot filled, then every dot's
 * border, inside its edge so the border doesn't widen it.
 * @param painter - Paints on the canvas
 * @param antlines - The antlines
 * @param fill - The dots' colour
 * @param border - Their border's colour
 */
function drawDots(painter: TilePainter, antlines: readonly CompiledAntline[], fill: string, border: string): void {
  if (antlines.length === 0) {
    return
  }

  // A frame on the chamber's bottom-left corner, with x to the right and y down
  painter.drawInFrame(0, 0, Direction.UP, (ctx, tileSize) => {
    const radius = (DOT_WIDTH * tileSize) / 2
    const borderWidth = Math.max(BORDER_WIDTH * tileSize, 1)
    const points = antlines.flatMap((antline) => dotsAlong(antline.path)).map((dot) => ({
      x: dot.x * tileSize,
      y: -dot.y * tileSize,
    }))

    ctx.beginPath()

    for (const point of points) {
      ctx.moveTo(point.x + radius, point.y)
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    }

    ctx.fillStyle = fill
    ctx.fill()

    const borderRadius = Math.max(radius - (borderWidth / 2), 0)

    ctx.beginPath()

    for (const point of points) {
      ctx.moveTo(point.x + borderRadius, point.y)
      ctx.arc(point.x, point.y, borderRadius, 0, Math.PI * 2)
    }

    ctx.lineWidth = borderWidth
    ctx.strokeStyle = border
    ctx.stroke()
  })
}

/**
 * Draws a state's antlines, the unlit ones first, so a lit line shows over
 * an unlit one where they share tiles.
 * @param painter - Paints on the canvas
 * @param state - The state drawn
 */
export function drawAntlines(painter: TilePainter, state: RulesState): void {
  const antlines = state.chamber.antlines

  drawDots(painter, antlines.filter((antline) => !isAntlineLit(state, antline)), PALETTE.antlineOff, PALETTE.antlineOffBorder)
  drawDots(painter, antlines.filter((antline) => isAntlineLit(state, antline)), PALETTE.antlineOn, PALETTE.antlineOnBorder)
}
