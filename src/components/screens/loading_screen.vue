<script setup lang="ts">
/**
 * First screen of every visit: downloads every asset while a bar shows the progress,
 * then offers Start. Pressing Start counts as interacting with the page, so the
 * browser lets the music play on the screen that opens next.
 */
import {nextTick, onMounted, ref, useTemplateRef} from 'vue'
import PortalLogo from '@/components/portal_logo.vue'
import {Sound} from '@/game/sound'
import {preloadAssets} from '@/services/asset_preloader'

const emit = defineEmits<{
  start: []
}>()

// Milliseconds the bar takes at the least: half a second in development only, where local files
// arrive almost at once, so the loading state can be seen; no minimum in the built game
const MINIMUM_LOADING_TIME = import.meta.env.DEV ? 500 : 0

const progress = ref(0) // Share of the assets the bar shows, from 0 to 1
const loaded = ref(false) // True once every asset has downloaded or failed

const startButton = useTemplateRef<HTMLButtonElement>('startButton')

let downloadedShare = 0 // Share of the assets actually downloaded, from 0 to 1
let loadingStartedAt = 0 // When the preload started, in milliseconds from performance.now()

/**
 * Shows the downloaded share on the bar, held back so it never runs ahead of the minimum loading time.
 */
function showProgress(): void {
  const elapsed = performance.now() - loadingStartedAt
  const timeShare = MINIMUM_LOADING_TIME === 0 ? 1 : elapsed / MINIMUM_LOADING_TIME
  progress.value = Math.min(downloadedShare, timeShare)
}

/**
 * Keeps the bar moving with the clock until the minimum loading time has passed.
 * @returns Resolves once the minimum loading time has passed
 */
function waitMinimumLoadingTime(): Promise<void> {
  return new Promise((resolve) => {
    /**
     * Updates the bar once per frame until the time is up.
     */
    const tick = (): void => {
      showProgress()
      if (performance.now() - loadingStartedAt >= MINIMUM_LOADING_TIME) {
        resolve()
      } else {
        requestAnimationFrame(tick)
      }
    }
    tick()
  })
}

/**
 * Downloads the assets, then shows Start and gives it the keyboard.
 */
async function preload(): Promise<void> {
  loadingStartedAt = performance.now()
  await Promise.all([
    preloadAssets((share) => {
      downloadedShare = share
      showProgress()
    }),
    waitMinimumLoadingTime(),
  ])
  progress.value = 1
  loaded.value = true
  await nextTick()
  startButton.value?.focus()
}

/**
 * Clicks, then hands over to the screen that opens next. Runs once: the
 * press removes this screen before another click or key can reach Start.
 */
function start(): void {
  Sound.MENU_BUTTON.play()
  emit('start')
}

onMounted(() => {
  void preload()
})
</script>

<template>
  <main class="loading-screen wall">
    <div class="loading-content">
      <h1 class="loading-title">
        <PortalLogo size="large" />
      </h1>
      <p
        class="loading-status"
        :class="{
          'loading-status-done': loaded,
        }"
      >
        Loading...
      </p>
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
          @click="start"
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
  --panel-size: 12rem;

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

/* Gone once loading finishes, still holding its space so nothing below moves */
.loading-status-done {
  visibility: hidden;
}

/* ============================================
   Progress bar
   ============================================ */

/* Pale channel, glowing faintly blue */
.loading-bar {
  width: 100%;
  height: 2.25rem;
  margin-top: 1.75rem;
  padding: 0.3125rem;
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
