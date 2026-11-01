<script setup lang="ts">
/**
 * Chamber screen: plays one chamber on the game canvas, with the controls
 * legend beside it and the pause, confirmation and completion dialogs on top.
 * The game objects live outside Vue's reactivity; this screen only creates,
 * pauses, reloads and disposes them.
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
import {findChamber} from '@/services/chamber_catalogue'
import {rememberChamber} from '@/services/last_chamber'
import {markChamberCompleted} from '@/services/progress'
import {playMusic} from '@/services/settings'

/** Which dialog is open over the chamber. */
type ChamberDialog = 'none' | 'pause' | 'confirm-reset' | 'confirm-exit' | 'completed'

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
const dialog = ref<ChamberDialog>('none')

let level: Level | null = null // Running game; created on mount, disposed on unmount
let resizeObserver: ResizeObserver | null = null // Refits the chamber when the window changes size
let leaveConfirmed = false // Set once the player has confirmed leaving, so the route guard lets them go
let pendingRoute: string | null = null // Where browser Back was heading when the exit confirmation opened

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
 * Rebuilds the chamber from its starting layout and resumes play.
 */
function restartChamber(): void {
  if (level !== null && chamber.value !== undefined) {
    level.load(chamber.value.data)
  }
  resume()
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
  markChamberCompleted(props.chamberNumber)
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
  level.load(chamber.value.data)

  resizeObserver = new ResizeObserver(() => {
    const resized = availableSize(stageElement)
    level?.resize(resized.width, resized.height)
  })
  resizeObserver.observe(stageElement)

  window.addEventListener('keydown', handleKeydown)
  playMusic('game')
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  resizeObserver?.disconnect()
  level?.dispose()
  level = null
})
</script>

<template>
  <main class="chamber-screen">
    <aside class="chamber-rail">
      <PortalLogo size="small" />
      <h1 class="chamber-sign">
        <span class="sign-label">Chamber</span>
        <span class="sign-number">{{ chamberNumber }}</span>
      </h1>
      <ChamberLegend />
    </aside>

    <div ref="stage" class="chamber-stage">
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
      @confirm="restartChamber"
      @cancel="dialog = 'pause'"
    />
    <ConfirmDialog
      v-else-if="dialog === 'confirm-exit'"
      :title="`Exit chamber ${chamberNumber}?`"
      message="You'll go back to the chamber list. Your progress in this chamber won't be kept."
      confirm-label="Exit chamber"
      @confirm="leaveChamber"
      @cancel="cancelExit"
    />
    <CompletionDialog
      v-else-if="dialog === 'completed'"
      :chamber-number="chamberNumber"
      @menu="leaveChamber"
      @replay="restartChamber"
    />
  </main>
</template>

<style scoped>
.chamber-screen {
  display: grid;
  grid-template-columns: 19rem 1fr;
  height: 100%;
}

/* Side rail: chamber sign and controls */
.chamber-rail {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding: 2rem 2rem;
  border-right: 1px solid var(--color-rule);
  background: var(--color-panel);
  overflow-y: auto;
}

.chamber-sign {
  display: flex;
  flex-direction: column;
  font-family: var(--font-display);
  line-height: 1;
}

.sign-label {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-ink-muted);
}

.sign-number {
  font-size: 7.5rem;
  font-weight: 700;
  line-height: 0.85;
  font-variant-numeric: tabular-nums;
}

/* Stage holding the game canvas */
.chamber-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 2rem;
  overflow: hidden;
}

.chamber-canvas {
  display: block;
  border: 1px solid rgba(0, 0, 0, 1);
}
</style>
