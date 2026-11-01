<script setup lang="ts">
/**
 * Asks the player to confirm an action that discards their progress, in a
 * chamber or across the game.
 * Cancel takes focus first, so a stray Enter never discards anything.
 */
import DialogFrame from '@/components/dialog_frame.vue'

export interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
}

defineProps<ConfirmDialogProps>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <DialogFrame tone="caution" :title="title" layout="row">
    <p>{{ message }}</p>
    <template #actions>
      <button class="button button-quiet" type="button" @click="emit('cancel')">Cancel</button>
      <button class="button button-caution" type="button" @click="emit('confirm')">{{ confirmLabel }}</button>
    </template>
  </DialogFrame>
</template>
