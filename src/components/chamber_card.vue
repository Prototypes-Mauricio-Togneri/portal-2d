<script setup lang="ts">
/**
 * A chamber sign on the home screen: its number, a live preview drawn by the
 * game's own renderer, and whether the player has completed it.
 */
import {onBeforeUnmount, onMounted, useTemplateRef} from 'vue'
import {drawChamberPreview} from '@/game/chamber_preview'
import type {ChamberEntry} from '@/services/chamber_catalogue'

export interface ChamberCardProps {
  chamber: ChamberEntry
  completed: boolean
}

const props = defineProps<ChamberCardProps>()

const previewFrame = useTemplateRef<HTMLElement>('previewFrame')
const previewCanvas = useTemplateRef<HTMLCanvasElement>('previewCanvas')

let resizeObserver: ResizeObserver | null = null // Redraws the preview when the card changes size

/**
 * Draws the chamber to fit its frame, at device resolution so it stays sharp.
 */
function drawPreview(): void {
  const frame = previewFrame.value
  const canvas = previewCanvas.value
  if (frame === null || canvas === null) {
    return
  }
  const pixelRatio = window.devicePixelRatio
  drawChamberPreview(canvas, props.chamber.data, frame.clientWidth * pixelRatio, frame.clientHeight * pixelRatio)
  canvas.style.width = `${canvas.width / pixelRatio}px`
  canvas.style.height = `${canvas.height / pixelRatio}px`
}

onMounted(() => {
  if (previewFrame.value === null) {
    return
  }
  resizeObserver = new ResizeObserver(drawPreview)
  resizeObserver.observe(previewFrame.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <RouterLink
    class="chamber-card"
    :to="{
      name: 'chamber',
      params: {
        number: String(chamber.number),
      },
    }"
    :aria-label="`Chamber ${chamber.number}${completed ? ', completed' : ''}`"
  >
    <span class="card-head">
      <span class="card-number">{{ chamber.number }}</span>
      <span v-if="completed" class="card-status">
        <svg class="card-check" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 8.5l3.2 3.2L13 4.8" />
        </svg>
        Completed
      </span>
    </span>
    <span ref="previewFrame" class="card-preview">
      <canvas ref="previewCanvas"></canvas>
    </span>
    <span class="card-foot">
      <span class="card-title">Chamber {{ chamber.number }}</span>
      <span class="card-size">{{ chamber.data.size.width }} × {{ chamber.data.size.height }}</span>
    </span>
  </RouterLink>
</template>

<style scoped>
.chamber-card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  border: 1px solid var(--color-rule);
  border-radius: 0.25rem;
  background: var(--color-panel);
  transition: border-color 120ms ease;
}

.chamber-card:hover,
.chamber-card:focus-visible {
  border-color: var(--color-ink);
}

/* Sign header: large chamber number */
.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0.75rem 1rem 0.5rem 1.125rem;
}

.card-number {
  font-family: var(--font-display);
  font-size: 5.5rem;
  font-weight: 700;
  line-height: 0.85;
  font-variant-numeric: tabular-nums;
}

.card-status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.25rem;
  color: var(--color-blue-deep);
  font-size: 0.875rem;
  font-weight: 600;
}

.card-check {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Live chamber preview */
.card-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: clamp(12rem, 36vh, 26rem);
  margin: 0 1rem;
  background: var(--color-wall);
  overflow: hidden;
}

.card-preview canvas {
  display: block;
}

/* Portal pair opens around the preview on hover and focus */
.card-preview::before,
.card-preview::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0.3125rem;
  transform: scaleY(0);
  transition: transform 180ms var(--ease-out);
}

.card-preview::before {
  left: 0;
  background: var(--color-blue);
}

.card-preview::after {
  right: 0;
  background: var(--color-orange);
}

.chamber-card:hover .card-preview::before,
.chamber-card:hover .card-preview::after,
.chamber-card:focus-visible .card-preview::before,
.chamber-card:focus-visible .card-preview::after {
  transform: scaleY(1);
}

/* Sign footer */
.card-foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0.875rem 1.125rem 1rem;
}

.card-title {
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 600;
  line-height: 1.1;
}

.card-size {
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}
</style>
