<script setup lang="ts">
/**
 * Home screen: a menu in up to three columns on the room's wall. The first
 * lists the sections (Play and Settings); moving through it changes nothing
 * else. Opening a section with Enter, Right or a click shows its chambers or
 * settings in the second column, starting level with the section's row, and
 * for Play the third shows the highlighted chamber's map. Up and Down move the
 * highlight in the column that has the keyboard, Left and Escape close the
 * section again. Every move of the highlight clicks. Settings ends with Reset
 * progress, which asks first in a dialog; while it is open the menu ignores the
 * keyboard and Escape closes it.
 */
import {computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef} from 'vue'
import type {Ref} from 'vue'
import ChamberMap from '@/components/chamber_map.vue'
import ChamberRow from '@/components/chamber_row.vue'
import ConfirmDialog from '@/components/confirm_dialog.vue'
import PortalLogo from '@/components/portal_logo.vue'
import SettingsSwitch from '@/components/settings_switch.vue'
import {Sound} from '@/game/sound'
import {CHAMBERS} from '@/services/chamber_catalogue'
import {lastChamber} from '@/services/last_chamber'
import {completedChambers, resetProgress} from '@/services/progress'
import {musicEnabled, playMusic, soundEnabled} from '@/services/settings'

/** A section listed in the first column. */
type MenuSection = 'play' | 'settings'

/** The column that has the keyboard: the sections, or the open section's items. */
type MenuColumn = 'sections' | 'items'

/** A section's row in the first column. */
type SectionEntry = {
  section: MenuSection // Which section the row opens
  label: string // Name on the row
}

/** An on/off setting listed under Settings. */
type SettingEntry = {
  label: string // Name on the row
  enabled: Ref<boolean> // The preference the row switches
}

const SECTIONS: SectionEntry[] = [
  {
    section: 'play',
    label: 'Play',
  },
  {
    section: 'settings',
    label: 'Settings',
  },
]

const settings: SettingEntry[] = [
  {
    label: 'Sound effects',
    enabled: soundEnabled,
  },
  {
    label: 'Music',
    enabled: musicEnabled,
  },
]

const RESET_PROGRESS_INDEX = settings.length // The Reset progress row comes after the switches

const menuId = useId()
const itemColumnId = `${menuId}-items`

// Back from a chamber, Play is open with that chamber highlighted and the keyboard in the second
// column; on the first arrival only the sections show, with Play highlighted and nothing open
const rememberedChamber = CHAMBERS.findIndex((chamber) => chamber.number === lastChamber())
const returning = rememberedChamber !== -1

const highlightedSection = ref<MenuSection>('play')
const openSection = ref<MenuSection | null>(returning ? 'play' : null)
const activeColumn = ref<MenuColumn>(returning ? 'items' : 'sections')
const highlightedChamber = ref(Math.max(rememberedChamber, 0))
const highlightedSetting = ref(0)
const resetDialogOpen = ref(false)

let pointerSection: MenuSection | null = null // Section row under the pointer, so only moving onto a row takes the keyboard

const sectionColumn = useTemplateRef<HTMLElement>('sectionColumn')
const itemColumn = useTemplateRef<HTMLElement>('itemColumn')

const highlightedItem = computed(() => (openSection.value === 'play' ? highlightedChamber.value : highlightedSetting.value))
const highlightedChamberEntry = computed(() => CHAMBERS[highlightedChamber.value])

/**
 * Counts the rows of the open section.
 * @returns How many chambers or settings (with Reset progress) it lists, or 0 with no section open
 */
function itemCount(): number {
  if (openSection.value === 'play') {
    return CHAMBERS.length
  }
  if (openSection.value === 'settings') {
    return settings.length + 1
  }
  return 0
}

/**
 * Builds the id of a section's row, which its item column is labelled by.
 * @param section - The section
 * @returns The row's id
 */
function sectionRowId(section: MenuSection): string {
  return `${menuId}-${section}`
}

/**
 * Finds a section's position in the first column.
 * @param section - The section
 * @returns Its index
 */
function sectionIndex(section: MenuSection): number {
  return SECTIONS.findIndex((entry) => entry.section === section)
}

/**
 * Highlights an item of the open section.
 * @param index - The item's index in the second column
 */
function highlightItem(index: number): void {
  if (openSection.value === 'play') {
    highlightedChamber.value = index
  } else {
    highlightedSetting.value = index
  }
}

/**
 * Lists a column's rows in visual order.
 * @param column - The column
 * @returns Its rows
 */
