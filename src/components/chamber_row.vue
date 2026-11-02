<script setup lang="ts">
/**
 * A chamber in the home menu: a row with its name on the left and, on the
 * right, the best time and a test-subject figure that turns green once the
 * player has completed it. Picking the row starts the chamber.
 */
import {Sound} from '@/game/sound'
import type {ChamberEntry} from '@/services/chamber_catalogue'
import {formatTime} from '@/services/format_time'

export interface ChamberRowProps {
  chamber: ChamberEntry
  completed: boolean
  bestTime: number | null // Best time in hundredths of a second, null when none is saved
}

defineProps<ChamberRowProps>()
</script>

<template>
  <RouterLink
    class="chamber-row menu-row"
    :to="{
      name: 'chamber',
      params: {
        number: String(chamber.number),
      },
    }"
    :aria-label="`Chamber ${chamber.number}${completed ? ', completed' : ''}${bestTime !== null ? `, best time ${formatTime(bestTime)}` : ''}`"
    @click="Sound.START.play()"
  >
    <span class="menu-row-label">Chamber {{ chamber.number }}</span>
    <span v-if="bestTime !== null" class="chamber-row-time">{{ formatTime(bestTime) }}</span>
    <span
      class="chamber-row-subject"
      :class="{
        'chamber-row-subject-completed': completed,
      }"
      aria-hidden="true"
    ></span>
  </RouterLink>
</template>

<style scoped>
/* Best time between the name and the figure, in the muted sign face */
.chamber-row-time {
  flex: none;
  color: rgba(var(--color-ink-rgb), 0.6);
  font-size: 1.125rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.menu-row-active .chamber-row-time {
  color: rgba(var(--color-white-rgb), 0.85);
}

/* Test subject at the row's right edge: grey until the chamber is completed, then a glowing
   green. The figure is a mask on the layer inside, since a mask would also cut off a glow set on
   the same element */
.chamber-row-subject {
  position: relative;
  flex: none;
  height: 2.5rem;
  aspect-ratio: 157 / 380;
}

.chamber-row-subject::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(var(--color-ink-rgb), 0.35);
  mask: url('@/assets/images/level_indicator.png') center / contain no-repeat;
}

/* Lighter grey on the dark bar of the row with the keyboard; a completed figure stays green */
.menu-row-active .chamber-row-subject:not(.chamber-row-subject-completed)::before {
  background: rgba(var(--color-white-rgb), 0.5);
}

.chamber-row-subject-completed {
  filter:
    drop-shadow(0 0 0.25rem rgba(var(--color-subject-rgb), 0.7))
    drop-shadow(0 0 0.75rem rgba(var(--color-subject-rgb), 0.45));
}

.chamber-row-subject-completed::before {
  background: var(--color-subject);
}
</style>
