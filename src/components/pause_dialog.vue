<script setup lang="ts">
/**
 * Opened with Escape inside a chamber: continue, reset or exit.
 */
import DialogFrame from '@/components/dialog_frame.vue'

export interface PauseDialogProps {
  chamberNumber: number
}

defineProps<PauseDialogProps>()

const emit = defineEmits<{
  continue: []
  reset: []
  exit: []
}>()
</script>

<template>
  <DialogFrame title="Paused" tone="interaction">
    <p>Chamber {{ chamberNumber }}</p>
    <template #actions>
      <button class="button button-interaction" type="button" @click="emit('continue')">
        Continue
        <span class="action-hint">Esc</span>
      </button>
      <button class="button button-quiet" type="button" @click="emit('reset')">Reset chamber</button>
      <button class="button button-quiet" type="button" @click="emit('exit')">Exit chamber</button>
    </template>
  </DialogFrame>
</template>

<style scoped>
.action-hint {
  margin-left: auto;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
