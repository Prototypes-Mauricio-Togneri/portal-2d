<script setup lang="ts">
/**
 * A mouse button bound to a game key, drawn where a key cap would be: a small
 * mouse with that button filled in, in its portal's colour for a portal key.
 */
import {computed} from 'vue'
import type {MouseButton} from '@/game/key_bindings'

/** A portal, whose colour fills the button that shoots it. */
type MouseGlyphPortal = 'blue' | 'orange'

export interface MouseGlyphProps {
  button: MouseButton // The button filled in
  portal?: MouseGlyphPortal | null // The portal the button shoots, if any
}

const props = withDefaults(defineProps<MouseGlyphProps>(), {
  portal: null,
})

// What a screen reader says for the drawing
const label = computed(() => (props.button === 'left') ? 'Left mouse button' : 'Right mouse button')
</script>

<template>
  <svg
    class="mouse-glyph"
    :class="portal === null ? null : `mouse-glyph-${portal}`"
    viewBox="0 0 27 36"
    role="img"
    :aria-label="label"
  >
    <rect
      class="mouse-body"
      x="0.5"
      y="0.5"
      width="26"
      height="35"
      rx="13"
    />
    <path v-if="button === 'left'" class="mouse-button" d="M13.5 0.5 A13 13 0 0 0 0.5 13.5 V14.5 H13.5 Z" />
    <path v-else class="mouse-button" d="M13.5 0.5 A13 13 0 0 1 26.5 13.5 V14.5 H13.5 Z" />
    <rect
      class="mouse-edge"
      x="0.5"
      y="0.5"
      width="26"
      height="35"
      rx="13"
    />
    <path class="mouse-edge" d="M13.5 0.5 V14.5 M0.5 14.5 H26.5" />
  </svg>
</template>

<style scoped>
/* As tall as a key cap, white with the cap's edge and shadow, so it reads as a second device */
.mouse-glyph {
  display: block;
  flex: none;
  width: 1.6875rem;
  height: 2.25rem;
  color: var(--color-ink-muted);
  filter: drop-shadow(0 0.25rem 0.25rem rgba(var(--color-ink-rgb), 0.12));
}

.mouse-glyph-blue {
  color: var(--color-blue);
}

.mouse-glyph-orange {
  color: var(--color-orange);
}

.mouse-body {
  fill: var(--color-white);
}

.mouse-button {
  fill: currentColor;
}

/* Outline and seams drawn over the filled button, so its edge stays the cap's grey */
.mouse-edge {
  fill: none;
  stroke: var(--color-rule);
}
</style>
