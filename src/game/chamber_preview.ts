import type {ChamberData} from '@/game/chamber_data'
import {Renderer} from '@/game/renderer'
import {CompiledChamber} from '@/game/rules/compiled_chamber'
import {loadChamber} from '@/game/rules/load_chamber'
import {startChamber} from '@/game/rules/step'

/**
 * Draws a chamber's starting layout once, the same way the game draws it:
 * its start settled, as a load shows it. No frame loop, no input, no sounds.
 * @param canvas - The canvas to draw on; its width and height are set to fit
 * @param chamberData - The chamber JSON, which is only read
 * @param maxWidth - Width available, in canvas pixels
 * @param maxHeight - Height available, in canvas pixels
 * @throws Error when the rules can't load the chamber
 */
export function drawChamberPreview(canvas: HTMLCanvasElement, chamberData: ChamberData, maxWidth: number, maxHeight: number): void {
  const loaded = loadChamber(chamberData)

  if (loaded.chamber === null) {
    throw new Error(`The rules can't load the chamber: ${loaded.problems.map((problem) => problem.message).join('; ')}`)
  }

  const chamber = new CompiledChamber(loaded.chamber)
  const renderer = new Renderer(canvas, maxWidth, maxHeight)
  renderer.setSize(chamber.width, chamber.height)
  renderer.render(startChamber(chamber).state)
}
