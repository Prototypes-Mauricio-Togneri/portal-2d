<script setup lang="ts">
/**
 * Shown when the player reaches the exit of a chamber.
 */
import DialogFrame from '@/components/dialog_frame.vue'

export interface CompletionDialogProps {
  chamberNumber: number
}

defineProps<CompletionDialogProps>()

const emit = defineEmits<{
  menu: []
  replay: []
}>()
</script>

<template>
  <DialogFrame tone="success" :title="`Chamber ${chamberNumber} complete`">
    <p>You reached the exit.</p>
    <template #actions>
      <button class="button button-primary" type="button" @click="emit('menu')">Back to menu</button>
      <button class="button button-quiet" type="button" @click="emit('replay')">Play again</button>
    </template>
  </DialogFrame>
</template>
