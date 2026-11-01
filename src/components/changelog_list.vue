<script setup lang="ts">
/**
 * The changelog in the home menu: each release, newest first, with its number
 * as a sign numeral, its date and what changed.
 */
import {CHANGELOG} from '@/services/changelog'

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * Writes a release day out in words.
 * @param date - The day, as YYYY-MM-DD
 * @returns The day, such as "1 November 2026"
 */
function formatDate(date: string): string {
  // Read as UTC midnight and written in UTC, so the day never shifts with the player's time zone
  return dateFormat.format(new Date(date))
}
</script>

<template>
  <ol class="changelog">
    <li v-for="release in CHANGELOG" :key="release.version" class="changelog-release">
      <h2 class="changelog-heading">
        <span class="changelog-version">{{ release.version }}</span>
        <time class="changelog-date" :datetime="release.date">{{ formatDate(release.date) }}</time>
      </h2>
      <ul class="changelog-changes">
        <li v-for="change in release.changes" :key="change" class="changelog-change">{{ change }}</li>
      </ul>
    </li>
  </ol>
</template>

<style scoped>
.changelog {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Release number and date on one baseline */
.changelog-heading {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 0.75rem;
  font-size: inherit;
}

.changelog-version {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.changelog-date {
  color: var(--color-ink-muted);
  font-size: 1rem;
  font-weight: 500;
}

.changelog-changes {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

/* Each change marked with a small square, like a stencilled sign */
.changelog-change {
  position: relative;
  padding-left: 1.25rem;
  font-size: 1.0625rem;
  line-height: 1.45;
}

.changelog-change::before {
  content: '';
  position: absolute;
  top: 0.6em;
  left: 0;
  width: 0.375rem;
  height: 0.375rem;
  background: rgba(var(--color-ink-rgb), 0.55);
}
</style>
