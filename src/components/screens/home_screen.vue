<script setup lang="ts">
/**
 * Home screen: a menu in three columns on one sign panel. The first picks a
 * section (Play or Settings), the second lists that section's chambers or
 * settings, and the third shows the highlighted chamber's map or what the
 * highlighted setting controls. Up and Down move the highlight in the column
 * that has the keyboard, Right and Enter step into the second column, Left and
 * Escape step back out.
 */
import {computed, onBeforeUnmount, onMounted, ref, useId, useTemplateRef} from 'vue'
import type {Ref} from 'vue'
import ChamberMap from '@/components/chamber_map.vue'
import ChamberRow from '@/components/chamber_row.vue'
import PortalLogo from '@/components/portal_logo.vue'
import SettingDetail from '@/components/setting_detail.vue'
import type {SettingDetailProps} from '@/components/setting_detail.vue'
import SettingsSwitch from '@/components/settings_switch.vue'
import {Sound} from '@/game/sound'
import {CHAMBERS} from '@/services/chamber_catalogue'
import {lastChamber} from '@/services/last_chamber'
import {completedChambers} from '@/services/progress'
import {musicEnabled, playMusic, soundEnabled} from '@/services/settings'

/** A section listed in the first column. */
type MenuSection = 'play' | 'settings'

/** The column that has the keyboard: the sections, or the chosen section's items. */
type MenuColumn = 'sections' | 'items'

/** A section's row in the first column. */
type SectionEntry = {
  section: MenuSection // Which section the row opens
  label: string // Name on the row
}

/** An on/off setting listed under Settings. */
type SettingEntry = {
  label: string // Name on the row
  description: string // What the setting controls, shown in the third column
  icon: SettingDetailProps['icon'] // Pictogram above the description
  enabled: Ref<boolean> // The preference the row switches
  descriptionId: string // Links the row to its description for screen readers
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
    description: 'Menu clicks, plus the portals, doors, buttons and other sounds inside a chamber',
    icon: 'sound',
    enabled: soundEnabled,
    descriptionId: useId(),
  },
  {
    label: 'Music',
    description: 'Background music in the menus and the chambers',
    icon: 'music',
    enabled: musicEnabled,
    descriptionId: useId(),
  },
]

const menuId = useId()
const itemPanelId = `${menuId}-items`

// Back from a chamber, that chamber is highlighted with the keyboard in the second column
const rememberedChamber = CHAMBERS.findIndex((chamber) => chamber.number === lastChamber())

const selectedSection = ref<MenuSection>('play')
const activeColumn = ref<MenuColumn>(rememberedChamber === -1 ? 'sections' : 'items')
const highlightedChamber = ref(Math.max(rememberedChamber, 0))
const highlightedSetting = ref(0)

const sectionColumn = useTemplateRef<HTMLElement>('sectionColumn')
const itemColumn = useTemplateRef<HTMLElement>('itemColumn')

const itemCount = computed(() => (selectedSection.value === 'play' ? CHAMBERS.length : settings.length))
const highlightedItem = computed(() => (selectedSection.value === 'play' ? highlightedChamber.value : highlightedSetting.value))
const highlightedChamberEntry = computed(() => CHAMBERS[highlightedChamber.value])

/**
 * Builds the id of a section's row, which its item column is labelled by.
 * @param section - The section
 * @returns The row's id
 */
