<script setup lang="ts">
/**
 * The controls legend shown beside the chamber: the same four controls as the
 * original game, plus Escape for the pause dialog.
 */
</script>

<template>
  <section class="legend" aria-labelledby="legend-heading">
    <h2 id="legend-heading" class="legend-heading">Controls</h2>
    <dl class="legend-list">
      <div class="legend-row">
        <dt class="arrow-keys">
          <kbd class="keycap arrow-up" aria-label="Up">↑</kbd>
          <kbd class="keycap arrow-left" aria-label="Left">←</kbd>
          <kbd class="keycap arrow-down" aria-label="Down">↓</kbd>
          <kbd class="keycap arrow-right" aria-label="Right">→</kbd>
        </dt>
        <dd>Move</dd>
      </div>
      <div class="legend-row">
        <dt><kbd class="keycap">A</kbd></dt>
        <dd><span class="portal-swatch portal-swatch-blue" aria-hidden="true"></span>Blue portal</dd>
      </div>
      <div class="legend-row">
        <dt><kbd class="keycap">D</kbd></dt>
        <dd><span class="portal-swatch portal-swatch-orange" aria-hidden="true"></span>Orange portal</dd>
      </div>
      <div class="legend-row">
        <dt><kbd class="keycap keycap-wide">Space</kbd></dt>
        <dd>Interact</dd>
      </div>
      <div class="legend-row">
        <dt><kbd class="keycap">Esc</kbd></dt>
        <dd>Pause</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.legend {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.legend-heading {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-rule);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.2;
}

.legend-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.legend-row {
  display: grid;
  grid-template-columns: 6.5rem 1fr;
  align-items: center;
  gap: 0.75rem;
}

.legend-row dt {
  display: flex;
}

.legend-row dd {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

/* Inverted-T arrow cluster */
.legend-row .arrow-keys {
  display: grid;
  grid-template-columns: repeat(3, 2rem);
  grid-template-rows: repeat(2, 2rem);
  gap: 0.25rem;
}

.arrow-keys .keycap {
  min-width: 0;
  padding: 0;
}

.arrow-up {
  grid-column: 2;
  grid-row: 1;
}

.arrow-left {
  grid-column: 1;
  grid-row: 2;
}

.arrow-down {
  grid-column: 2;
  grid-row: 2;
}

.arrow-right {
  grid-column: 3;
  grid-row: 2;
}

.keycap-wide {
  min-width: 6.5rem;
}

/* Portal colour swatches, half a tile like the portals in the chamber */
.portal-swatch {
  width: 0.375rem;
  height: 1.25rem;
}

.portal-swatch-blue {
  background: var(--color-blue);
}

.portal-swatch-orange {
  background: var(--color-orange);
}
</style>
