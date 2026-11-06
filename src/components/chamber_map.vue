<script setup lang="ts">
/**
 * A chamber's starting layout, drawn by the game's own renderer to fit the
 * frame it is given. Redraws when the frame changes size or the chamber changes.
 */
import {onBeforeUnmount, onMounted, useTemplateRef, watch} from 'vue'
import {drawChamberPreview} from '@/game/chamber_preview'
import type {ChamberEntry} from '@/services/chamber_catalogue'

export interface ChamberMapProps {
  chamber: ChamberEntry
}

const props = defineProps<ChamberMapProps>()

const mapFrame = useTemplateRef<HTMLElement>('mapFrame')
const mapCanvas = useTemplateRef<HTMLCanvasElement>('mapCanvas')

let resizeObserver: ResizeObserver | null = null // Redraws the map when its frame changes size

/**
 * Draws the chamber to fit its frame, at device resolution so it stays sharp.
 */
function drawMap(): void {
  const frame = mapFrame.value
  const canvas = mapCanvas.value
  if (frame === null || canvas === null) {
    return
  }
  const pixelRatio = window.devicePixelRatio
  drawChamberPreview(canvas, props.chamber.data, frame.clientWidth * pixelRatio, frame.clientHeight * pixelRatio, pixelRatio)
  canvas.style.width = `${canvas.width / pixelRatio}px`
  canvas.style.height = `${canvas.height / pixelRatio}px`
}

// The frame keeps its size when another chamber is highlighted, so the observer alone would not redraw
watch(() => props.chamber, drawMap)

onMounted(() => {
  if (mapFrame.value === null) {
    return
  }
  resizeObserver = new ResizeObserver(drawMap)
  resizeObserver.observe(mapFrame.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div ref="mapFrame" class="chamber-map">
    <canvas ref="mapCanvas" aria-hidden="true"></canvas>
  </div>
</template>

<style scoped>
/* Takes its size from the parent, never from the canvas */
.chamber-map {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Taken out of the flow so the canvas never props the frame open when the window shrinks */
.chamber-map canvas {
  position: absolute;
  inset: 0;
  display: block;
  margin: auto;
}
</style>
