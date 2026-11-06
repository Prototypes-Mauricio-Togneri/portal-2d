<script setup lang="ts">
/**
 * Chamber screen: plays one chamber on the game canvas, with the timer and the
 * controls legend beside it and the pause, confirmation and completion dialogs
 * on top. The game objects live outside Vue's reactivity; this screen only
 * creates, pauses, reloads and disposes them, and reads the game's clock.
 */
import {computed, onBeforeUnmount, onMounted, ref, useTemplateRef} from 'vue'
import {onBeforeRouteLeave, onBeforeRouteUpdate, useRouter} from 'vue-router'
import type {RouteLocationNormalized} from 'vue-router'
import ChamberLegend from '@/components/chamber_legend.vue'
import CompletionDialog from '@/components/completion_dialog.vue'
import ConfirmDialog from '@/components/confirm_dialog.vue'
import PauseDialog from '@/components/pause_dialog.vue'
import PortalLogo from '@/components/portal_logo.vue'
import {Level} from '@/game/level'
import {Sound} from '@/game/sound'
import {trackChamberComplete, trackChamberQuit, trackChamberRestart, trackChamberStart} from '@/services/analytics'
import type {RunProgress} from '@/services/analytics'
import {findChamber} from '@/services/chamber_catalogue'
import {formatTime} from '@/services/format_time'
import {rememberChamber} from '@/services/last_chamber'
import {bestTimes, markChamberCompleted, recordTime} from '@/services/progress'
import {playMusic} from '@/services/settings'

/** Which dialog is open over the chamber. */
type ChamberDialog = 'none' | 'pause' | 'confirm-reset' | 'confirm-exit' | 'completed'

/** How a finished run went, for the completion dialog. */
type CompletedRun = {
  time: number // The run's time, in hundredths of a second
  bestTime: number // The chamber's best time after the run, in hundredths of a second
  newBest: boolean // Whether the run set the best time
}

/** Space available to the chamber, in pixels. */
type StageSize = {
  width: number
  height: number
}

export interface ChamberScreenProps {
  chamberNumber: number
}

const props = defineProps<ChamberScreenProps>()

const CANVAS_BORDER_PIXELS = 1 // Matches the canvas border in the styles below

const router = useRouter()
const stage = useTemplateRef<HTMLElement>('stage')
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const chamber = computed(() => findChamber(props.chamberNumber))
const nextChamber = computed(() => findChamber(props.chamberNumber + 1)) // The chamber after this one; undefined after the last
const signNumber = computed(() => String(props.chamberNumber).padStart(2, '0')) // Two digits, as on a test chamber sign
const dialog = ref<ChamberDialog>('none')
const timeReadout = useTemplateRef<HTMLElement>('timeReadout')
const timerStarted = ref(false) // Whether the clock has started; changes only on the first key and on reset
const completedRun = ref<CompletedRun | null>(null) // The run the completion dialog reports

let level: Level | null = null // Running game; created on mount, disposed on unmount
let resizeObserver: ResizeObserver | null = null // Refits the chamber when the window changes size
let leaveConfirmed = false // Set once the player has confirmed leaving, so the route guard lets them go
let pendingRoute: string | null = null // Where browser Back was heading when the exit confirmation opened
let readoutFrameId: number | null = null // The pending animation frame request that refreshes the timer
let shownTime = '' // The text now in the timer, so the element is only written when it changes

/**
 * Measures the space the chamber may fill inside the stage.
 * @param element - The stage element
 * @returns Available width and height in pixels, excluding padding and the canvas border
 */
function availableSize(element: HTMLElement): StageSize {
  const style = getComputedStyle(element)
  return {
    width: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - CANVAS_BORDER_PIXELS * 2,
    height: element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - CANVAS_BORDER_PIXELS * 2,
  }
}

/**
 * Writes the game's clock into the timer, then asks for the next frame. The
 * text goes straight into the element because it changes every frame.
 */
function refreshTimer(): void {
  if (level !== null) {
    const text = formatTime(level.elapsedHundredths)
    if (text !== shownTime && timeReadout.value !== null) {
      timeReadout.value.textContent = text
      shownTime = text
    }
    timerStarted.value = level.started
  }
  readoutFrameId = requestAnimationFrame(refreshTimer)
}

/**
 * Freezes or resumes the game.
 * @param paused - True to freeze
 */
function setPaused(paused: boolean): void {
  if (level !== null) {
    level.paused = paused
  }
}

/**
 * Pauses the game and opens the pause dialog with a click.
 */
function openPause(): void {
  setPaused(true)
  dialog.value = 'pause'
  Sound.MENU_BUTTON.play()
}

/**
 * Closes every dialog and resumes the game.
 */
function resume(): void {
  dialog.value = 'none'
  setPaused(false)
}

/**
 * Reads how far the current run has got, for analytics.
 * @returns The run's time and moves so far
 */
function runProgress(): RunProgress {
  return {
    hundredths: level?.elapsedHundredths ?? 0,
    moves: level?.moves ?? 0,
  }
}

