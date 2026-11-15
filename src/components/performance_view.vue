<script setup lang="ts">
/**
 * Development only: the frame loop's numbers, at the foot of the chamber
 * screen's rail, refreshed with each sample of the level's frame stats the
 * screen hands to `show`, about once a second: how often the loop ran, the
 * average time between frames, each drawing took and each rules step took
 * (the latest sample with a step, so it holds between steps), and the
 * JavaScript heap (where the browser tells it). The text goes straight into
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

const LABEL_WIDTH = 10 // Characters each line's label takes, so the values line up
const MEGABYTE = 1024 * 1024 // Bytes in a megabyte, as the heap is shown
const GIGABYTE = 1024 * MEGABYTE // Bytes in a gigabyte, as the heap is shown
const MISSING = '--' // Shown for a number not measured yet

const readout = useTemplateRef<HTMLElement>('readout')

let lastStep: number | null = null // The latest sample's step time with a step in it, in milliseconds, or null before the first step

/**
 * One line of the view: its label, then its value.
 * @param label - What the line measures
 * @param value - Its value
 * @returns The line, padded so the values line up
 */
function formatLine(label: string, value: string): string {
  return label.padEnd(LABEL_WIDTH) + value
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
 * @returns The text, one line per number
 */
function describe(sample: FrameSample | null): string {
  const heap = readHeap()

  // A sample with no step keeps the step time shown
  if ((sample !== null) && (sample.step !== null)) {
    lastStep = sample.step
  }

  const lines = [
    formatLine('FPS', (sample === null) ? MISSING : String(Math.round(sample.framesPerSecond))),
    formatLine('Interval', formatMilliseconds(sample?.interval ?? null, 1)),
    formatLine('Draw', formatMilliseconds(sample?.draw ?? null, 2)),
    formatLine('Step', formatMilliseconds(lastStep, 2)),
  ]

  if (heap !== null) {
    lines.push(formatLine('Heap', `${formatBytes(heap.used)} / ${formatBytes(heap.limit)}`))
  }

  return lines.join('\n')
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
/* A readout on the chamber's own dark backdrop, set apart from the rail's signage, at the rail's foot */
.performance-view {
  flex: none;
  margin: auto 0 0;
  padding: 0.625rem 0.75rem;
  border-radius: 0.25rem;
  background: var(--color-chamber);
  color: rgba(var(--color-white-rgb), 0.85);
  font-family: ui-monospace, 'SFMono-Regular', 'DejaVu Sans Mono', Menlo, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  white-space: pre;
}
</style>
