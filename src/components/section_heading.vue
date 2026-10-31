<script setup lang="ts">
/**
 * A section heading in signage style: blue and orange slashes, the title in
 * condensed italic capitals, and a thin rule running to the right edge. Anything
 * passed in the slot (such as a progress count) sits after the rule.
 */
export interface SectionHeadingProps {
  headingId: string
  title: string
}

defineProps<SectionHeadingProps>()
</script>

<template>
  <div class="section-heading">
    <span class="heading-mark" aria-hidden="true">
      <span class="heading-mark-blue"></span>
      <span class="heading-mark-orange"></span>
    </span>
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

/* Blue and orange slashes, the portal pair as a heading mark */
.heading-mark {
  display: inline-flex;
  gap: 0.3rem;
  margin-right: -0.25rem;
}

.heading-mark-blue,
.heading-mark-orange {
  width: 0.45rem;
  height: 1.875rem;
  transform: skewX(-24deg);
}

.heading-mark-blue {
  background: var(--color-blue);
}

.heading-mark-orange {
  background: var(--color-orange);
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