function rowElements(column: MenuColumn): HTMLElement[] {
  const container = column === 'sections' ? sectionColumn.value : itemColumn.value
  return Array.from(container?.querySelectorAll<HTMLElement>('.menu-row') ?? [])
}

/**
 * Gives a row the keyboard.
 * @param column - The row's column
 * @param index - The row's index in that column
 * @param preventScroll - True to leave the page where it is, for focus that follows the pointer
 */
function focusRow(column: MenuColumn, index: number, preventScroll = false): void {
  rowElements(column)[index]?.focus({
    preventScroll: preventScroll,
  })
}

/**
 * Moves the highlight up or down the active column, wrapping around, with a
 * click. In the first column the other columns stay as they are.
 * @param offset - +1 for down, -1 for up
 */
function moveHighlight(offset: number): void {
  if (activeColumn.value === 'sections') {
    const nextIndex = (sectionIndex(highlightedSection.value) + offset + SECTIONS.length) % SECTIONS.length
    const nextSection = SECTIONS[nextIndex]
    if (nextSection === undefined) {
      return
    }
    if (nextSection.section !== highlightedSection.value) {
      highlightedSection.value = nextSection.section
      Sound.MENU_BUTTON.play()
    }
    focusRow('sections', nextIndex)
    return
  }
  const count = itemCount()
  if (count === 0) {
    return
  }
  const nextIndex = (highlightedItem.value + offset + count) % count
  if (nextIndex !== highlightedItem.value) {
    highlightItem(nextIndex)
    Sound.MENU_BUTTON.play()
  }
  focusRow('items', nextIndex)
}

/**
 * Opens the highlighted section and steps into its items, with a click. Does
 * nothing with the keyboard already in the items.
 */
function openHighlightedSection(): void {
  if (activeColumn.value === 'items') {
    return
  }
  openSection.value = highlightedSection.value
  activeColumn.value = 'items'
  Sound.MENU_BUTTON.play()
  // The item rows are only drawn once the section is open
  void nextTick(() => {
    focusRow('items', highlightedItem.value)
  })
}

/**
 * Closes the open section, hiding the second and third columns, and gives the
 * keyboard back to its row in the first column, with a click.
 */
function closeSection(): void {
  if (openSection.value === null) {
    return
  }
  openSection.value = null
  activeColumn.value = 'sections'
  Sound.MENU_BUTTON.play()
  focusRow('sections', sectionIndex(highlightedSection.value))
}

/**
 * Opens a section picked with the mouse (or Space), just like Enter.
 * @param section - The section picked
 */
function chooseSection(section: MenuSection): void {
  highlightedSection.value = section
  activeColumn.value = 'sections'
  openHighlightedSection()
}

/**
 * Keeps the state in step when a section row gets the keyboard, such as through
 * Tab, clicking when that moves the highlight.
 * @param section - The row's section
 */
function handleSectionFocus(section: MenuSection): void {
  if (activeColumn.value === 'sections' && highlightedSection.value === section) {
    return
  }
  highlightedSection.value = section
  activeColumn.value = 'sections'
  Sound.MENU_BUTTON.play()
}

/**
 * Keeps the state in step when an item row gets the keyboard, such as through
 * Tab, clicking when that moves the highlight.
 * @param index - The row's index in the second column
 */
function handleItemFocus(index: number): void {
  if (activeColumn.value === 'items' && highlightedItem.value === index) {
    return
  }
  activeColumn.value = 'items'
  highlightItem(index)
  Sound.MENU_BUTTON.play()
}

/**
 * Highlights the section under a moving pointer, with a click. Only real
 * movement onto a row counts, so moving off a row just clicked, on the way to
 * its items, leaves the keyboard there. The open section, if any, stays open.
 * @param section - The row's section
 * @param event - Pointer event
 */
function handleSectionPointerMove(section: MenuSection, event: PointerEvent): void {
  if (event.movementX === 0 && event.movementY === 0) {
    return
  }
  if (pointerSection === section) {
    return
  }
  pointerSection = section
  if (activeColumn.value === 'sections' && highlightedSection.value === section) {
    return
  }
  highlightedSection.value = section
  activeColumn.value = 'sections'
  Sound.MENU_BUTTON.play()
  focusRow('sections', sectionIndex(section), true)
}

/**
 * Remembers the section row a press lands on, even one that appeared under a
 * still pointer, so moving off it after the click leaves the keyboard in its items.
 * @param section - The row's section
 */
function handleSectionPointerDown(section: MenuSection): void {
  pointerSection = section
}

/**
 * Forgets the section row the pointer was on, so moving back onto it takes the keyboard again.
 */