function sectionTabId(section: MenuSection): string {
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
 * Highlights an item of the chosen section.
 * @param index - The item's index in the second column
 */
function highlightItem(index: number): void {
  if (selectedSection.value === 'play') {
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
 * Gives the keyboard to the highlighted row of the active column.
 */
function focusActiveRow(): void {
  if (activeColumn.value === 'sections') {
    focusRow('sections', sectionIndex(selectedSection.value))
  } else {
    focusRow('items', highlightedItem.value)
  }
}

/**
 * Moves the highlight up or down the active column, wrapping around. In the
 * first column this also swaps the second column to the newly highlighted section.
 * @param offset - +1 for down, -1 for up
 */
function moveHighlight(offset: number): void {
  if (activeColumn.value === 'sections') {
    const nextIndex = (sectionIndex(selectedSection.value) + offset + SECTIONS.length) % SECTIONS.length
    const nextSection = SECTIONS[nextIndex]
    if (nextSection === undefined) {
      return
    }
    selectedSection.value = nextSection.section
    focusRow('sections', nextIndex)
    return
  }
  if (itemCount.value === 0) {
    return
  }
  const nextIndex = (highlightedItem.value + offset + itemCount.value) % itemCount.value
  highlightItem(nextIndex)
  focusRow('items', nextIndex)
}

/**
 * Steps from the first column into the chosen section's items, with a click.
 */
function stepIn(): void {
  if (activeColumn.value === 'items') {
    return
  }
  activeColumn.value = 'items'
  Sound.MENU_BUTTON.play()
  focusRow('items', highlightedItem.value)
}

/**
 * Steps back from the items to the first column, with a click.
 */
function stepOut(): void {
  if (activeColumn.value === 'sections') {
    return
  }
  activeColumn.value = 'sections'
  Sound.MENU_BUTTON.play()
  focusRow('sections', sectionIndex(selectedSection.value))
}

/**
 * Opens a section picked with the mouse (or Space), clicking only when that
 * changes the section or brings the keyboard back to the first column.
 * @param section - The section picked
 */
function chooseSection(section: MenuSection): void {
  const changed = section !== selectedSection.value || activeColumn.value !== 'sections'
  selectedSection.value = section
  activeColumn.value = 'sections'
  if (changed) {
    Sound.MENU_BUTTON.play()
  }
  focusRow('sections', sectionIndex(section))
}

/**
 * Keeps the state in step when a section row gets the keyboard, such as through Tab.
 * @param section - The row's section
 */
function handleSectionFocus(section: MenuSection): void {
  selectedSection.value = section
  activeColumn.value = 'sections'
}

/**
 * Keeps the state in step when an item row gets the keyboard, such as through Tab or a click.
 * @param index - The row's index in the second column
 */
function handleItemFocus(index: number): void {
  activeColumn.value = 'items'
  highlightItem(index)
}

/**
 * Highlights the item under a moving pointer. Only real movement counts, so a
 * list that swaps under a still pointer never pulls the keyboard into it.
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
  focusRow('items', index, true)
}

/**
 * Enter steps into the second column from the first. In the second column the
 * focused row handles it (starting the chamber or flipping the setting); if the
 * keyboard has left the rows, the highlighted row is pressed instead.
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
    stepIn()
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
      stepIn()
      break
    case 'ArrowLeft':
      event.preventDefault()
      stepOut()
      break
    case 'Escape':
      stepOut()
      break
    case 'Enter':
      handleEnter(event)
      break
    case ' ':
      // A chamber row is a link, which Space doesn't press; keep it from scrolling the room instead
      if (activeColumn.value === 'items' && selectedSection.value === 'play') {
        event.preventDefault()
      }
      break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  playMusic('menu')
  focusActiveRow()
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

      <div class="home-panel sign-card">
        <div
          ref="sectionColumn"
          class="home-column home-sections"
          role="tablist"
          aria-orientation="vertical"
          aria-label="Main menu"
        >
          <button
            v-for="entry in SECTIONS"
            :id="sectionTabId(entry.section)"
            :key="entry.section"
            class="menu-row sign-card"
            :class="{
              'menu-row-highlighted': entry.section === selectedSection,
              'sign-card-glowing': entry.section === selectedSection && activeColumn === 'sections',
            }"
            type="button"
            role="tab"
            :aria-selected="entry.section === selectedSection"
            :aria-controls="itemPanelId"
            :tabindex="entry.section === selectedSection ? 0 : -1"
            @mousedown.prevent
            @click="chooseSection(entry.section)"
            @focus="handleSectionFocus(entry.section)"
          >
            <span class="menu-row-label">{{ entry.label }}</span>
            <span class="sign-card-frame" aria-hidden="true"></span>
          </button>
        </div>

        <div
          :id="itemPanelId"
          ref="itemColumn"
          class="home-column home-items"
          role="tabpanel"
          :aria-labelledby="sectionTabId(selectedSection)"
        >
          <ol v-if="selectedSection === 'play'" class="home-row-list">
            <li v-for="(chamber, index) in CHAMBERS" :key="chamber.number">
              <ChamberRow
                :chamber="chamber"
                :completed="completedChambers.includes(chamber.number)"
                :class="{
                  'menu-row-highlighted': index === highlightedChamber,
                  'sign-card-glowing': index === highlightedChamber && activeColumn === 'items',
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
                :description-id="setting.descriptionId"
                :class="{
                  'menu-row-highlighted': index === highlightedSetting,
                  'sign-card-glowing': index === highlightedSetting && activeColumn === 'items',
                }"
                :tabindex="index === highlightedSetting ? 0 : -1"
                @focus="handleItemFocus(index)"
                @pointermove="handleItemPointerMove(index, $event)"
              />
            </li>
          </ul>
        </div>

        <div class="home-column home-detail">
          <div class="home-detail-frame">
            <ChamberMap v-if="selectedSection === 'play' && highlightedChamberEntry !== undefined" :chamber="highlightedChamberEntry" />
            <template v-else-if="selectedSection === 'settings'">
              <SettingDetail
                v-for="(setting, index) in settings"
                v-show="index === highlightedSetting"
                :key="setting.label"
                :icon="setting.icon"
                :description="setting.description"
                :description-id="setting.descriptionId"
              />
            </template>
          </div>
        </div>

        <span class="sign-card-frame" aria-hidden="true"></span>
      </div>
    </div>
  </main>
</template>

<style scoped>
.home-inner {
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
  min-height: 100%;
}

/* One sign split into three columns: the sections, the chosen section's items (wide enough for
   the longest setting name beside its switch) and, widest, the highlighted item's map or description */
.home-panel {
  display: grid;
  grid-template-columns: minmax(13rem, 1fr) minmax(28rem, 1.7fr) 2.6fr;
}

.home-column {
  min-width: 0;
  padding: 1.5rem;
}

/* Thin rules between the columns, running the panel's full height */
.home-column + .home-column {
  border-left: 1px solid var(--color-rule);
}

.home-sections,
.home-row-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* A fixed 4:3 frame, so the panel keeps its height whether it shows a map or a description.
   4:3 fits the wide chambers closely and shows the square one a little smaller */
.home-detail-frame {
  position: relative;
  aspect-ratio: 4 / 3;
}
</style>
