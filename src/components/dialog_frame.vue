<script setup lang="ts">
/**
 * Shared shell for the chamber dialogs: backdrop, panel, title and actions.
 * Keyboard-driven: the first action takes focus, the arrow keys move between
 * actions and Tab stays inside the dialog. Escape is left to the screen, which
 * knows what it means in each state. Every action clicks when pressed.
 */
import {onMounted, useId, useTemplateRef} from 'vue'
import {Sound} from '@/game/sound'

export interface DialogFrameProps {
  title: string
  layout?: 'stack' | 'row'
  tone?: 'neutral' | 'interaction' | 'caution' | 'success'
}

withDefaults(defineProps<DialogFrameProps>(), {
  layout: 'stack',
  tone: 'neutral',
})

const titleId = useId()
const panel = useTemplateRef<HTMLElement>('panel')

/**
 * Lists the dialog's action buttons in visual order.
 * @returns The buttons inside the panel
 */
function actionButtons(): HTMLButtonElement[] {
  return Array.from(panel.value?.querySelectorAll<HTMLButtonElement>('.dialog-actions button') ?? [])
}

/**
 * Moves focus to the action at the given offset from the focused one, wrapping around.
 * @param offset - +1 for next, -1 for previous
 */
function moveFocus(offset: number): void {
  const buttons = actionButtons()
  if (buttons.length === 0) {
    return
  }
  const currentIndex = buttons.findIndex((button) => button === document.activeElement)
  const nextIndex = (currentIndex + offset + buttons.length) % buttons.length
  buttons[nextIndex]?.focus()
}

/**
 * Arrow keys move between actions; Tab wraps inside the dialog.
 * @param event - Keyboard event
 */
function handleKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      event.preventDefault()
      moveFocus(1)
      break
    case 'ArrowUp':
    case 'ArrowLeft':
      event.preventDefault()
      moveFocus(-1)
      break
    case 'Tab':
      event.preventDefault()
      moveFocus(event.shiftKey ? -1 : 1)
      break
  }
}

/**
 * Clicks when any action button is pressed, by mouse or keyboard.
 * @param event - Click anywhere in the actions row
 */
function handleActionClick(event: MouseEvent): void {
  if (event.target instanceof Element && event.target.closest('button') !== null) {
    Sound.MENU_BUTTON.play()
  }
}

onMounted(() => {
  actionButtons()[0]?.focus()
})
</script>

<template>
  <div class="dialog-backdrop">
    <section
      ref="panel"
      class="dialog-panel"
      :class="`dialog-panel-${tone}`"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @keydown="handleKeydown"
    >
      <h2 :id="titleId" class="dialog-title">{{ title }}</h2>
      <div v-if="$slots.default" class="dialog-body">
        <slot></slot>
      </div>
      <div
        class="dialog-actions"
        :class="`dialog-actions-${layout}`"
        @click="handleActionClick"
      >
        <slot name="actions"></slot>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: rgba(var(--color-ink-rgb), 0.55);
  animation: backdrop-in 140ms ease both;
}

.dialog-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 26rem;
  padding: 1.75rem 2rem 2rem;
  border-top: 0.375rem solid var(--color-ink);
  border-radius: 0.25rem;
  background: var(--color-panel);
  box-shadow: 0 1.5rem 3rem rgba(var(--color-ink-rgb), 0.35);
  animation: panel-in 180ms var(--ease-out) both;
}

/* Top band carries the dialog's meaning */
.dialog-panel-caution {
  border-top-color: var(--color-red);
}

.dialog-panel-interaction,
.dialog-panel-success {
  border-top-color: var(--color-blue);
}

.dialog-title {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.05;
}

.dialog-body {
  color: var(--color-ink-muted);
}

/* Actions */
.dialog-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.dialog-actions-stack {
  flex-direction: column;
}

.dialog-actions-stack > :slotted(.button) {
  justify-content: flex-start;
  width: 100%;
}

.dialog-actions-row > :slotted(.button) {
  flex: 1;
}

@keyframes backdrop-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