/**
 * Rebuilds the chamber from its starting layout, starts the music over and resumes play.
 */
function restartChamber(): void {
  if (level !== null && chamber.value !== undefined) {
    level.load(chamber.value.data)
  }
  playMusic('game', true)
  resume()
}

/**
 * Starts the chamber over once the player has confirmed Reset chamber.
 */
function confirmReset(): void {
  if (chamber.value !== undefined) {
    trackChamberRestart(chamber.value, runProgress())
  }
  restartChamber()
}

/**
 * Starts a new run of the chamber just completed.
 */
function playAgain(): void {
  restartChamber()
  if (chamber.value !== undefined) {
    trackChamberStart(chamber.value)
  }
}

/**
 * Opens the chamber after the one just completed. It takes this chamber's
 * place in the browser history, so Back from there goes where Back from here would.
 */
function openNextChamber(): void {
  if (nextChamber.value === undefined) {
    return
  }
  void router.replace({
    name: 'chamber',
    params: {
      number: String(nextChamber.value.number),
    },
  })
}

/**
 * Leaves the chamber for the home screen, or for wherever browser Back was heading.
 */
function leaveChamber(): void {
  leaveConfirmed = true
  void router.push(pendingRoute ?? {
    name: 'home',
  })
}

/**
 * Leaves the chamber unfinished once the player has confirmed Exit chamber or browser Back.
 */
function confirmExit(): void {
  if (chamber.value !== undefined) {
    trackChamberQuit(chamber.value, runProgress())
  }
  leaveChamber()
}

/**
 * Backs out of the exit confirmation to the pause dialog.
 */
function cancelExit(): void {
  pendingRoute = null
  dialog.value = 'pause'
}

/**
 * Called by the game when the subject reaches the exit.
 */
function handleCompleted(): void {
  const time = level?.elapsedHundredths ?? 0
  if (chamber.value !== undefined) {
    trackChamberComplete(chamber.value, runProgress(), level?.portalsPlaced ?? 0)
  }
  markChamberCompleted(props.chamberNumber)
  const newBest = recordTime(props.chamberNumber, time)
  completedRun.value = {
    time: time,
    bestTime: bestTimes.value[props.chamberNumber] ?? time,
    newBest: newBest,
  }
  setPaused(true)
  dialog.value = 'completed'
}

/**
 * Escape opens the pause dialog, closes it again, and steps back out of a confirmation.
 * @param event - Keyboard event
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || event.repeat) {
    return
  }
  event.preventDefault()
  switch (dialog.value) {
    case 'none':
      openPause()
      break
    case 'pause':
      resume()
      break
    case 'confirm-reset':
      dialog.value = 'pause'
      break
    case 'confirm-exit':
      cancelExit()
      break
    case 'completed':
      break
  }
}

/**
 * Lets navigation away from the chamber through only once the player has
 * confirmed it or finished the chamber; otherwise opens the exit confirmation.
 * @param to - Where the navigation was heading
 * @returns Whether the navigation may proceed
 */
function guardExit(to: RouteLocationNormalized): boolean {
  if (leaveConfirmed || dialog.value === 'completed') {
    return true
  }
  pendingRoute = to.fullPath
  setPaused(true)
  dialog.value = 'confirm-exit'
  return false
}

// Browser Back asks for the same confirmation as "Exit chamber"
onBeforeRouteLeave(guardExit)

// Jumping through browser history from one chamber straight to another is a
// route update, not a leave; app.vue keys the view so a confirmed jump remounts
onBeforeRouteUpdate(guardExit)

