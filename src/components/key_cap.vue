<script setup lang="ts">
/**
 * A bound key as the player sees it: a key cap showing what their keyboard
 * prints on it (an arrow key as a small triangle), or, for a mouse button, a
 * small mouse with that button filled in. Classes and attributes given to it
 * land on the cap or the mouse.
 */
import {computed} from 'vue'
import KeyGlyph from '@/components/key_glyph.vue'
import MouseGlyph from '@/components/mouse_glyph.vue'
import {type BoundKey, getKeyMouseButton} from '@/game/key_bindings'

/** A portal, whose colour fills a mouse button that shoots it. */
type KeyCapPortal = 'blue' | 'orange'

export interface KeyCapProps {
  boundKey: BoundKey // The key or mouse button shown
  portal?: KeyCapPortal | null // The portal it shoots, if any
}

const props = withDefaults(defineProps<KeyCapProps>(), {
  portal: null,
})

const mouseButton = computed(() => getKeyMouseButton(props.boundKey))
</script>

<template>
  <MouseGlyph v-if="mouseButton !== null" :button="mouseButton" :portal="portal" />
  <kbd v-else class="keycap"><KeyGlyph :bound-key="boundKey" /></kbd>
</template>
