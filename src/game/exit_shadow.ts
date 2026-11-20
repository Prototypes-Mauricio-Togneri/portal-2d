import {Direction} from '@/game/direction'
import {PALETTE, withAlpha} from '@/game/palette'
import type {CompiledChamber} from '@/game/rules/compiled_chamber'
import type {TilePainter} from '@/game/tile_painter'

// The open exit's shadow, drawn by code: the exit sits in the chamber's
// outer wall, and its way through leads out of the chamber into the dark, so
// its tile darkens towards the chamber's edge, clear at its inner edge and
// black at its outer one. It is the same in every state, so the renderer
// paints it with the floor, into its backdrop; the closed exit's opaque
// sprite hides it, and it shows between the exit's halves as they slide

/** How many even steps the gradient takes from the tile's outer edge to its inner one, with a colour stop at each step's ends, so it follows the shadow's curve closely */
const SHADOW_STEPS = 16

/**
 * Which side of the chamber the exit's tile lies on: the way out of the
 * chamber through it.
 * @param chamber - The chamber
 * @returns The way out, or null for an exit in a corner, where two sides meet, or inside the chamber, off every side
 */
export function exitOuterSide(chamber: CompiledChamber): Direction | null {
  const position = chamber.positionOf('exit', 0)
  // Rows grow upwards, so row 0 is the chamber's bottom edge
  const sides: readonly (Direction | null)[] = [
    (position.x === 0) ? Direction.LEFT : null,
    (position.x === chamber.width - 1) ? Direction.RIGHT : null,
    (position.y === 0) ? Direction.DOWN : null,
    (position.y === chamber.height - 1) ? Direction.UP : null,
  ]
  const found = sides.filter((side) => side !== null)

  return (found.length === 1) ? (found[0] ?? null) : null
}

/**
 * Draws the open exit's shadow over its tile: black, as opaque as the
 * square of how far across the tile it lies, from 0 at the tile's inner
 * edge, where it is clear, to 1 at its outer edge, on the chamber's edge,
 * where it is fully black. An exit in a corner or inside the chamber has
 * none.
 * @param painter - Paints on the canvas
 * @param chamber - The chamber
 * @param composite - How it is laid over what is drawn: over everything (the default), or 'source-atop' to darken only the pixels already painted, such as something drawn alone on a layer of its own
 */
export function drawExitShadow(painter: TilePainter, chamber: CompiledChamber, composite: GlobalCompositeOperation = 'source-over'): void {
  const outerSide = exitOuterSide(chamber)

  if (outerSide === null) {
    return
  }

  const position = chamber.positionOf('exit', 0)

  // The frame's up points out of the chamber: the outer edge lies above its origin, the inner edge below it
  painter.drawInFrame(position.x + 0.5, position.y + 0.5, outerSide, (ctx, tileSize) => {
    const half = tileSize / 2
    const gradient = ctx.createLinearGradient(0, -half, 0, half)

    for (let i = 0; i <= SHADOW_STEPS; i++) {
      // How far towards the outer edge the stop lies, from 0 at the inner edge to 1 at the outer one
      const outward = 1 - (i / SHADOW_STEPS)

      gradient.addColorStop(i / SHADOW_STEPS, withAlpha(PALETTE.exitShadow, outward * outward))
    }

    ctx.globalCompositeOperation = composite
    ctx.fillStyle = gradient
    ctx.fillRect(-half, -half, tileSize, tileSize)
  })
}
