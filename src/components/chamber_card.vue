<script setup lang="ts">
/**
 * A chamber sign on the home screen: its name and subtitle on the left, its
 * number on the right, a live preview drawn by the game's own renderer, and
 * whether the player has completed it.
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
      <span class="sign-card-name">
        <span class="sign-card-title">Chamber {{ chamber.number }}</span>
        <span class="card-subtitle">{{ chamber.subtitle }}</span>
      </span>
      <svg v-if="completed" class="card-check" viewBox="0 0 16 16" aria-hidden="true">
        <title>Completed</title>
        <path d="M3 8.5l3.2 3.2L13 4.8" />
      </svg>
      <span class="card-number sign-card-mark">{{ chamber.number }}</span>
    </span>
    <span ref="previewFrame" class="card-preview">
      <canvas ref="previewCanvas"></canvas>
    </span>
    <span class="sign-card-frame" aria-hidden="true"></span>
  </RouterLink>
</template>

<style scoped>
/* Sign card (styles.css): header strip on top, preview filling the rest */
.chamber-card {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100%;
}

/* Large chamber number at the header strip's right edge */
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

/* Completion mark just before the number */
.card-check {
  flex: none;
  width: 2rem;
  height: 2rem;
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
</style>
