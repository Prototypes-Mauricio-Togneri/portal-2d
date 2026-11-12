<script setup lang="ts">
/**
 * The Custom controls, opened by picking Custom under Settings' Controls: a
 * row per game key (turning in place, undo and redo hidden for now, as in the
 * chamber's legend), then Done. Picking a row (Enter, Space or a click) waits
 * for its new key, which takes the whole keyboard until a key is bound or
 * Escape cancels; a left or right click on that row binds that mouse button
 * instead, and a click anywhere else cancels. A key or button bound to another
 * game key is swapped. Escape with nothing waiting is left to the screen,
 * which closes the dialog.
 */
import {onBeforeUnmount, onMounted, ref} from 'vue'
import ControlRow from '@/components/control_row.vue'
import DialogFrame from '@/components/dialog_frame.vue'
import {GameKey} from '@/game/game_key'
import {type BoundKey, getBoundKey, getMouseBoundKey} from '@/game/key_bindings'
import {Sound} from '@/game/sound'
import {bindKey, keyBindings} from '@/services/key_bindings'
import {getKeyLabel, refreshKeyLabels} from '@/services/key_labels'

/** A game key listed in the dialog, with what it does. */
type ControlEntry = {
  gameKey: GameKey // The game key the row rebinds
  label: string // What the key does, on the row
  portal: 'blue' | 'orange' | null // The portal the key shoots, if any
}

const emit = defineEmits<{
  close: []
}>()

// Every game key, in the order its row would show
const ALL_CONTROLS: ControlEntry[] = [
  {
    gameKey: GameKey.UP,
    label: 'Move up',
    portal: null,
  },
  {
    gameKey: GameKey.DOWN,
    label: 'Move down',
    portal: null,
  },
  {
    gameKey: GameKey.LEFT,
    label: 'Move left',
    portal: null,
  },
  {
    gameKey: GameKey.RIGHT,
    label: 'Move right',
    portal: null,
  },
  {
    gameKey: GameKey.TURN,
    label: 'Turn in place',
    portal: null,
  },
  {
    gameKey: GameKey.BLUE,
    label: 'Blue portal',
    portal: 'blue',
  },
  {
    gameKey: GameKey.ORANGE,
    label: 'Orange portal',
    portal: 'orange',
  },
  {
    gameKey: GameKey.INTERACT,
    label: 'Interact',
    portal: null,
  },
  {
    gameKey: GameKey.UNDO,
    label: 'Undo',
    portal: null,
  },
  {
    gameKey: GameKey.REDO,
    label: 'Redo',
    portal: null,
  },
]

// Game keys whose rows are hidden for now, as in the chamber's legend, kept so they can be shown
// again; their keys still work
const HIDDEN_CONTROLS: ReadonlySet<GameKey> = new Set([
  GameKey.TURN,
  GameKey.UNDO,
  GameKey.REDO,
])

// The rows of the dialog
const CONTROLS = ALL_CONTROLS.filter((control) => !HIDDEN_CONTROLS.has(control.gameKey))

const focusedControl = ref<GameKey | null>(null) // The game key whose row has the keyboard, or null
const waitingControl = ref<GameKey | null>(null) // The game key whose row waits for a new key, or null
const refusedKey = ref<string | null>(null) // The key last refused while waiting, by name, or null
const controlStatus = ref('') // What the dialog last did, read aloud by screen readers

let capturedCode: string | null = null // The key last taken while waiting, whose keyup must not press the focused row again
let swallowClick = false // Whether the click that ends a left button just bound must not press its row again

/**
 * Waits for a new key for a row picked with Enter, Space or a click; the
 * dialog clicks for the press. The click that ends a left button just bound
 * on the row is kept from the dialog instead, so it neither waits again nor
 * clicks twice; a press of Enter or Space (a click with no pointer) never is.
 * @param control - The row's game key
 * @param event - The click
 */
function chooseControl(control: ControlEntry, event: MouseEvent): void {
  if (swallowClick && event.detail > 0) {
    swallowClick = false
    event.stopPropagation()
    return
  }
  waitingControl.value = control.gameKey
  refusedKey.value = null
  controlStatus.value = `Press a key for ${control.label}, or click its row with a mouse button. Escape cancels`
}

/**
 * Stops waiting for a key, leaving the binding as it was, silently.
 */
function cancelWaiting(): void {
  if (waitingControl.value === null) {
    return
  }
  waitingControl.value = null
  refusedKey.value = null
  controlStatus.value = ''
}

/**
 * Binds a key or mouse button to the game key waiting for one, with a click,
 * and says so (a key bound to another game key is swapped).
 * @param gameKey - The game key waiting for a key
 * @param key - The key or mouse button
 */
