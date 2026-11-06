<script setup lang="ts">
/**
 * The controls legend shown beside the chamber: the same four controls as the
 * original game, then undo and redo, and Escape for the pause dialog, each
 * with what it does.
 */
</script>

<template>
  <section class="legend" aria-labelledby="legend-heading">
    <h2 id="legend-heading" class="legend-heading ruled-label">Controls</h2>
    <dl class="legend-list">
      <div class="legend-row">
        <dt class="arrow-keys">
          <kbd class="keycap arrow-up" aria-label="Up">↑</kbd>
          <kbd class="keycap arrow-left" aria-label="Left">←</kbd>
          <kbd class="keycap arrow-down" aria-label="Down">↓</kbd>
          <kbd class="keycap arrow-right" aria-label="Right">→</kbd>
        </dt>
        <dd class="legend-action">
          <span class="action-name">Move</span>
          <span class="action-detail">Navigate the chamber</span>
        </dd>
      </div>
      <div class="legend-row">
        <dt><kbd class="keycap">A</kbd></dt>
        <dd class="legend-action legend-action-blue">
          <span class="action-name">Blue portal</span>
          <span class="action-detail">Shoot a blue portal</span>
        </dd>
      </div>
      <div class="legend-row">
        <dt><kbd class="keycap">D</kbd></dt>
        <dd class="legend-action legend-action-orange">
          <span class="action-name">Orange portal</span>
          <span class="action-detail">Shoot an orange portal</span>
        </dd>
      </div>
      <div class="legend-row">
        <dt><kbd class="keycap keycap-wide">Space</kbd></dt>
        <dd class="legend-action">
          <span class="action-name">Interact</span>
          <span class="action-detail">Use switches, pick up and drop boxes</span>
        </dd>
      </div>
      <div class="legend-row">
        <dt><kbd class="keycap">Z</kbd></dt>
        <dd class="legend-action">
          <span class="action-name">Undo</span>
          <span class="action-detail">Take back the last step</span>
        </dd>
      </div>
      <div class="legend-row">
        <dt><kbd class="keycap">X</kbd></dt>
        <dd class="legend-action">
          <span class="action-name">Redo</span>
          <span class="action-detail">Bring back a step you undid</span>
        </dd>
      </div>
      <div class="legend-row">
        <dt><kbd class="keycap">Esc</kbd></dt>
        <dd class="legend-action">
          <span class="action-name">Pause</span>
          <span class="action-detail">Open the pause menu</span>
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.legend {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

/* Section sign: a slanted blue mark, then the label and its rule */
.legend-heading {
  font-size: 1.0625rem;
  letter-spacing: 0.22em;
}

.legend-heading::before {
  content: '';
  flex: none;
  width: 0.625rem;
  height: 1rem;
  margin-right: -0.25rem;
  background: var(--color-blue);
  transform: skewX(-24deg);
}

.legend-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.legend-row {
  display: grid;
  grid-template-columns: 8.25rem 1fr;
  align-items: center;
  gap: 1.125rem;
}

.legend-row dt {
  display: flex;
}

/* What the key does, behind a divider: thin and grey, or a portal's colour */
.legend-action {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding-left: 1.25rem;
}

.legend-action::before {
  content: '';
  position: absolute;
  top: 0.125rem;
  bottom: 0.125rem;
  left: 0;
  width: 0.125rem;
  background: var(--color-ink-muted);
}

.legend-action-blue::before {
  width: 0.25rem;
  background: var(--color-blue);
}

.legend-action-orange::before {
  width: 0.25rem;
  background: var(--color-orange);
}

.action-name {
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.25;
}

.action-detail {
  color: var(--color-ink-muted);
  font-size: 0.8125rem;
  font-style: italic;
  line-height: 1.3;
}

/* Inverted-T arrow cluster */
.legend-row .arrow-keys {
  display: grid;
  grid-template-columns: repeat(3, 2.5rem);
  grid-template-rows: repeat(2, 2.25rem);
  gap: 0.375rem;
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
  min-width: 8.25rem;
}
</style>
