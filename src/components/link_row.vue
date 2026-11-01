<script setup lang="ts">
/**
 * A page outside the game in the home menu: a row with its name on the left
 * and, on the right, an arrow leaving a box, since picking the row opens the
 * page in a new tab.
 */
export interface LinkRowProps {
  label: string
  url: string
}

defineProps<LinkRowProps>()
</script>

<template>
  <a
    class="link-row menu-row"
    :href="url"
    target="_blank"
    rel="noopener"
    :aria-label="`${label}, opens in a new tab`"
  >
    <span class="menu-row-label">{{ label }}</span>
    <svg
      class="link-row-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  </a>
</template>

<style scoped>
/* Arrow at the row's right edge, quieter than the name */
.link-row-icon {
  flex: none;
  width: 1.5rem;
  height: 1.5rem;
  fill: none;
  stroke: rgba(var(--color-ink-rgb), 0.55);
  stroke-width: 2;
  stroke-linecap: square;
}

/* Lighter on the dark bar of the row with the keyboard */
.menu-row-active .link-row-icon {
  stroke: rgba(var(--color-white-rgb), 0.75);
}
</style>
