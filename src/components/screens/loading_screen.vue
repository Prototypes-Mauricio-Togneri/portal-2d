<script setup lang="ts">
/**
 * First screen of every visit: downloads every asset while a bar shows the progress,
 * then offers Start. Pressing Start counts as interacting with the page, so the
 * browser lets the music play on the screen that opens next.
 */
import {nextTick, onMounted, ref, useTemplateRef} from 'vue'
import PortalLogo from '@/components/portal_logo.vue'
import {preloadAssets} from '@/services/asset_preloader'

const emit = defineEmits<{
  start: []
}>()

const progress = ref(0) // Share of the assets downloaded, from 0 to 1
const loaded = ref(false) // True once every asset has downloaded or failed

const startButton = useTemplateRef<HTMLButtonElement>('startButton')

/**
 * Downloads the assets, then shows Start and gives it the keyboard.
 */
async function preload(): Promise<void> {
  await preloadAssets((share) => {
    progress.value = share
  })
  progress.value = 1
  loaded.value = true
  await nextTick()
  startButton.value?.focus()
}

onMounted(() => {
  void preload()
})
</script>

<template>
  <main class="loading-screen wall">
    <div class="loading-content">
      <span class="emblem" aria-hidden="true">
        <span class="emblem-portal emblem-portal-blue"></span>
        <span class="emblem-subject"></span>
        <span class="emblem-portal emblem-portal-orange"></span>
      </span>
      <h1 class="loading-title">
        <PortalLogo size="large" />
      </h1>
      <p class="loading-status" role="status">{{ loaded ? 'Ready' : 'Loading...' }}</p>
      <div
        class="loading-bar"
        role="progressbar"
        aria-label="Loading"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(progress * 100)"
      >
        <span
          class="loading-fill"
          :style="{
            width: `${progress * 100}%`,
          }"
        ></span>
      </div>
      <div class="loading-actions">
        <button
          v-if="loaded"
          ref="startButton"
          class="button button-sign start-button"
          type="button"
          @click="emit('start')"
        >
          Start
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* ============================================
   Wall
   ============================================ */

/* Larger panels than the other walls, centred so the sign sits in the middle of one */
.loading-screen {
  --panel-size: 20rem;

  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 3rem 1.5rem;
  background-size: var(--panel-size) var(--panel-size);
  background-position: center;
}

/* Rivets where the seams cross, light falling on the middle of the wall, and shade at its edges */
.loading-screen::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image:
    radial-gradient(circle, rgba(var(--color-ink-rgb), 0.16) 0.1875rem, transparent calc(0.1875rem + 1px)),
    radial-gradient(ellipse at center, rgba(var(--color-panel-rgb), 0.9) 0%, rgba(var(--color-panel-rgb), 0) 55%),
    radial-gradient(ellipse at center, transparent 45%, rgba(var(--color-ink-rgb), 0.14) 100%);
  background-size:
    var(--panel-size) var(--panel-size),
    100% 100%,
    100% 100%;
  background-position:
    calc(50% + var(--panel-size) / 2) calc(50% + var(--panel-size) / 2),
    center,
    center;
  background-repeat: repeat, no-repeat, no-repeat;
}

/* ============================================
   Sign
   ============================================ */

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(36rem, 100%);
}

/* Round facility sign: the test subject standing between the two portals, kept quiet so the title leads */
.emblem {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.875rem;
  width: 7.5rem;
  aspect-ratio: 1;
  margin-bottom: 3rem;
  border: 0.375rem solid rgba(var(--color-ink-rgb), 0.3);
  border-radius: 50%;
}

.emblem-portal {
  width: 0.375rem;
  height: 3.75rem;
  border-radius: 0.25rem;
}

.emblem-portal-blue {
  background: var(--color-blue);
}

.emblem-portal-orange {
  background: var(--color-orange);
}

/* The subject's body, with the head above it */
.emblem-subject {
  position: relative;
  width: 1.75rem;
  height: 2.75rem;
  margin-top: 1.5rem;
  border-radius: 0.875rem 0.875rem 0.25rem 0.25rem;
  background: rgba(var(--color-ink-rgb), 0.3);
}

.emblem-subject::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 0.25rem);
  left: 50%;
  width: 1.25rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: rgba(var(--color-ink-rgb), 0.3);
  transform: translateX(-50%);
}

.loading-title {
  font-size: inherit;
  line-height: 1;
}

/* Spaced capitals; the indent matches the space after the last letter so the word stays centred */
.loading-status {
  margin-top: 2.75rem;
  padding-left: 0.42em;
  color: var(--color-ink-muted);
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.42em;
  text-transform: uppercase;
}

/* ============================================
   Progress bar
   ============================================ */

/* Pale channel with a light rim, glowing faintly blue */
.loading-bar {
  width: 100%;
  height: 2.25rem;
  margin-top: 1.75rem;
  padding: 0.3125rem;
  border: 0.1875rem solid var(--color-panel);
  border-radius: 2rem;
  background: rgba(var(--color-ink-rgb), 0.14);
  box-shadow:
    0 0 1.25rem rgba(var(--color-blue-rgb), 0.35),
    inset 0 0.125rem 0.25rem rgba(var(--color-ink-rgb), 0.12);
}

/* The game's blue with a glossy top, glowing */
.loading-fill {
  display: block;
  height: 100%;
  border-radius: 2rem;
  background:
    linear-gradient(rgba(var(--color-panel-rgb), 0.5), rgba(var(--color-panel-rgb), 0) 55%),
    var(--color-blue);
  box-shadow:
    0 0 0.5rem rgba(var(--color-blue-rgb), 0.9),
    0 0 1.5rem rgba(var(--color-blue-rgb), 0.55);
  transition: width 240ms var(--ease-out);
}

/* ============================================
   Start
   ============================================ */

/* Holds the button's height while loading so nothing shifts when it appears */
.loading-actions {
  min-height: 3.25rem;
  margin-top: 2.5rem;
}

.start-button {
  min-width: 10rem;
  animation: start-arrive 200ms var(--ease-out) both;
}

@keyframes start-arrive {
  from {
    opacity: 0;
    transform: translateY(0.375rem);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