function handleSectionPointerLeave(): void {
  pointerSection = null
}

/**
 * Highlights the item under a moving pointer, with a click. Only real movement
 * counts, so a list that opens under a still pointer never pulls the keyboard into it.
 * @param index - The row's index in the second column
 * @param event - Pointer event
 */
function handleItemPointerMove(index: number, event: PointerEvent): void {
  if (event.movementX === 0 && event.movementY === 0) {
    return
  }
  if (activeColumn.value === 'items' && highlightedItem.value === index) {
    return
  }
  activeColumn.value = 'items'
  highlightItem(index)
  Sound.MENU_BUTTON.play()
  focusRow('items', index, true)
}

/**
 * Asks whether to reset the progress, with a click, as opening the pause menu does.
 */
function openResetDialog(): void {
  resetDialogOpen.value = true
  Sound.MENU_BUTTON.play()
}

/**
 * Closes the reset confirmation and gives the keyboard back to the Reset progress row.
 */
function closeResetDialog(): void {
  resetDialogOpen.value = false
  focusRow('items', RESET_PROGRESS_INDEX)
}

/**
 * Marks every chamber as not completed again, then closes the confirmation.
 */
function confirmResetProgress(): void {
  resetProgress()
  closeResetDialog()
}

/**
 * Enter opens the highlighted section from the first column. In the second
 * column the focused row handles it (starting the chamber, flipping the setting
 * or asking to reset progress); if the keyboard has left the rows, the
 * highlighted row is pressed instead.
 * @param event - Keyboard event
 */
function handleEnter(event: KeyboardEvent): void {
  // A held Enter, such as one carried over from the previous screen, must not start or flip anything
  if (event.repeat) {
    event.preventDefault()
    return
  }
  if (activeColumn.value === 'sections') {
    event.preventDefault()
    openHighlightedSection()
    return
  }
  const row = rowElements('items')[highlightedItem.value]
  if (row !== undefined && document.activeElement !== row) {
    event.preventDefault()
    row.click()
  }
}

/**
 * Arrow keys, Enter and Escape drive the menu.
 * @param event - Keyboard event
 */
