<script setup lang="ts">
/**
 * The chamber's sign at the top of the chamber screen's rail, a white plate
 * framed in grey: the chamber's number with its place in the list against it
 * and, at the end of that line, whatever the screen puts in the slot (the
 * clock), a rule, then two rows of
 * pictograms, one for each kind of element a chamber can hold, dark when this
 * chamber has it and faint when it hasn't. A mirror box is listed among the
 * boxes, so its pictogram is the one special case: dark when any box holds a
 * mirror.
 */
import {computed} from 'vue'
import ElementPictogram from '@/components/element_pictogram.vue'
import type {PictogramKind} from '@/components/element_pictogram.vue'
import type {ChamberData} from '@/game/chamber_data'
import {CHAMBERS} from '@/services/chamber_catalogue'

/** A field of a chamber file that lists elements. */
type ElementListField = {
  [Field in keyof ChamberData]-?: NonNullable<ChamberData[Field]> extends readonly unknown[] ? Field : never
}[keyof ChamberData]

/** One kind of element on the sign. */
type SignElement = {
  kind: PictogramKind // Its pictogram
  field: ElementListField // The chamber file's field that lists it
  name: string // What the player calls it, in sentence case
}

export interface ChamberSignProps {
  chamberNumber: number | null // Which chamber in the list, counted from 0, or null for the playground
  layout: ChamberData | undefined // The chamber's file, read for the elements it holds
}

// In the sign's order, left to right
const SIGN_ELEMENTS: readonly SignElement[] = [
  {
    kind: 'box',
    field: 'boxes',
    name: 'Box',
  },
  {
    kind: 'button',
    field: 'buttons',
    name: 'Button',
  },
  {
    kind: 'switch',
    field: 'switches',
    name: 'Switch',
  },
  {
    kind: 'door',
    field: 'doors',
    name: 'Door',
  },
  {
    kind: 'arrow',
    field: 'arrows',
    name: 'Arrow',
  },
  {
    kind: 'slideFloor',
    field: 'slideFloors',
    name: 'Slide floor',
  },
  {
    kind: 'ditch',
    field: 'ditches',
    name: 'Ditch',
  },
  {
    kind: 'blockedWall',
    field: 'blockedWalls',
    name: 'Blocked wall',
  },
  {
    kind: 'laser',
    field: 'lasers',
    name: 'Laser',
  },
  {
    kind: 'fizzler',
    field: 'fizzlers',
    name: 'Fizzler',
  },
  {
    kind: 'lightBarrier',
    field: 'lightBarriers',
    name: 'Light barrier',
  },
  {
    kind: 'emitter',
    field: 'emitters',
    name: 'Emitter',
  },
  {
    kind: 'receiver',
    field: 'receivers',
    name: 'Receiver',
  },
  {
    kind: 'mirrorBox',
    field: 'boxes',
    name: 'Mirror box',
  },
]

const props = defineProps<ChamberSignProps>()

const signNumber = computed(() => formatSignNumber(props.chamberNumber)) // Two digits, as on a test chamber sign; blank for the playground
const lastNumber = computed(() => formatSignNumber(props.chamberNumber === null ? null : CHAMBERS.length - 1)) // The last chamber's number; blank for the playground, which is outside the list
const heading = computed(() => props.chamberNumber === null ? 'Playground' : `Chamber ${signNumber.value} of ${lastNumber.value}`) // What a screen reader reads for the number and the place in the list
const elements = computed(() => SIGN_ELEMENTS.map((element) => ({
  kind: element.kind,
  name: element.name,
  present: (element.kind === 'mirrorBox') ? (props.layout?.boxes ?? []).some((box) => box.mirror !== undefined) : ((props.layout?.[element.field]?.length ?? 0) > 0),
})))

/**
 * Writes a chamber's number as the sign shows it.
 * @param chamberNumber - Which chamber in the list, counted from 0, or null for none
 * @returns At least two digits, or "--" for none
 */
function formatSignNumber(chamberNumber: number | null): string {
  return chamberNumber === null ? '--' : String(chamberNumber).padStart(2, '0')
}
</script>

<template>
  <div class="chamber-sign">
    <div class="sign-head">
      <div class="sign-place">
        <h1 class="sign-number">
          <span class="visually-hidden">{{ heading }}</span>
          <span aria-hidden="true">{{ signNumber }}</span>
        </h1>
        <span class="sign-fraction" aria-hidden="true">/{{ lastNumber }}</span>
      </div>
      <slot></slot>
    </div>
    <div class="sign-rule"></div>
    <ul class="sign-elements" aria-label="In this chamber">
      <li
        v-for="element in elements"
        :key="element.kind"
        class="sign-element"
        :class="{
          'sign-element-absent': !element.present,
        }"
        :aria-hidden="element.present ? undefined : 'true'"
      >
        <ElementPictogram :kind="element.kind" />
        <span v-if="element.present" class="visually-hidden">{{ element.name }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* The plate: a white face framed in muted grey, standing off the rail like a sign fixed to the
   wall. A little extra room under it sets the sign apart from the controls */
.chamber-sign {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  margin-bottom: 0.25rem;
  padding: 1.125rem 1.25rem;
  border: 0.125rem solid var(--color-ink-muted);
  background: var(--color-white);
  box-shadow: 0 0.375rem 1rem rgba(var(--color-ink-rgb), 0.12);
}

/* The number in the sign face's light weight, pulled left by the digits' side bearing so its
   stroke lines up with the rest of the plate */
.sign-number {
  margin-left: -0.07em;
  font-family: var(--font-display);
  font-size: 6.5rem;
  font-weight: 300;
  letter-spacing: -0.03em;
  line-height: 0.74;
  font-variant-numeric: tabular-nums;
}

/* One line on the number's baseline: the number with its place in the list against it, and the
   slot's clock at the end */
.sign-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.sign-place {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.sign-fraction {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.sign-rule {
  height: 0.125rem;
  background: var(--color-ink);
}

/* The elements, in rows of seven, with room in the second for the kinds still to come */
.sign-elements {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
  margin-top: 0.25rem;
}

/* A framed square, its pictogram inset by 7% of its width on each side */
.sign-element {
  aspect-ratio: 1;
  padding: 7%;
  border: 0.09375rem solid var(--color-ink);
  color: var(--color-ink);
}

/* An element this chamber doesn't hold */
.sign-element-absent {
  border-color: rgba(var(--color-ink-rgb), 0.16);
  color: rgba(var(--color-ink-rgb), 0.16);
}
</style>