function bind(gameKey: GameKey, key: BoundKey): void {
  const control = CONTROLS.find((entry) => entry.gameKey === gameKey)
  const previousKey = keyBindings.value[gameKey]
  const swapped = ALL_CONTROLS.find((entry) => entry.gameKey !== gameKey && keyBindings.value[entry.gameKey] === key)
  bindKey(gameKey, key)
  waitingControl.value = null
  refusedKey.value = null
  const swapNote = swapped === undefined ? '' : `. ${swapped.label} moved to ${getKeyLabel(previousKey).name}`
  controlStatus.value = `${control?.label ?? 'Key'} set to ${getKeyLabel(key).name}${swapNote}`
  Sound.MENU_BUTTON.play()
}

/**
 * Takes every key pressed while a row waits for one, before the dialog and
 * the screen see it: binds it, or refuses it with a note and keeps waiting.
 * Escape cancels; a held key's repeats are ignored, so the key that started
 * the wait can't bind. Checked before any modifier, so Ctrl and Shift can be
 * bound.
 * @param event - Keyboard event
 */
function handleKeydown(event: KeyboardEvent): void {
  const gameKey = waitingControl.value
  if (gameKey === null) {
    return
  }
  event.preventDefault()
  event.stopPropagation()
  if (event.repeat) {
    return
  }
  capturedCode = event.code
  if (event.code === 'Escape') {
    cancelWaiting()
    return
  }
  const key = getBoundKey(event.code)
  if (key === null) {
    refusedKey.value = event.key === '' || event.key === 'Unidentified' ? 'that key' : event.key
    controlStatus.value = `Can't use ${refusedKey.value}. Press another key, or Escape to cancel`
    return
  }
  bind(gameKey, key)
}

/**
 * Keeps the release of a key just taken for a binding from pressing the
 * focused row again, as Space would, which would start waiting once more.
 * @param event - Keyboard event
 */
function handleKeyup(event: KeyboardEvent): void {
  if (capturedCode !== null && event.code === capturedCode) {
    event.preventDefault()
    capturedCode = null
  }
}

/**
 * While a row waits, binds the left or right mouse button pressed on that
 * row, and cancels the wait for a press anywhere else.
 * @param event - Mouse event
 */
function handleMousedown(event: MouseEvent): void {
  swallowClick = false
  const gameKey = waitingControl.value
  if (gameKey === null) {
    return
  }
  const onRow = event.target instanceof Element && event.target.closest(`[data-game-key="${gameKey}"]`) !== null
  if (!onRow) {
    cancelWaiting()
    return
  }
  const key = getMouseBoundKey(event.button)
  if (key === null) {
    return
  }
  // Keeps the keyboard on the row
  event.preventDefault()
  // Only the left button ends in a click on the row
  swallowClick = event.button === 0
  bind(gameKey, key)
}

onMounted(() => {
  // The player may have switched keyboard layouts since the labels were read
  refreshKeyLabels()
  // Before the dialog's own keys and the screen's, so a waiting row takes every key
  window.addEventListener('keydown', handleKeydown, true)
  window.addEventListener('keyup', handleKeyup, true)
  window.addEventListener('mousedown', handleMousedown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown, true)
  window.removeEventListener('keyup', handleKeyup, true)
  window.removeEventListener('mousedown', handleMousedown, true)
})
</script>

<template>
  <DialogFrame title="Custom controls" tone="interaction" layout="stack">
    <p>Pick an action, then press its new key, or click its row with a mouse button.</p>
    <!-- Read aloud as a row waits for, takes or refuses a key -->
    <p class="visually-hidden" role="status">{{ controlStatus }}</p>
    <template #actions>
      <ul class="controls-dialog-list">
        <li v-for="control in CONTROLS" :key="control.gameKey">
          <ControlRow
            class="controls-dialog-row"
            :class="{
              'menu-row-active': focusedControl === control.gameKey,
            }"
            :label="control.label"
            :bound-key="keyBindings[control.gameKey]"
            :portal="control.portal"
            :waiting="waitingControl === control.gameKey"
            :refused-key="refusedKey"
            :data-game-key="control.gameKey"
            @click="chooseControl(control, $event)"
            @focus="focusedControl = control.gameKey"
            @blur="focusedControl = null"
            @contextmenu.prevent
          />
        </li>
      </ul>
      <button class="button button-interaction" type="button" @click="emit('close')">Done</button>
    </template>
  </DialogFrame>
</template>

<style scoped>
/* The rows as in the home menu, closer together, so all seven fit a short window */
.controls-dialog-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0 -1rem 0.5rem;
}

.controls-dialog-row {
  min-height: 3rem;
  padding: 0.375rem 1rem;
}

.controls-dialog-row :deep(.menu-row-label) {
  font-size: 1.625rem;
}

/* The pointer's row gets the faint bar the menu gives a chosen row */
.controls-dialog-row:hover:not(.menu-row-active) {
  background: rgba(var(--color-ink-rgb), 0.14);
}
</style>
