/** What the frame loop did over one sample, about a second of real time. */
export type FrameSample = {
  framesPerSecond: number // How often the frame loop ran
  interval: number // Average time between one frame and the next, in milliseconds
  draw: number | null // Average time each drawing took, in milliseconds, or null when nothing was drawn
  step: number | null // Average time each rules step took, in milliseconds, or null when none ran
}

/** Running totals of one timing over a sample. */
type TimingTotals = {
  count: number // How many times were taken
  sum: number // All of them added up, in milliseconds
}

/**
 * Development only: measures the level's frame loop over samples of about a
 * second of real time, and hands each finished sample to `onSample`. The
 * level reports each frame, each drawing and each rules step; a gap between
 * frames longer than a second (a hidden tab, the computer asleep) throws the
 * sample away and starts a new one.
 */
export class FrameStats {
  /** How long a sample lasts at least, in milliseconds */
  private static readonly SAMPLE_MILLISECONDS = 1000

  /** A longer gap between frames throws the sample away, in milliseconds */
  private static readonly STALE_GAP_MILLISECONDS = 1000

  onSample: ((sample: FrameSample) => void) | null = null // Called with each finished sample

  private sampleStart: number | null = null // When the sample began, in milliseconds on the frame clock, or null before the first frame
  private previousFrame: number | null = null // When the previous frame ran, in milliseconds on the frame clock, or null before the first frame
  private readonly intervals = emptyTotals() // Time between frames in this sample
  private readonly draws = emptyTotals() // Time each drawing took in this sample
  private readonly steps = emptyTotals() // Time each rules step took in this sample

  /**
   * Counts a frame of the loop, at its start. Once the sample has lasted long
   * enough it is handed over and a new one begins.
   * @param time - The frame's time, in milliseconds on the frame clock
   */
  recordFrame(time: number): void {
    const previousFrame = this.previousFrame
    const sampleStart = this.sampleStart

    this.previousFrame = time

    if ((previousFrame === null) || (sampleStart === null) || (time - previousFrame > FrameStats.STALE_GAP_MILLISECONDS)) {
      this.restart(time)

      return
    }

    addTime(this.intervals, time - previousFrame)

    if (time - sampleStart >= FrameStats.SAMPLE_MILLISECONDS) {
      this.onSample?.({
        framesPerSecond: this.intervals.count * 1000 / (time - sampleStart),
        interval: average(this.intervals) ?? 0,
        draw: average(this.draws),
        step: average(this.steps),
      })
      this.restart(time)
    }
  }

  /**
   * Counts a drawing of the chamber.
   * @param milliseconds - How long it took
   */
  recordDraw(milliseconds: number): void {
    addTime(this.draws, milliseconds)
  }

  /**
   * Counts a step of the rules.
   * @param milliseconds - How long it took
   */
  recordStep(milliseconds: number): void {
    addTime(this.steps, milliseconds)
  }

  /**
   * Forgets the sample so far and starts a new one.
   * @param time - When the new sample begins, in milliseconds on the frame clock
   */
  private restart(time: number): void {
    this.sampleStart = time
    clearTotals(this.intervals)
    clearTotals(this.draws)
    clearTotals(this.steps)
  }
}

/**
 * Totals with no time taken yet.
 * @returns The totals
 */
function emptyTotals(): TimingTotals {
  return {
    count: 0,
    sum: 0,
  }
}

/**
 * Empties totals in place.
 * @param totals - The totals
 */
function clearTotals(totals: TimingTotals): void {
  totals.count = 0
  totals.sum = 0
}

/**
 * Adds a time taken to totals.
 * @param totals - The totals
 * @param milliseconds - The time taken
 */
function addTime(totals: TimingTotals, milliseconds: number): void {
  totals.count++
  totals.sum += milliseconds
}

/**
 * The average of totals.
 * @param totals - The totals
 * @returns The average, in milliseconds, or null when no time was taken
 */
function average(totals: TimingTotals): number | null {
  if (totals.count === 0) {
    return null
  }

  return totals.sum / totals.count
}
