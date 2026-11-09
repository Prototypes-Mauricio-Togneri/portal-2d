<script setup lang="ts">
/**
 * What a key cap shows for a bound key: a small triangle pointing its way for
 * an arrow key, and what the player's keyboard prints on it for any other.
 */
import {computed} from 'vue'
import type {BoundKey} from '@/game/key_bindings'
import {getKeyArrow, getKeyLabel} from '@/services/key_labels'

export interface KeyGlyphProps {
  boundKey: BoundKey // The key shown
}

const props = defineProps<KeyGlyphProps>()

const arrow = computed(() => getKeyArrow(props.boundKey))
const keyLabel = computed(() => getKeyLabel(props.boundKey))
</script>

<template>
  <svg
    v-if="arrow !== null"
    class="key-arrow"
    :class="`key-arrow-${arrow}`"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M12 8 L17.5 16.5 H6.5 Z" />
  </svg>
  <template v-else>{{ keyLabel.text }}</template>
</template>

<style scoped>
/* A small triangle with softened corners, drawn pointing up and turned for the other arrows */
.key-arrow {
  display: block;
  width: 1rem;
  height: 1rem;
  fill: currentColor;
  stroke: currentColor;
  stroke-width: 1;
  stroke-linejoin: round;
}

.key-arrow-right {
  transform: rotate(90deg);
}

.key-arrow-down {
  transform: rotate(180deg);
}

.key-arrow-left {
  transform: rotate(270deg);
}
</style>
