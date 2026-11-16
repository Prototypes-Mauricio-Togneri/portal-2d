import {type DestroyedBox, findDestroyedBoxes} from '@/game/destroyed_boxes'
import type {GameEvent} from '@/game/game_event'
import type {RulesState} from '@/game/rules/rules_state'
import type {TilePainter} from '@/game/tile_painter'

/** How long a box takes to fall out of sight, in milliseconds: a little longer than the grate's slide, so it drops as the grate clears */
const FALL_MILLISECONDS = 450

/** How long the box hangs where it was before it drops, as a share of the whole time, while the grate starts to slide from under it */
const HANG_SHARE = 0.12

/** How small the box has shrunk by the end, as a share of its size: far down the shaft */
const SMALLEST_SCALE = 0.25

/**
 * The boxes the latest step dropped into ditches that opened under them,
 * drawn falling over a short time: each hangs a moment, then drops ever
 * faster, shrinking towards the middle of the pit and fading into its
 * depth, without a shadow and inside its tile. Purely visual: the rules
 * have already sent each box back to its start, where it is drawn at once.
 */
export class BoxFall {
  private falls: readonly DestroyedBox[] = [] // The boxes falling, empty when none is
  private startTime = 0 // When they started to fall, in milliseconds on the frame clock

  /**
   * Starts the fall of each box a step destroyed on a ditch. Replaces any
   * fall still running, unless the step dropped nothing.
   * @param before - The state before the step
   * @param after - The state after the step
   * @param events - What happened in the step
   * @param time - Now, in milliseconds on the frame clock
   */
  start(before: RulesState, after: RulesState, events: readonly GameEvent[], time: number): void {
    const falls = findDestroyedBoxes(before, after, events).filter((box) => box.fell)

    if (falls.length > 0) {
      this.falls = falls
      this.startTime = time
    }
  }

  /**
   * Ends every fall at once, so nothing of it is drawn again.
   */
  clear(): void {
    this.falls = []
  }

  /**
   * Whether a box is still falling at a time. Once the time reaches its
   * end, it is over.
   * @param time - The frame's time, in milliseconds on the frame clock
   * @returns True while a box is left to draw
   */
  isRunningAt(time: number): boolean {
    if ((this.falls.length > 0) && (time - this.startTime >= FALL_MILLISECONDS)) {
      this.falls = []
    }

    return this.falls.length > 0
  }

  /**
   * Draws the falling boxes as they are at a time.
   * @param painter - Paints on the canvas
   * @param time - The frame's time, in milliseconds on the frame clock
   */
  draw(painter: TilePainter, time: number): void {
    const progress = Math.max(time - this.startTime, 0) / FALL_MILLISECONDS

    if (progress >= 1) {
      return
    }

    // Like gravity: still while it hangs, then ever faster
    const fallen = (Math.max(progress - HANG_SHARE, 0) / (1 - HANG_SHARE)) ** 2

    for (const box of this.falls) {
      const middleX = box.tile.x + 0.5
      const middleY = box.tile.y + 0.5

      painter.drawClippedToTile(box.tile, () => {
        painter.drawSpriteShrunk('box', box.x + ((middleX - box.x) * fallen), box.y + ((middleY - box.y) * fallen), box.size, box.way, 1 - ((1 - SMALLEST_SCALE) * fallen), 1 - fallen)
      })
    }
  }
}