onMounted(() => {
  // The home screen picks this chamber out again on the way back
  rememberChamber(props.chamberNumber)
  const stageElement = stage.value
  const canvasElement = canvas.value
  if (stageElement === null || canvasElement === null || chamber.value === undefined) {
    return
  }
  const size = availableSize(stageElement)
  // Stored before the first load, which runs a frame straight away and can already complete the chamber
  level = new Level(canvasElement, size.width, size.height)
  level.onCompleted = handleCompleted
  // Sent before the load, whose first frame could already report the chamber completed
  trackChamberStart(chamber.value)
  level.load(chamber.value.data)
  refreshTimer()

  resizeObserver = new ResizeObserver(() => {
    const resized = availableSize(stageElement)
    level?.resize(resized.width, resized.height)
  })
  resizeObserver.observe(stageElement)

  window.addEventListener('keydown', handleKeydown)
  // Every chamber starts its music from the beginning
  playMusic('game', true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (readoutFrameId !== null) {
    cancelAnimationFrame(readoutFrameId)
    readoutFrameId = null
  }
  resizeObserver?.disconnect()
  level?.dispose()
  level = null
})
</script>

<template>
  <main class="chamber-screen">
    <aside class="chamber-rail">
      <PortalLogo size="medium" />
      <div class="chamber-sign">
        <h1 class="sign-title">
          <span class="sign-label ruled-label">Chamber</span>
          <span class="sign-number">{{ signNumber }}</span>
        </h1>
        <div
          class="sign-time"
          :class="{
            'sign-time-idle': !timerStarted,
          }"
          role="timer"
          aria-labelledby="sign-time-label"
        >
          <svg
            class="sign-time-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M9.5 2.5h5M12 2.5v3M18.5 6.5l1.25-1.25M12 10v4.25" />
            <circle cx="12" cy="14" r="7.5" />
          </svg>
          <span class="sign-time-reading">
            <span id="sign-time-label" class="sign-time-label">Time</span>
            <span ref="timeReadout" class="sign-time-value">00:00.00</span>
          </span>
        </div>
      </div>
      <ChamberLegend />
    </aside>

    <div ref="stage" class="chamber-stage room">
      <canvas ref="canvas" class="chamber-canvas"></canvas>
    </div>

    <PauseDialog
      v-if="dialog === 'pause'"
      :chamber-number="chamberNumber"
      @continue="resume"
      @reset="dialog = 'confirm-reset'"
      @exit="dialog = 'confirm-exit'"
    />
    <ConfirmDialog
      v-else-if="dialog === 'confirm-reset'"
      :title="`Reset chamber ${chamberNumber}?`"
      message="You'll start again from the entrance. Portals, boxes, buttons and switches go back to how they began."
      confirm-label="Reset chamber"
      @confirm="confirmReset"
      @cancel="dialog = 'pause'"
    />
    <ConfirmDialog
      v-else-if="dialog === 'confirm-exit'"
      :title="`Exit chamber ${chamberNumber}?`"
      message="You'll go back to the chamber list. Your progress in this chamber won't be kept."
      confirm-label="Exit chamber"
      @confirm="confirmExit"
      @cancel="cancelExit"
    />
    <CompletionDialog
      v-else-if="dialog === 'completed'"
      :chamber-number="chamberNumber"
      :time="completedRun?.time ?? 0"
      :best-time="completedRun?.bestTime ?? 0"
      :new-best="completedRun?.newBest ?? false"
      :has-next-chamber="nextChamber !== undefined"
      @next="openNextChamber"
      @menu="leaveChamber"
      @replay="playAgain"
    />
  </main>
</template>

<style scoped>
.chamber-screen {
  display: grid;
  grid-template-columns: 23rem 1fr;
  height: 100%;
}

/* Side rail: wordmark, chamber sign and controls on a light panel, casting a soft shadow on the room */
.chamber-rail {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 3rem;
  padding: 1.75rem 1.375rem;
  border-right: 1px solid var(--color-rule);
  background: var(--color-panel);
  box-shadow: 0.25rem 0 1.5rem rgba(var(--color-ink-rgb), 0.12);
  overflow-y: auto;
}

/* Label and timer share the top row, the number runs below; the heading's own box is dropped so
   its two spans can sit in the grid. Extra room under the number sets the sign apart from the controls */
.chamber-sign {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  column-gap: 1rem;
  row-gap: 1.25rem;
  margin-bottom: 1rem;
}

.sign-title {
  display: contents;
}

.sign-label {
  grid-column: 1;
  grid-row: 1;
  color: var(--color-ink-muted);
  font-size: 0.9375rem;
  font-style: italic;
  letter-spacing: 0.35em;
}

.sign-number {
  grid-column: 1 / -1;
  grid-row: 2;
  font-family: var(--font-display);
  font-size: 8rem;
  font-weight: 700;
  line-height: 0.8;
  font-variant-numeric: tabular-nums;
}

/* The clock: stopwatch, small caption and tabular digits so the readout never shifts; dimmed
   until the first key starts it. Caption and digits share a baseline, the stopwatch is centred on the digits */
.sign-time {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 160ms ease;
}

.sign-time-idle {
  opacity: 0.55;
}

.sign-time-icon {
  flex: none;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-ink-muted);
}

.sign-time-reading {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  line-height: 1;
}

.sign-time-label {
  position: relative;
  top: -0.09375rem; /* Lifts the shorter capitals from the shared baseline to the middle of the digits */
  color: var(--color-ink-muted);
  font-size: 0.8125rem;
  font-style: italic;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.sign-time-value {
  position: relative;
  top: -0.0625rem; /* A hair above the baseline so the digits sit centred beside the stopwatch */
  font-size: 1.125rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  letter-spacing: 0.04em;
}

/* Stage holding the game canvas, on the room's back wall */
.chamber-stage {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 2rem;
  overflow: hidden;
}

/* The room, blurred so the eye stays on the chamber; it reaches past the stage so the blur's
   faded edges are clipped away */
.chamber-stage::before {
  content: '';
  position: absolute;
  inset: -2rem;
  z-index: -1;
  pointer-events: none;
  background: inherit;
  filter: blur(0.25rem);
}

.chamber-canvas {
  display: block;
  border: 1px solid rgba(0, 0, 0, 1);
}
</style>