function handleKeydown(event: KeyboardEvent): void {
  // While the reset confirmation is open its buttons have the keyboard, and Escape closes it
  if (resetDialogOpen.value) {
    if (event.key === 'Escape') {
      closeResetDialog()
    }
    return
  }
  // With a modifier the keys are browser shortcuts (Alt+Left goes back), so leave them alone
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return
  }
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      moveHighlight(-1)
      break
    case 'ArrowDown':
      event.preventDefault()
      moveHighlight(1)
      break
    case 'ArrowRight':
      event.preventDefault()
      openHighlightedSection()
      break
    case 'ArrowLeft':
      event.preventDefault()
      closeSection()
      break
    case 'Escape':
      // A held Escape that just closed the reset confirmation must not close the section too
      if (!event.repeat) {
        closeSection()
      }
      break
    case 'Enter':
      handleEnter(event)
      break
    case ' ':
      // A chamber row is a link, which Space doesn't press; keep it from scrolling the room instead
      if (activeColumn.value === 'items' && openSection.value === 'play') {
        event.preventDefault()
      }
      break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  playMusic('menu')
  // The focus handlers find the state already set, so arriving makes no click
  if (activeColumn.value === 'items') {
    focusRow('items', highlightedItem.value)
  } else {
    focusRow('sections', sectionIndex(highlightedSection.value))
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <main class="home-screen room">
    <div class="home-inner room-inner">
      <h1 class="room-title">
        <PortalLogo size="large" />
      </h1>

      <div class="home-menu">
        <div
          ref="sectionColumn"
          class="home-column home-sections"
          role="group"
          aria-label="Main menu"
        >
          <!-- The active bar is declared after the faint one in styles.css, so it wins on a row with both -->
          <button
            v-for="entry in SECTIONS"
            :id="sectionRowId(entry.section)"
            :key="entry.section"
            class="menu-row"
            :class="{
              'menu-row-selected': entry.section === openSection,
              'menu-row-active': entry.section === highlightedSection && activeColumn === 'sections',
            }"
            type="button"
            :aria-expanded="entry.section === openSection"
            :aria-controls="entry.section === openSection ? itemColumnId : undefined"
            :tabindex="entry.section === highlightedSection ? 0 : -1"
            @pointerdown="handleSectionPointerDown(entry.section)"
            @mousedown.prevent
            @click="chooseSection(entry.section)"
            @focus="handleSectionFocus(entry.section)"
            @pointermove="handleSectionPointerMove(entry.section, $event)"
            @pointerleave="handleSectionPointerLeave"
          >
            <span class="menu-row-label">{{ entry.label }}</span>
          </button>
        </div>

        <section
          v-if="openSection !== null"
          :id="itemColumnId"
          ref="itemColumn"
          :key="`items-${openSection}`"
          class="home-column home-items"
          :style="{
            '--menu-cascade-rows': sectionIndex(openSection),
          }"
          :aria-labelledby="sectionRowId(openSection)"
        >
          <ol v-if="openSection === 'play'" class="home-row-list">
            <li v-for="(chamber, index) in CHAMBERS" :key="chamber.number">
              <ChamberRow
                :chamber="chamber"
                :completed="completedChambers.includes(chamber.number)"
                :class="{
                  'menu-row-selected': index === highlightedChamber,
                  'menu-row-active': index === highlightedChamber && activeColumn === 'items',
                }"
                :tabindex="index === highlightedChamber ? 0 : -1"
                @focus="handleItemFocus(index)"
                @pointermove="handleItemPointerMove(index, $event)"
              />
            </li>
          </ol>
          <ul v-else class="home-row-list">
            <li v-for="(setting, index) in settings" :key="setting.label">
              <SettingsSwitch
                v-model="setting.enabled.value"
                :label="setting.label"
                :class="{
                  'menu-row-selected': index === highlightedSetting,
                  'menu-row-active': index === highlightedSetting && activeColumn === 'items',
                }"
                :tabindex="index === highlightedSetting ? 0 : -1"
                @focus="handleItemFocus(index)"
                @pointermove="handleItemPointerMove(index, $event)"
              />
            </li>
            <li>
              <button
                class="menu-row"
                :class="{
                  'menu-row-selected': highlightedSetting === RESET_PROGRESS_INDEX,
                  'menu-row-active': highlightedSetting === RESET_PROGRESS_INDEX && activeColumn === 'items',
                }"
                type="button"
                aria-haspopup="dialog"
                :tabindex="highlightedSetting === RESET_PROGRESS_INDEX ? 0 : -1"
                @click="openResetDialog"
                @focus="handleItemFocus(RESET_PROGRESS_INDEX)"
                @pointermove="handleItemPointerMove(RESET_PROGRESS_INDEX, $event)"
              >
                <span class="menu-row-label">Reset progress</span>
              </button>
            </li>
          </ul>
        </section>

        <div v-if="openSection === 'play'" class="home-column home-detail">
          <div class="home-detail-frame">
            <ChamberMap v-if="highlightedChamberEntry !== undefined" :chamber="highlightedChamberEntry" />
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-if="resetDialogOpen"
      title="Reset progress?"
      message="Every chamber goes back to not completed, and its figure turns grey again."
      confirm-label="Reset progress"
      @confirm="confirmResetProgress"
      @cancel="closeResetDialog"
    />
  </main>
</template>

<style scoped>
/* The wordmark well clear of the menu below it */
.home-inner {
  display: flex;
  flex-direction: column;
  gap: 8.5rem;
  min-height: 100%;
}

/* Three fixed tracks, so the sections stay put when the open section's items (wide enough for the
   longest setting name beside its switch) and, widest, Play's chamber map appear beside them */
.home-menu {
  --menu-row-gap: 0.25rem;

  display: grid;
  grid-template-columns: minmax(13rem, 1fr) minmax(28rem, 1.7fr) 2.6fr;
  align-items: start;
  column-gap: 3rem;
}

.home-column {
  min-width: 0;
}

.home-sections {
  grid-column: 1;
}

/* Cascade: the open section's first item starts level with the section's own row, pushed down by
   one row and gap for every section above it (the index comes from the template) */
.home-items {
  grid-column: 2;
  padding-top: calc(var(--menu-cascade-rows, 0) * (var(--menu-row-height) + var(--menu-row-gap)));
}

.home-detail {
  grid-column: 3;
}

.home-sections,
.home-row-list {
  display: flex;
  flex-direction: column;
  gap: var(--menu-row-gap);
}

/* An opened section's columns slide out from the sections, showing where they came from */
.home-items,
.home-detail {
  animation: home-column-in 180ms var(--ease-out);
}

@keyframes home-column-in {
  from {
    opacity: 0;
    transform: translateX(-0.75rem);
  }
}

/* A fixed 4:3 frame, so the column keeps its height whichever chamber it shows.
   4:3 fits the wide chambers closely and shows the square one a little smaller */
.home-detail-frame {
  position: relative;
  aspect-ratio: 4 / 3;
}
</style>
