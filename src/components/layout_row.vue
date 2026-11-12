<script setup lang="ts">
/**
 * One set of controls in the home menu's Controls column: a row with its name
 * and, at its right edge, a lamp, lit blue on the layout in use. Picking the
 * row puts the layout in use.
 */
export interface LayoutRowProps {
  label: string // The layout's name, such as "Arrow keys"
  chosen: boolean // Whether the layout is in use
}

defineProps<LayoutRowProps>()
</script>

<template>
  <button
    class="layout-row menu-row"
    :class="{
      'layout-row-chosen': chosen,
    }"
    type="button"
    :aria-label="chosen ? `${label}, in use` : label"
  >
    <span class="menu-row-label">{{ label }}</span>
    <span class="layout-row-lamp" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
/* An indicator lamp at the row's right edge: unlit, a dark ring set into the wall */
.layout-row-lamp {
  flex: none;
  width: 1.125rem;
  height: 1.125rem;
  border: 0.125rem solid rgba(var(--color-ink-rgb), 0.35);
  border-radius: 50%;
  background: var(--color-wall);
  transition: background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
}

/* Lit on the layout in use, in the blue of the switches that are on, with a faint glow */
.layout-row-chosen .layout-row-lamp {
  border-color: var(--color-blue-deep);
  background: var(--color-blue);
  box-shadow: 0 0 0 0.25rem rgba(var(--color-blue-rgb), 0.25);
}

/* Unlit, the ring shows against the dark bar of the row with the keyboard */
.menu-row-active .layout-row-lamp {
  border-color: rgba(var(--color-white-rgb), 0.75);
}

.menu-row-active.layout-row-chosen .layout-row-lamp {
  border-color: var(--color-white);
}
</style>
