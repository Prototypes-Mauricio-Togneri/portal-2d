<script setup lang="ts">
/**
 * One kind of chamber element as a pictogram on the chamber sign: a plain
 * line drawing after the element's sprite, in the current text colour. The
 * exit and walls are in every chamber, so they have none.
 */
import type {ElementKind} from '@/game/rules/element_registry'

export type PictogramKind = Exclude<ElementKind, 'wall' | 'exit'>

export interface ElementPictogramProps {
  kind: PictogramKind // The element drawn
}

defineProps<ElementPictogramProps>()
</script>

<template>
  <svg
    class="element-pictogram"
    viewBox="0 0 48 48"
    aria-hidden="true"
  >
    <template v-if="kind === 'box'">
      <path d="M12 8 H36 A4 4 0 0 1 40 12 V36 A4 4 0 0 1 36 40 H12 A4 4 0 0 1 8 36 V12 A4 4 0 0 1 12 8 Z M18.5 24 A5.5 5.5 0 1 0 29.5 24 A5.5 5.5 0 1 0 18.5 24" />
      <path class="pictogram-solid" d="M12.5 12.5 h6 v6 h-6 Z M29.5 12.5 h6 v6 h-6 Z M12.5 29.5 h6 v6 h-6 Z M29.5 29.5 h6 v6 h-6 Z" />
    </template>
    <template v-else-if="kind === 'button'">
      <path d="M11 24 A13 13 0 1 0 37 24 A13 13 0 1 0 11 24" />
      <path class="pictogram-solid" d="M16.5 24 A7.5 7.5 0 1 0 31.5 24 A7.5 7.5 0 1 0 16.5 24 M11 6.76 L15.24 11 L11 15.24 L6.76 11 Z M37 6.76 L41.24 11 L37 15.24 L32.76 11 Z M11 32.76 L15.24 37 L11 41.24 L6.76 37 Z M37 32.76 L41.24 37 L37 41.24 L32.76 37 Z" />
    </template>
    <template v-else-if="kind === 'switch'">
      <path d="M11 24 A13 13 0 1 0 37 24 A13 13 0 1 0 11 24" />
      <path class="pictogram-thin" d="M27.25 18.37 A6.5 6.5 0 1 1 18.37 20.75" />
      <path class="pictogram-solid" d="M20.6 16.9 L21.1 22.9 L15.3 20.6 Z M11 6.76 L15.24 11 L11 15.24 L6.76 11 Z M37 6.76 L41.24 11 L37 15.24 L32.76 11 Z M11 32.76 L15.24 37 L11 41.24 L6.76 37 Z M37 32.76 L41.24 37 L37 41.24 L32.76 37 Z" />
    </template>
    <template v-else-if="kind === 'door'">
      <path d="M7.5 8 h14 v32 h-14 Z M26.5 8 h14 v32 h-14 Z M21.5 18 A6 6 0 0 0 21.5 30 M26.5 18 A6 6 0 0 1 26.5 30" />
    </template>
    <template v-else-if="kind === 'arrow'">
      <path class="pictogram-bold" d="M12 26 L24 14 L36 26" />
      <path class="pictogram-bold pictogram-faded" d="M12 37 L24 25 L36 37" />
    </template>
    <template v-else-if="kind === 'ditch'">
      <path d="M8 8 h32 v32 h-32 Z" />
      <path class="pictogram-fine" d="M9 9 L17 17 M39 9 L31 17 M9 39 L17 31 M39 39 L31 31" />
      <path class="pictogram-solid" d="M17 17 h14 v14 h-14 Z" />
    </template>
    <template v-else-if="kind === 'blockedWall'">
      <path d="M11 16 A13 5 0 1 0 37 16 A13 5 0 1 0 11 16 M6 29 h36 v11 h-36 Z M9 27 L39 5" />
      <path class="pictogram-fine" d="M18 29 V40 M30 29 V40" />
    </template>
    <template v-else-if="kind === 'laser'">
      <path class="pictogram-solid" d="M5 14 h5 v20 h-5 Z M38 14 h5 v20 h-5 Z" />
      <path class="pictogram-heavy" d="M10 24 H38" />
      <path class="pictogram-glow" d="M13 18.5 H35 M13 29.5 H35" />
    </template>
    <template v-else-if="kind === 'fizzler'">
      <path class="pictogram-solid" d="M6 8 h4 v32 h-4 Z M38 8 h4 v32 h-4 Z M18 11 L19.5 15.5 L24 17 L19.5 18.5 L18 23 L16.5 18.5 L12 17 L16.5 15.5 Z M30 25 L31.5 29.5 L36 31 L31.5 32.5 L30 37 L28.5 32.5 L24 31 L28.5 29.5 Z M30 11.5 L30.9 14.1 L33.5 15 L30.9 15.9 L30 18.5 L29.1 15.9 L26.5 15 L29.1 14.1 Z M15.25 32 A1.75 1.75 0 1 0 18.75 32 A1.75 1.75 0 1 0 15.25 32 M22.6 24.5 A1.4 1.4 0 1 0 25.4 24.5 A1.4 1.4 0 1 0 22.6 24.5" />
    </template>
    <template v-else-if="kind === 'lightBarrier'">
      <path class="pictogram-solid" d="M5 14 h5 v20 h-5 Z M38 14 h5 v20 h-5 Z" />
      <path class="pictogram-band" d="M11.5 16.5 h25 v15 h-25 Z" />
      <path class="pictogram-hairline" d="M17.1 20 L20.5 22 L20.5 26 L17.1 28 L13.6 26 L13.6 22 Z M24 20 L27.5 22 L27.5 26 L24 28 L20.5 26 L20.5 22 Z M30.9 20 L34.4 22 L34.4 26 L30.9 28 L27.5 26 L27.5 22 Z" />
    </template>
  </svg>
</template>

<style scoped>
/* Lines in the text colour, filling the box it is given */
.element-pictogram {
  display: block;
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
}

/* Filled shapes: plates, tabs, the pit and sparks */
.pictogram-solid {
  fill: currentColor;
  stroke: none;
}

/* Line weights, heaviest first */
.pictogram-bold {
  stroke-width: 5;
}

.pictogram-heavy {
  stroke-width: 4;
}

.pictogram-thin,
.pictogram-band {
  stroke-width: 2.5;
}

.pictogram-fine {
  stroke-width: 2;
}

.pictogram-hairline {
  stroke-width: 1.6;
}

/* The laser's glow, dashed either side of the beam */
.pictogram-glow {
  stroke-width: 1.5;
  stroke-dasharray: 3 2.5;
}

/* The arrow's trailing chevron */
.pictogram-faded {
  opacity: 0.45;
}
</style>
