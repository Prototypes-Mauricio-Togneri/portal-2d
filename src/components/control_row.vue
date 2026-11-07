<script setup lang="ts">
/**
 * One game key in the home menu's Controls column: a row with what the key
 * does and, at its right edge, the key it is bound to. Picking the row waits
 * for a new key; the row then shows an empty key asking for one, or says
 * which key it refused.
 */
import {computed} from 'vue'
import type {BoundKey} from '@/game/key_bindings'
import {getKeyLabel} from '@/services/key_labels'

/** A portal key, whose cap carries the portal's colour on its edge. */
type ControlPortal = 'blue' | 'orange'

export interface ControlRowProps {
  label: string // What the key does, such as "Blue portal"
  boundKey: BoundKey // The key it is bound to
  portal?: ControlPortal | null // The portal the key shoots, if any
  waiting?: boolean // Whether the row is waiting for a new key
  refusedKey?: string | null // The key last refused while waiting, by name, or null
}

const props = withDefaults(defineProps<ControlRowProps>(), {
  portal: null,
  waiting: false,
  refusedKey: null,
})

const keyLabel = computed(() => getKeyLabel(props.boundKey))

// The row reads as its action and key; while it waits, as what it waits for
const accessibleName = computed(() => {
  if (!props.waiting) {
    return `${props.label}, ${keyLabel.value.name}`
  }
  return props.refusedKey === null ? `${props.label}, press a key` : `${props.label}, can't use ${props.refusedKey}, press another key`
})
</script>

<template>
  <button
    class="control-row menu-row"
    type="button"
    :aria-label="accessibleName"
  >
    <span class="menu-row-label">{{ label }}</span>
    <span
      v-if="waiting"
      class="control-row-prompt"
      :class="{
        'control-row-refused': refusedKey !== null,
      }"
      aria-hidden="true"
    >{{ refusedKey === null ? 'Press a key' : `Can't use ${refusedKey}` }}</span>
    <kbd
      v-else
      class="keycap control-row-key"
      :class="portal === null ? null : `control-row-key-${portal}`"
      aria-hidden="true"
    >{{ keyLabel.text }}</kbd>
  </button>
</template>

<style scoped>
/* The bound key at the row's right edge, raised off the wall */
.control-row-key {
  flex: none;
}

/* A portal key's cap carries its portal's colour along the bottom edge, as the legend's divider does */
.control-row-key-blue {
  border-bottom-color: var(--color-blue);
}

.control-row-key-orange {
  border-bottom-color: var(--color-orange);
}

/* Waiting: an empty key, outlined where the cap was, breathing until a key is pressed */
.control-row-prompt {
  display: inline-flex;
  flex: none;
  align-items: center;
  height: 2.25rem;
  padding: 0 1rem;
  border: 0.125rem dashed rgba(var(--color-white-rgb), 0.75);
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1;
  animation: control-row-waiting 1.2s ease-in-out infinite alternate;
}

/* A refused key: the outline holds still and the note stays, until another key is pressed */
.control-row-refused {
  border-style: solid;
  animation: none;
}

@keyframes control-row-waiting {
  from {
    border-color: rgba(var(--color-white-rgb), 0.35);
  }
}
</style>
