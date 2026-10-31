<script setup lang="ts">
/**
 * Home screen: pick a chamber to play, or open the settings.
 */
import {computed} from 'vue'
import ChamberCard from '@/components/chamber_card.vue'
import PortalLogo from '@/components/portal_logo.vue'
import {CHAMBERS} from '@/services/chamber_catalogue'
import {completedChambers} from '@/services/progress'

const completedCount = computed(() => CHAMBERS.filter((chamber) => completedChambers.value.includes(chamber.number)).length)
</script>

<template>
  <main class="home-screen wall">
    <div class="home-inner">
      <header class="home-header">
        <h1 class="home-title">
          <PortalLogo size="large" />
        </h1>
        <RouterLink
          class="button button-quiet"
          :to="{
            name: 'settings',
          }"
        >
          Settings
        </RouterLink>
      </header>

      <section class="chambers" aria-labelledby="chambers-heading">
        <div class="chambers-intro">
          <h2 id="chambers-heading" class="chambers-heading">Choose a test chamber</h2>
          <p class="chambers-progress">{{ completedCount }} of {{ CHAMBERS.length }} completed</p>
        </div>
        <ol class="chamber-list">
          <li v-for="chamber in CHAMBERS" :key="chamber.number">
            <ChamberCard :chamber="chamber" :completed="completedChambers.includes(chamber.number)" />
          </li>
        </ol>
      </section>
    </div>
  </main>
</template>

<style scoped>
.home-screen {
  height: 100%;
  overflow-y: auto;
}

.home-inner {
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
  max-width: 80rem;
  margin: 0 auto;
  padding: 3.5rem 4rem 4rem;
}

/* Wordmark and settings */
.home-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
}

.home-title {
  font-size: inherit;
}

/* Chamber selection */
.chambers {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.chambers-intro {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.875rem;
  border-bottom: 1px solid var(--color-rule);
}

.chambers-heading {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.1;
}

.chambers-progress {
  color: var(--color-ink-muted);
  font-variant-numeric: tabular-nums;
}

.chamber-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
  gap: 1.5rem;
}
</style>
