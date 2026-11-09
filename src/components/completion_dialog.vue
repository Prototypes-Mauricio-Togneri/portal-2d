<script setup lang="ts">
/**
 * Shown when the player reaches the exit of a chamber, with the run's time
 * and how it compares with the chamber's best. Its main action opens the next
 * chamber, or goes back to the menu after the last one. In development it also
 * offers to download the run as the chamber's recorded solution.
 */
import DialogFrame from '@/components/dialog_frame.vue'
import {formatTime} from '@/services/format_time'

export interface CompletionDialogProps {
  chamberName: string // What the player sees the chamber called, such as "Chamber 2" or "Tutorial"
  time: number // This run's time, in hundredths of a second
  bestTime: number // The chamber's best time after this run, in hundredths of a second
  newBest: boolean // Whether this run set the best time
  hasNextChamber: boolean // Whether a chamber follows this one
  solutionFailed: boolean // Whether the last download was refused, because the run doesn't replay the same way
}

defineProps<CompletionDialogProps>()

const emit = defineEmits<{
  next: []
  menu: []
  replay: []
  'download-solution': []
}>()

// Recording solutions is an authoring tool, left out of production builds. The
// comparison makes Vue treat the flag as a constant, so the build drops the button
const canDownloadSolution = import.meta.env.DEV === true
</script>

<template>
  <DialogFrame tone="success" :title="`${chamberName} complete`">
    <p class="completion-time">
      <span class="completion-time-label">Your time</span>
      <span class="completion-time-value">{{ formatTime(time) }}</span>
    </p>
    <p
      class="completion-best"
      :class="{
        'completion-best-new': newBest,
      }"
    >
      {{ newBest ? 'New best time' : `Best time ${formatTime(bestTime)}` }}
    </p>
    <p v-if="canDownloadSolution && solutionFailed" class="completion-solution-failed" role="alert">
      Not saved: the run doesn't replay the same way. The console says which check failed.
    </p>
    <template #actions>
      <button
        v-if="hasNextChamber"
        class="button button-interaction"
        type="button"
        @click="emit('next')"
      >
        Next chamber
      </button>
      <button
        class="button"
        :class="hasNextChamber ? 'button-quiet' : 'button-interaction'"
        type="button"
        @click="emit('menu')"
      >
        Back to menu
      </button>
      <button class="button button-quiet" type="button" @click="emit('replay')">Play again</button>
      <button
        v-if="canDownloadSolution"
        class="button button-quiet completion-solution"
        type="button"
        @click="emit('download-solution')"
      >
        Download solution
      </button>
    </template>
  </DialogFrame>
</template>

<style scoped>
/* The run's time as a large sign numeral under a small caption */
.completion-time {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.completion-time-label {
  font-size: 0.875rem;
  font-style: italic;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.completion-time-value {
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 3.5rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1;
}

/* A new record is blue, the colour of success */
.completion-best {
  font-weight: 600;
}

.completion-best-new {
  color: var(--color-blue-deep);
}

/* The development-only download sits apart from the player's actions */
.completion-solution {
  margin-top: 0.75rem;
}

/* No accent colour: a refused download is neither a success nor a loss of progress */
.completion-solution-failed {
  color: var(--color-ink);
  font-size: 0.9375rem;
}
</style>
