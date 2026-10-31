import {Chamber} from '@/game/chamber'
import type {ChamberData} from '@/game/chamber_data'
import {Renderer} from '@/game/renderer'
import {State} from '@/game/state'
import {Subject} from '@/game/subject'

/**
 * Draws a chamber's starting layout once, the same way the game draws it.
 * No frame loop, no input, no sounds.
 * @param canvas - The canvas to draw on; its width and height are set to fit
 * @param chamberData - The chamber JSON, which is only read
 * @param maxWidth - Width available, in pixels
 * @param maxHeight - Height available, in pixels
 */
export function drawChamberPreview(canvas: HTMLCanvasElement, chamberData: ChamberData, maxWidth: number, maxHeight: number): void {
  const renderer = new Renderer(canvas, maxWidth, maxHeight)
  renderer.setSize(chamberData.size.width, chamberData.size.height)

  const chamber = new Chamber(chamberData)
  const subject = new Subject(chamberData.subject)
  const state = new State(chamber, subject)

  renderer.render(state)
}
