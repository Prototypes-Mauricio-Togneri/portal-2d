<script setup lang="ts">
/**
 * A chamber sign on the home screen: its number, name and subtitle, a live
 * preview drawn by the game's own renderer, and whether the player has
 * completed it.
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
    class="chamber-card sign-card"
    :to="{
      name: 'chamber',
      params: {
        number: String(chamber.number),
      },
    }"
    :aria-label="`Chamber ${chamber.number}, ${chamber.subtitle}${completed ? ', completed' : ''}`"
  >
    <span class="sign-card-head">
      <span class="card-number">{{ chamber.number }}</span>
      <span class="sign-card-name">
        <span class="sign-card-title">Chamber {{ chamber.number }}</span>
        <span class="card-subtitle">{{ chamber.subtitle }}</span>
      </span>
      <svg v-if="completed" class="card-check" viewBox="0 0 16 16" aria-hidden="true">
        <title>Completed</title>
        <path d="M3 8.5l3.2 3.2L13 4.8" />
      </svg>
    </span>
    <span ref="previewFrame" class="card-preview">
      <canvas ref="previewCanvas"></canvas>
    </span>
  </RouterLink>
</template>

<style scoped>
/* Sign card (styles.css): header strip on top, preview filling the rest */
.chamber-card {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100%;
}

/* Large chamber number in the header strip */
.card-number {
  font-family: var(--font-display);
  font-size: 4.5rem;
  font-weight: 700;
  line-height: 0.85;
  font-variant-numeric: tabular-nums;
}

.card-subtitle {
  color: var(--color-ink-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

/* Completion mark at the sign's right edge */
.card-check {
  flex: none;
  width: 2rem;
  height: 2rem;
  margin-left: auto;
  fill: none;
  stroke: var(--color-blue-deep);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Live chamber preview, filling the rest of the card */
.card-preview {
  position: relative;
  min-height: 12rem;
  margin: 1.25rem;
  overflow: hidden;
}

/* Taken out of the flow so the canvas never props the card open when the window shrinks */
.card-preview canvas {
  position: absolute;
  inset: 0;
  display: block;
  margin: auto;
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
</style>
