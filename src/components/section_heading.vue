<script setup lang="ts">
/**
 * A section heading in signage style: the title in condensed italic capitals
 * and a thin rule running to the right edge. Anything passed in the slot (such
 * as a progress count) sits after the rule.
 */
export interface SectionHeadingProps {
  headingId: string
  title: string
}

defineProps<SectionHeadingProps>()
</script>

<template>
  <div class="section-heading">
    <h2 :id="headingId" class="heading-title">{{ title }}</h2>
    <span class="heading-rule" aria-hidden="true"></span>
    <slot></slot>
  </div>
</template>

<style scoped>
.section-heading {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.heading-title {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-style: italic;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.heading-rule {
  flex: 1;
  height: 1px;
  background: rgba(var(--color-ink-rgb), 0.45);
}
</style>
