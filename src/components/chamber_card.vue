<script setup lang="ts">
/**
 * A chamber sign on the home screen: its name on the left, a test-subject
 * figure on the right that turns green once the player has completed it, and a
 * live preview drawn by the game's own renderer.
 */
import {onBeforeUnmount, onMounted, useTemplateRef} from 'vue'
import {drawChamberPreview} from '@/game/chamber_preview'
import {Sound} from '@/game/sound'
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
    :aria-label="`Chamber ${chamber.number}${completed ? ', completed' : ''}`"
    @click="Sound.START.play()"
  >
    <span class="sign-card-head">
      <span class="sign-card-name">
        <span class="sign-card-title">Chamber {{ chamber.number }}</span>
      </span>
      <span
        class="card-subject"
        :class="{
          'card-subject-completed': completed,
        }"
        aria-hidden="true"
      ></span>
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

/* Slimmer header strip than the shared sign card's, with the chamber name larger than its title */
.sign-card-head {
  padding-block: 0.75rem;
}

.sign-card-title {
  font-size: 2rem;
}

/* Test subject at the header strip's right edge: grey until the chamber is completed, then a
   glowing green. The figure is a mask on the layer inside, since a mask would also cut off a glow
   set on the same element */
.card-subject {
  position: relative;
  flex: none;
  height: 2.5rem;
  aspect-ratio: 157 / 380;
}

.card-subject::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(var(--color-ink-rgb), 0.35);
  mask: url('@/assets/images/level_indicator.png') center / contain no-repeat;
}

.card-subject-completed {
  filter:
    drop-shadow(0 0 0.25rem rgba(var(--color-subject-rgb), 0.7))
    drop-shadow(0 0 0.75rem rgba(var(--color-subject-rgb), 0.45));
}

.card-subject-completed::before {
  background: var(--color-subject);
}

/* Live chamber preview, its shape setting the card's height: 4:3 fits the wide chambers closely
   and shows the square one a little smaller */
.card-preview {
  position: relative;
  aspect-ratio: 4 / 3;
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
