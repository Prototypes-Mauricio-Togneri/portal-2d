<script setup lang="ts">
/**
 * The controls legend shown beside the chamber: moving, turning in place,
 * both portals and interacting, then undo and redo, each on the key the
 * player has bound to it, and Escape for the pause dialog, each with what it
 * does. The keys show what the player's keyboard prints on them.
 */
import {computed, onMounted} from 'vue'
import {GameKey} from '@/game/game_key'
import {keyBindings} from '@/services/key_bindings'
import {getKeyLabel, type KeyLabel, refreshKeyLabels} from '@/services/key_labels'

/** A key shown in the legend: its label, and whether it is drawn as a spacebar. */
type LegendKey = KeyLabel & {
  wide: boolean // Whether the key is Space, drawn as wide as the key column like the bar it is
}

/**
 * The key bound to a game key, as the legend shows it.
 * @param gameKey - The game key
 * @returns Its label, and whether it is drawn as a spacebar
 */
function legendKey(gameKey: GameKey): LegendKey {
  const key = keyBindings.value[gameKey]
  return {
    ...getKeyLabel(key),
    wide: key === 'Space',
  }
}

// The bound key of every game key the legend lists, as shown
const keys = computed(() => ({
  [GameKey.UP]: legendKey(GameKey.UP),
  [GameKey.DOWN]: legendKey(GameKey.DOWN),
  [GameKey.LEFT]: legendKey(GameKey.LEFT),
  [GameKey.RIGHT]: legendKey(GameKey.RIGHT),
  [GameKey.TURN]: legendKey(GameKey.TURN),
  [GameKey.BLUE]: legendKey(GameKey.BLUE),
  [GameKey.ORANGE]: legendKey(GameKey.ORANGE),
  [GameKey.INTERACT]: legendKey(GameKey.INTERACT),
  [GameKey.UNDO]: legendKey(GameKey.UNDO),
  [GameKey.REDO]: legendKey(GameKey.REDO),
}))

// The player may have switched keyboard layouts since the labels were read
onMounted(refreshKeyLabels)
</script>

<template>
  <section class="legend" aria-labelledby="legend-heading">
    <h2 id="legend-heading" class="legend-heading ruled-label">Controls</h2>
    <dl class="legend-list">
      <div class="legend-row">
        <dt class="arrow-keys">
          <kbd class="keycap arrow-up" :aria-label="keys.up.name">{{ keys.up.text }}</kbd>
          <kbd class="keycap arrow-left" :aria-label="keys.left.name">{{ keys.left.text }}</kbd>
          <kbd class="keycap arrow-down" :aria-label="keys.down.name">{{ keys.down.text }}</kbd>
          <kbd class="keycap arrow-right" :aria-label="keys.right.name">{{ keys.right.text }}</kbd>
        </dt>
        <dd class="legend-action">
          <span class="action-name">Move</span>
          <span class="action-detail">Navigate the chamber</span>
        </dd>
      </div>
      <div class="legend-row">
        <dt>
          <kbd
            class="keycap"
            :class="{
              'keycap-wide': keys.turn.wide,
            }"
            :aria-label="keys.turn.name"
          >{{ keys.turn.text }}</kbd>
        </dt>
        <dd class="legend-action">
          <span class="action-name">Turn in place</span>
          <span class="action-detail">Hold it, then a move key, to face that way</span>
        </dd>
      </div>
      <div class="legend-row">
        <dt>
          <kbd
            class="keycap"
            :class="{
              'keycap-wide': keys.blue.wide,
            }"
            :aria-label="keys.blue.name"
          >{{ keys.blue.text }}</kbd>
        </dt>
        <dd class="legend-action legend-action-blue">
          <span class="action-name">Blue portal</span>
          <span class="action-detail">Shoot a blue portal</span>
        </dd>
      </div>
      <div class="legend-row">
        <dt>
          <kbd
            class="keycap"
            :class="{
              'keycap-wide': keys.orange.wide,
            }"
            :aria-label="keys.orange.name"
          >{{ keys.orange.text }}</kbd>
        </dt>
        <dd class="legend-action legend-action-orange">
          <span class="action-name">Orange portal</span>
          <span class="action-detail">Shoot an orange portal</span>
        </dd>
      </div>
      <div class="legend-row">
        <dt>
          <kbd
            class="keycap"
            :class="{
              'keycap-wide': keys.interact.wide,
            }"
            :aria-label="keys.interact.name"
          >{{ keys.interact.text }}</kbd>
        </dt>
        <dd class="legend-action">
          <span class="action-name">Interact</span>
          <span class="action-detail">Use switches, pick up and drop boxes</span>
        </dd>
      </div>
      <div class="legend-row">
        <dt>
          <kbd
            class="keycap"
            :class="{
              'keycap-wide': keys.undo.wide,
            }"
            :aria-label="keys.undo.name"
          >{{ keys.undo.text }}</kbd>
        </dt>
        <dd class="legend-action">
          <span class="action-name">Undo</span>
          <span class="action-detail">Take back the last step</span>
        </dd>
      </div>
      <div class="legend-row">
        <dt>
          <kbd
            class="keycap"
            :class="{
              'keycap-wide': keys.redo.wide,
            }"
            :aria-label="keys.redo.name"
          >{{ keys.redo.text }}</kbd>
        </dt>
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

/* One key column shared by every row, as wide as the arrow cluster or the widest key bound,
   so the dividers stay in line whatever the keys */
.legend-list {
  display: grid;
  grid-template-columns: minmax(8.25rem, max-content) 1fr;
  column-gap: 1.125rem;
  row-gap: 1.5rem;
}

.legend-row {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  align-items: center;
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

/* Inverted-T cluster of the four move keys; a long label widens its column */
.legend-row .arrow-keys {
  display: grid;
  grid-template-columns: repeat(3, minmax(2.5rem, max-content));
  grid-template-rows: repeat(2, 2.25rem);
  gap: 0.375rem;
}

.arrow-keys .keycap {
  min-width: 0;
  padding: 0 0.5rem;
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

/* Space is drawn as a bar across the key column */
.keycap-wide {
  min-width: 8.25rem;
}
</style>
