<script setup lang="ts">
/**
 * Home screen: pick a chamber to play, or open the settings.
 * The left and right arrow keys move between the chamber cards.
 */
import {computed, useTemplateRef} from 'vue'
import ChamberCard from '@/components/chamber_card.vue'
import PortalLogo from '@/components/portal_logo.vue'
import SectionHeading from '@/components/section_heading.vue'
import {useArrowFocus} from '@/composables/use_arrow_focus'
import {CHAMBERS} from '@/services/chamber_catalogue'
import {completedChambers} from '@/services/progress'

const completedCount = computed(() => CHAMBERS.filter((chamber) => completedChambers.value.includes(chamber.number)).length)

const chamberList = useTemplateRef<HTMLElement>('chamberList')

useArrowFocus(chamberList, '.chamber-card')
</script>

<template>
  <main class="home-screen room">
    <div class="home-inner room-inner">
      <header class="room-header">
        <h1 class="room-title">
          <PortalLogo size="large" />
        </h1>
        <RouterLink
          class="button button-sign settings-link"
          :to="{
            name: 'settings',
          }"
        >
          <svg class="settings-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9.83 3.89L10.09 1.17A11 11 0 0 1 13.91 1.17L14.17 3.89A8.4 8.4 0 0 1 16.2 4.73L18.31 2.99A11 11 0 0 1 21.01 5.69L19.27 7.8A8.4 8.4 0 0 1 20.11 9.83L22.83 10.09A11 11 0 0 1 22.83 13.91L20.11 14.17A8.4 8.4 0 0 1 19.27 16.2L21.01 18.31A11 11 0 0 1 18.31 21.01L16.2 19.27A8.4 8.4 0 0 1 14.17 20.11L13.91 22.83A11 11 0 0 1 10.09 22.83L9.83 20.11A8.4 8.4 0 0 1 7.8 19.27L5.69 21.01A11 11 0 0 1 2.99 18.31L4.73 16.2A8.4 8.4 0 0 1 3.89 14.17L1.17 13.91A11 11 0 0 1 1.17 10.09L3.89 9.83A8.4 8.4 0 0 1 4.73 7.8L2.99 5.69A11 11 0 0 1 5.69 2.99L7.8 4.73A8.4 8.4 0 0 1 9.83 3.89ZM15.4 12A3.4 3.4 0 1 0 8.6 12A3.4 3.4 0 1 0 15.4 12Z" />
          </svg>
          Settings
        </RouterLink>
      </header>

      <section class="chambers" aria-labelledby="chambers-heading">
        <SectionHeading heading-id="chambers-heading" title="Choose a chamber">
          <p class="chambers-progress">{{ completedCount }} of {{ CHAMBERS.length }} completed</p>
        </SectionHeading>
        <ol ref="chamberList" class="chamber-list">
          <li v-for="chamber in CHAMBERS" :key="chamber.number">
            <ChamberCard :chamber="chamber" :completed="completedChambers.includes(chamber.number)" />
          </li>
        </ol>
      </section>
    </div>
  </main>
</template>

<style scoped>
.home-inner {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  min-height: 100%;
}

/* The gear sits close to the frame */
.settings-link {
  padding-left: 1.25rem;
}

.settings-icon {
  width: 1.5rem;
  height: 1.5rem;
  fill: currentColor;
  fill-rule: evenodd;
}

/* Chamber selection, stretched down to the floor */
.chambers {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2rem;
}

.chambers-progress {
  color: var(--color-ink-muted);
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
}

.chamber-list {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 2rem;
}
</style>
