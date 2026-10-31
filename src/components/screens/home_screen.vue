<script setup lang="ts">
/**
 * Home screen: pick a chamber to play, or open the settings.
 * The left and right arrow keys move between the chamber cards.
 */
import {computed, onBeforeUnmount, onMounted, useTemplateRef} from 'vue'
import ChamberCard from '@/components/chamber_card.vue'
import PortalLogo from '@/components/portal_logo.vue'
import {CHAMBERS} from '@/services/chamber_catalogue'
import {completedChambers} from '@/services/progress'

const completedCount = computed(() => CHAMBERS.filter((chamber) => completedChambers.value.includes(chamber.number)).length)

const chamberList = useTemplateRef<HTMLElement>('chamberList')

/**
 * Lists the chamber cards in visual order.
 * @returns The card links inside the chamber list
 */
function chamberCards(): HTMLElement[] {
  return Array.from(chamberList.value?.querySelectorAll<HTMLElement>('.chamber-card') ?? [])
}

/**
 * Moves focus to the card at the given offset from the focused one, wrapping around.
 * With no card focused, starts from the first card (forwards) or the last (backwards).
 * @param offset - +1 for next, -1 for previous
 */
function moveFocus(offset: number): void {
  const cards = chamberCards()
  if (cards.length === 0) {
    return
  }
  const currentIndex = cards.findIndex((card) => card === document.activeElement)
  if (currentIndex === -1) {
    cards[offset > 0 ? 0 : cards.length - 1]?.focus()
    return
  }
  const nextIndex = (currentIndex + offset + cards.length) % cards.length
  cards[nextIndex]?.focus()
}

/**
 * Left and right arrows move between the chamber cards.
 * @param event - Keyboard event
 */
function handleKeydown(event: KeyboardEvent): void {
  // With a modifier the arrows are browser shortcuts (Alt+Left goes back), so leave them alone
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return
  }
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault()
      moveFocus(1)
      break
    case 'ArrowLeft':
      event.preventDefault()
      moveFocus(-1)
      break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <main class="home-screen">
    <div class="home-inner">
      <header class="home-header">
        <h1 class="home-title">
          <PortalLogo size="large" />
        </h1>
        <RouterLink
          class="button button-quiet settings-link"
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
        <div class="chambers-intro">
          <span class="chambers-mark" aria-hidden="true">
            <span class="chambers-mark-blue"></span>
            <span class="chambers-mark-orange"></span>
          </span>
          <h2 id="chambers-heading" class="chambers-heading">Choose a chamber</h2>
          <span class="chambers-rule" aria-hidden="true"></span>
          <p class="chambers-progress">{{ completedCount }} of {{ CHAMBERS.length }} completed</p>
        </div>
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
/* Test room photo; it stays put while the content scrolls over it */
.home-screen {
  height: 100%;
  overflow-y: auto;
  background: var(--color-wall) url('@/assets/images/facility_room.webp') center / cover no-repeat;
}

/* Padding keeps the content on the room's back wall, clear of the side walls, window and floor */
.home-inner {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  min-height: 100%;
  max-width: calc(90rem + 20vw);
  margin: 0 auto;
  padding: 3.5rem 10vw 12vh;
}

/* Wordmark and settings */
.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

.home-title {
  font-size: inherit;
}

.settings-link {
  min-height: 3.25rem;
  padding: 0 1.5rem 0 1.25rem;
  border-width: 0.125rem;
  border-color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.settings-link:hover {
  border-color: var(--color-blue-deep);
  color: var(--color-blue-deep);
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

.chambers-intro {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

/* Blue and orange slashes, the portal pair as a heading mark */
.chambers-mark {
  display: inline-flex;
  gap: 0.3rem;
  margin-right: -0.25rem;
}

.chambers-mark-blue,
.chambers-mark-orange {
  width: 0.45rem;
  height: 1.875rem;
  transform: skewX(-24deg);
}

.chambers-mark-blue {
  background: var(--color-blue);
}

.chambers-mark-orange {
  background: var(--color-orange);
}

.chambers-heading {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-style: italic;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.chambers-rule {
  flex: 1;
  height: 1px;
  background: rgba(var(--color-ink-rgb), 0.45);
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
