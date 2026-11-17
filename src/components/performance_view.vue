<script setup lang="ts">
/**
 * Development only: the frame loop's numbers, pinned over the foot of the
 * chamber screen's rail in two lines, so it never makes the rail taller,
 * refreshed with each sample of the level's frame stats the screen hands to
 * `show`, about once a second: how often the loop ran, the average time
 * between frames, each drawing took and each rules step took (the latest
 * sample with a step, so it holds between steps), and the JavaScript heap
 * (where the browser tells it), used over limit. The text goes straight into
 * the element, outside Vue's reactivity. The screen loads it on demand, so
 * production builds leave it out.
 */
import {onMounted, useTemplateRef} from 'vue'
import type {FrameSample} from '@/game/frame_stats'

/** The JavaScript heap's size, in bytes. */
type HeapSize = {
  used: number // Taken by the page now
  limit: number // The most the page may take
}

/** What the chamber screen calls on the view. */
export interface PerformanceViewHandle {
  show: (sample: FrameSample | null) => void // Writes a sample's numbers into the view, or placeholders before the first sample
}

const LABEL_WIDTH = 6 // Characters each number's label takes, so the values line up
const CELL_WIDTH = 16 // Characters each label and value take with the space after them, so the columns line up
const MEGABYTE = 1024 * 1024 // Bytes in a megabyte, as the heap is shown
const GIGABYTE = 1024 * MEGABYTE // Bytes in a gigabyte, as the heap is shown
const MISSING = '--' // Shown for a number not measured yet

const readout = useTemplateRef<HTMLElement>('readout')

let lastStep: number | null = null // The latest sample's step time with a step in it, in milliseconds, or null before the first step

/**
 * One number of the view: its label, then its value.
 * @param label - What the number measures
 * @param value - Its value
 * @returns The number, padded so the next column lines up
 */
function formatCell(label: string, value: string): string {
  return (label.padEnd(LABEL_WIDTH) + value).padEnd(CELL_WIDTH)
}

/**
 * A time, in milliseconds.
 * @param milliseconds - The time, or null when it wasn't measured
 * @param digits - Decimals shown
 * @returns The time as shown
 */
function formatMilliseconds(milliseconds: number | null, digits: number): string {
  return (milliseconds === null) ? MISSING : `${milliseconds.toFixed(digits)} ms`
}

/**
 * A size in bytes, in megabytes below a gigabyte and in gigabytes above.
 * @param bytes - The size
 * @returns The size as shown
 */
function formatBytes(bytes: number): string {
  if (bytes >= GIGABYTE) {
    return `${(bytes / GIGABYTE).toFixed(1)}GB`
  }

  return `${Math.round(bytes / MEGABYTE)}MB`
}

/**
 * Reads the JavaScript heap's size, which only Chromium tells.
 * @returns The size, or null when the browser doesn't tell it
 */
function readHeap(): HeapSize | null {
  if (!('memory' in performance)) {
    return null
  }

  const memory = performance.memory

  if ((typeof memory !== 'object') || (memory === null) || !('usedJSHeapSize' in memory) || !('jsHeapSizeLimit' in memory)) {
    return null
  }

  const used = memory.usedJSHeapSize
  const limit = memory.jsHeapSizeLimit

  if ((typeof used !== 'number') || (typeof limit !== 'number')) {
    return null
  }

  return {
    used: used,
    limit: limit,
  }
}

/**
 * The whole view's text for a sample.
 * @param sample - The sample, or null before the first one
 * @returns The text: frames per second, drawing and heap used on the first
 * line, the time between frames, rules step and heap limit on the second
 */
function describe(sample: FrameSample | null): string {
  const heap = readHeap()

  // A sample with no step keeps the step time shown
  if ((sample !== null) && (sample.step !== null)) {
    lastStep = sample.step
  }

  const first = [
    formatCell('FPS', (sample === null) ? MISSING : String(Math.round(sample.framesPerSecond))),
    formatCell('Draw', formatMilliseconds(sample?.draw ?? null, 2)),
  ]
  const second = [
    formatCell('Frame', formatMilliseconds(sample?.interval ?? null, 1)),
    formatCell('Step', formatMilliseconds(lastStep, 2)),
  ]

  if (heap !== null) {
    first.push(formatCell('Heap', formatBytes(heap.used)))
    second.push(formatCell('of', formatBytes(heap.limit)))
  }

  return [
    first.join('').trimEnd(),
    second.join('').trimEnd(),
  ].join('\n')
}

/**
 * Writes a sample's numbers into the view.
 * @param sample - The sample, or null before the first one
 */
function show(sample: FrameSample | null): void {
  if (readout.value !== null) {
    readout.value.textContent = describe(sample)
  }
}

onMounted(() => {
  show(null)
})

defineExpose({
  show: show,
})
</script>

<template>
  <pre ref="readout" class="performance-view"></pre>
</template>

<style scoped>
/* A small readout on the chamber's own dark backdrop, set apart from the rail's signage, pinned
   over the rail's foot so it never adds to the rail's height. Fixed to the window, not placed in
   the rail, which scrolls on a short window and would carry it along: as wide as the rail's
   content, the chamber screen's 23rem first column less its side padding and right border */
.performance-view {
  position: fixed;
  bottom: 0.75rem;
  left: 1.375rem;
  width: calc(23rem - 2.75rem - 1px);
  margin: 0;
  padding: 0.375rem 0.625rem;
  border-radius: 0.25rem;
  background: var(--color-chamber);
  color: rgba(var(--color-white-rgb), 0.85);
  font-family: ui-monospace, 'SFMono-Regular', 'DejaVu Sans Mono', Menlo, Consolas, monospace;
  font-size: 0.6875rem;
  line-height: 1.4;
  white-space: pre;
}
</style>
