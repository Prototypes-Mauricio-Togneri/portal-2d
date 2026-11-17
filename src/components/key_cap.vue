<script setup lang="ts">
/**
 * A bound key as the player sees it: a key cap showing what their keyboard
 * prints on it (an arrow key as a small triangle). Classes and attributes
 * given to it land on the cap.
 */
import KeyGlyph from '@/components/key_glyph.vue'
import type {BoundKey} from '@/game/key_bindings'

export interface KeyCapProps {
  boundKey: BoundKey // The key shown
}

defineProps<KeyCapProps>()
</script>

<template>
  <kbd class="keycap"><KeyGlyph :bound-key="boundKey" /></kbd>
</template>
