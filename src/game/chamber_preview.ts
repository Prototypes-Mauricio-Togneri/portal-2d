import {Chamber} from '@/game/classic/chamber'
import type {ChamberData} from '@/game/chamber_data'
import {Renderer} from '@/game/renderer'
import {State} from '@/game/classic/state'
import {Subject} from '@/game/classic/subject'

/**
 * Draws a chamber's starting layout once, the same way the game draws it.
 * No frame loop, no input, no sounds.
 * @param canvas - The canvas to draw on; its width and height are set to fit
 * @param chamberData - The chamber JSON, which is only read
 * @param maxWidth - Width available, in canvas pixels
 * @param maxHeight - Height available, in canvas pixels
 * @param pixelRatio - Canvas pixels per page pixel, such as the screen's device pixel ratio; 1 by default
 */
export function drawChamberPreview(canvas: HTMLCanvasElement, chamberData: ChamberData, maxWidth: number, maxHeight: number, pixelRatio = 1): void {
  const renderer = new Renderer(canvas, maxWidth, maxHeight, pixelRatio)
  renderer.setSize(chamberData.size.width, chamberData.size.height)

  const chamber = new Chamber(chamberData)
  const subject = new Subject(chamberData.subject)
  const state = new State(chamber, subject)

  renderer.render(state)
}
