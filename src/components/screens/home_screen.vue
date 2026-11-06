<script setup lang="ts">
/**
 * Home screen: a menu in up to three columns on the room's wall. The first
 * lists the sections (Play, Settings and About); moving through it changes
 * nothing else. Opening a section with Enter, Right or a click shows its
 * chambers, settings or About rows in the second column, starting level with
 * the section's row. The third follows the highlight there: Play shows the
 * chamber's map, About shows a list of pages or the changelog.
 * Right, Enter or a click steps from an About row into its pages or changelog.
 * Up and Down move the highlight (or scroll the changelog) in the column that
 * has the keyboard, Left and Escape step back a column, closing the section
 * from the second. Every move of the highlight clicks. Settings ends with
 * Reset progress, which asks first in a dialog; while it is open the menu
 * ignores the keyboard and Escape closes it.
 */
import {computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef} from 'vue'
import type {Ref} from 'vue'
import ChamberMap from '@/components/chamber_map.vue'
import ChamberRow from '@/components/chamber_row.vue'
import ChangelogList from '@/components/changelog_list.vue'
import ConfirmDialog from '@/components/confirm_dialog.vue'
import LinkRow from '@/components/link_row.vue'
import PortalLogo from '@/components/portal_logo.vue'
import SettingsSwitch from '@/components/settings_switch.vue'
import {Sound} from '@/game/sound'
import {trackChangelogOpen, trackFeedbackOpen, trackLinkOpen, trackProgressReset} from '@/services/analytics'
import {CHAMBERS} from '@/services/chamber_catalogue'
import {lastChamber} from '@/services/last_chamber'
import {bestTime, isCompleted, resetProgress} from '@/services/progress'
import {musicEnabled, playMusic, soundEnabled} from '@/services/settings'

/** A section listed in the first column. */
type MenuSection = 'play' | 'settings' | 'about'

/** The column that has the keyboard: the sections, the open section's items, or About's third column. */
type MenuColumn = 'sections' | 'items' | 'details'

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

/** A page outside the game, listed in the third column and opened in a new tab. */
type LinkEntry = {
  label: string // Name on the row
  url: string // Address the row opens
}

/** A row listed under About: what the third column shows while it is highlighted, or what picking it does. */
type AboutEntry =
  | {
    kind: 'changelog' // Shows the changelog
    label: string // Name on the row
  }
  | {
    kind: 'links' // Lists pages to open
    label: string
    links: LinkEntry[] // The pages, in the order listed
  }
  | {
    kind: 'mail' // Opens the player's mail app
    label: string
    url: string // The mailto: address
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
  {
    section: 'about',
    label: 'About',
  },
]

const ABOUT: AboutEntry[] = [
  {
    kind: 'links',
    label: 'More games',
    links: [
      {
        label: 'Tension Tunnel',
        url: 'https://tensiontunnel.com/',
      },
      {
        label: 'Hextrategic',
        url: 'https://hextrategic.com/',
      },
      {
        label: 'Tension Grid',
        url: 'https://tensiongrid.com/',
      },
      {
        label: 'Coliseum',
        url: 'https://coliseum-game.web.app/',
      },
      {
        label: 'Meme IQ',
        url: 'https://meme-iq.web.app/',
      },
      {
        label: 'God Luck With That',
        url: 'https://god-luck-with-that.web.app/',
      },
    ],
  },
  {
    kind: 'changelog',
    label: 'Changelog',
  },
  {
    kind: 'links',
    label: 'Original game',
    links: [
      {
        label: 'Portal',
        url: 'https://store.steampowered.com/app/400/Portal/',
      },
      {
        label: 'Portal 2',
        url: 'https://store.steampowered.com/app/620/Portal_2/',
      },
    ],
  },
  {
    kind: 'mail',
    label: 'Feedback',
    url: 'mailto:contact@atomicinstinct.com',
  },
]

// The changelog may run as far down as the longest list of pages, which reaches below the About rows
const ABOUT_DETAIL_END = Math.max(...ABOUT.map((entry, index) => index + (entry.kind === 'links' ? entry.links.length : 1)))

const CHANGELOG_SCROLL_PIXELS = 48 // How far Up or Down scrolls the changelog

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
const detailColumnId = `${menuId}-details`

// Back from a chamber, Play is open with that chamber highlighted and the keyboard in the second
// column; on the first arrival only the sections show, with Play highlighted and nothing open
const rememberedChamber = CHAMBERS.findIndex((chamber) => chamber.number === lastChamber())
const returning = rememberedChamber !== -1

const highlightedSection = ref<MenuSection>('play')
const openSection = ref<MenuSection | null>(returning ? 'play' : null)
const activeColumn = ref<MenuColumn>(returning ? 'items' : 'sections')
const highlightedChamber = ref(Math.max(rememberedChamber, 0))
const highlightedSetting = ref(0)
const highlightedAbout = ref(0)
const highlightedLink = ref(0)
const resetDialogOpen = ref(false)

let pointerSection: MenuSection | null = null // Section row under the pointer, so only moving onto a row takes the keyboard
let pointerItem: number | null = null // Item row under the pointer, so moving within an About row just clicked leaves the keyboard in its third column

const sectionColumn = useTemplateRef<HTMLElement>('sectionColumn')
const itemColumn = useTemplateRef<HTMLElement>('itemColumn')
const detailColumn = useTemplateRef<HTMLElement>('detailColumn')
const changelogScroller = useTemplateRef<HTMLElement>('changelogScroller')

const highlightedItem = computed(() => {
  if (openSection.value === 'play') {
    return highlightedChamber.value
  }
  if (openSection.value === 'about') {
    return highlightedAbout.value
  }
  return highlightedSetting.value
})
const highlightedChamberEntry = computed(() => CHAMBERS[highlightedChamber.value])
const highlightedAboutEntry = computed(() => ABOUT[highlightedAbout.value])

// The third column takes the keyboard only for About's pages and changelog; Play's map is just shown
const detailTakesKeyboard = computed(() => {
  const kind = highlightedAboutEntry.value?.kind
  return openSection.value === 'about' && (kind === 'links' || kind === 'changelog')
})
const highlightedLinks = computed(() => {
  const entry = highlightedAboutEntry.value
  return openSection.value === 'about' && entry?.kind === 'links' ? entry.links : []
})

/**
 * Counts the rows of the open section.
 * @returns How many chambers, settings (with Reset progress) or About rows it lists, or 0 with no section open
 */
function itemCount(): number {
  if (openSection.value === 'play') {
    return CHAMBERS.length
  }
  if (openSection.value === 'settings') {
    return settings.length + 1
  }
  if (openSection.value === 'about') {
    return ABOUT.length
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
 * Builds the id of an About row, which its third column is labelled by.
 * @param index - The row's index in the second column
 * @returns The row's id
 */
function aboutRowId(index: number): string {
  return `${menuId}-about-${index}`
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
  } else if (openSection.value === 'about') {
    // Another About row brings another list into the third column, which starts at its top
    if (index !== highlightedAbout.value) {
      highlightedLink.value = 0
    }
    highlightedAbout.value = index
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
  const containers: Record<MenuColumn, HTMLElement | null> = {
    sections: sectionColumn.value,
    items: itemColumn.value,
    details: detailColumn.value,
  }
  return Array.from(containers[column]?.querySelectorAll<HTMLElement>('.menu-row') ?? [])
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
 * Gives the third column the keyboard: the highlighted page, or the changelog.
 */
function focusDetail(): void {
  if (highlightedAboutEntry.value?.kind === 'changelog') {
    changelogScroller.value?.focus()
  } else {
    focusRow('details', highlightedLink.value)
  }
}

/**
 * Moves the highlight up or down the active column, wrapping around, with a
 * click. In the first column the other columns stay as they are; in the
 * changelog Up and Down scroll it instead, silently.
 * @param offset - +1 for down, -1 for up
 */
function moveHighlight(offset: number): void {
  if (activeColumn.value === 'details') {
    if (highlightedAboutEntry.value?.kind === 'changelog') {
      changelogScroller.value?.scrollBy({
        top: offset * CHANGELOG_SCROLL_PIXELS,
      })
      return
    }
    const linkCount = highlightedLinks.value.length
    if (linkCount === 0) {
      return
    }
    const nextLink = (highlightedLink.value + offset + linkCount) % linkCount
    if (nextLink !== highlightedLink.value) {
      highlightedLink.value = nextLink
      Sound.MENU_BUTTON.play()
    }
    focusRow('details', nextLink)
    return
  }
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
 * nothing with the keyboard already in the items or the third column.
 */
function openHighlightedSection(): void {
  if (activeColumn.value !== 'sections') {
    return
  }
  openSection.value = highlightedSection.value
  activeColumn.value = 'items'
  // The item rows are new, so none has had the pointer on it yet
  pointerItem = null
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
 * Steps from the highlighted About row into its pages or changelog in the
 * third column, with a click. Does nothing anywhere else, or for Feedback,
 * which has nothing there.
 */
function openDetail(): void {
  if (activeColumn.value !== 'items' || !detailTakesKeyboard.value) {
    return
  }
  activeColumn.value = 'details'
  Sound.MENU_BUTTON.play()
  if (highlightedAboutEntry.value?.kind === 'changelog') {
    trackChangelogOpen()
  }
  // A row clicked has only just been highlighted, so its third column may not be drawn yet
  void nextTick(focusDetail)
}

/**
 * Steps into the third column of an About row picked with the mouse (or Space),
 * just like Right. The row is highlighted first, since some browsers (Safari)
 * don't focus a clicked button, which would otherwise have done it.
 * @param index - The row's index in the second column
 */
function chooseAboutRow(index: number): void {
  handleItemFocus(index)
  openDetail()
}

/**
 * Right opens the highlighted section from the first column, or steps into the
 * third column from an About row that has pages or the changelog there.
 */
function stepIn(): void {
  if (activeColumn.value === 'sections') {
    openHighlightedSection()
  } else {
    openDetail()
  }
}

/**
 * Left and Escape step back from the third column to its About row, with a
 * click, or close the open section.
 */
function stepBack(): void {
  if (activeColumn.value !== 'details') {
    closeSection()
    return
  }
  activeColumn.value = 'items'
  Sound.MENU_BUTTON.play()
  focusRow('items', highlightedItem.value)
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
 * counts, so a list that opens under a still pointer never pulls the keyboard
 * into it, and only movement onto a row once the keyboard is in the third
 * column, so moving off an About row just clicked leaves it there.
 * @param index - The row's index in the second column
 * @param event - Pointer event
 */
function handleItemPointerMove(index: number, event: PointerEvent): void {
  if (event.movementX === 0 && event.movementY === 0) {
    return
  }
  if (pointerItem === index && activeColumn.value === 'details') {
    return
  }
  pointerItem = index
  if (activeColumn.value === 'items' && highlightedItem.value === index) {
    return
  }
  activeColumn.value = 'items'
  highlightItem(index)
  Sound.MENU_BUTTON.play()
  focusRow('items', index, true)
}

/**
 * Remembers the item row a press lands on, even one that appeared under a
 * still pointer, so moving off it after the click leaves the keyboard in its third column.
 * @param index - The row's index in the second column
 */
function handleItemPointerDown(index: number): void {
  pointerItem = index
}

/**
 * Forgets the item row the pointer was on, so moving back onto it takes the keyboard again.
 */
function handleItemPointerLeave(): void {
  pointerItem = null
}

/**
 * Keeps the state in step when a page row in the third column gets the
 * keyboard, such as through Tab, clicking when that moves the highlight.
 * @param index - The row's index in the third column
 */
function handleLinkFocus(index: number): void {
  if (activeColumn.value === 'details' && highlightedLink.value === index) {
    return
  }
  activeColumn.value = 'details'
  highlightedLink.value = index
  Sound.MENU_BUTTON.play()
}

/**
 * Highlights the page row under a moving pointer, with a click. Only real
 * movement counts, so pages shown under a still pointer never pull the keyboard into them.
 * @param index - The row's index in the third column
 * @param event - Pointer event
 */
function handleLinkPointerMove(index: number, event: PointerEvent): void {
  if (event.movementX === 0 && event.movementY === 0) {
    return
  }
  if (activeColumn.value === 'details' && highlightedLink.value === index) {
    return
  }
  activeColumn.value = 'details'
  highlightedLink.value = index
  Sound.MENU_BUTTON.play()
  focusRow('details', index, true)
}

/**
 * Keeps the state in step when the changelog gets the keyboard, through Tab or
 * a click on it, with a click.
 */
function handleChangelogFocus(): void {
  if (activeColumn.value === 'details') {
    return
  }
  activeColumn.value = 'details'
  Sound.MENU_BUTTON.play()
  trackChangelogOpen()
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
 * Forgets every chamber's completion, best time and attempts, then closes the confirmation.
 */
function confirmResetProgress(): void {
  resetProgress()
  trackProgressReset()
  closeResetDialog()
}

/**
 * Enter opens the highlighted section from the first column. In the second
 * and third columns the focused row handles it (starting the chamber, flipping
 * the setting, asking to reset progress, stepping into About's third column or
 * opening a page); if the keyboard has left the rows, the highlighted row is
 * pressed instead.
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
  const row = activeColumn.value === 'items'
    ? rowElements('items')[highlightedItem.value]
    : rowElements('details')[highlightedLink.value]
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
      stepIn()
      break
    case 'ArrowLeft':
      event.preventDefault()
      stepBack()
      break
    case 'Escape':
      // A held Escape that just closed the reset confirmation must not close the section too
      if (!event.repeat) {
        stepBack()
      }
      break
    case 'Enter':
      handleEnter(event)
      break
    case ' ':
      // Chamber, Feedback and page rows are links, which Space doesn't press; keep it from scrolling the room instead
      if ((activeColumn.value === 'items' && openSection.value === 'play') || document.activeElement instanceof HTMLAnchorElement) {
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
                :completed="isCompleted(chamber)"
                :best-time="bestTime(chamber)"
                :class="{
                  'menu-row-selected': index === highlightedChamber,
                  'menu-row-active': index === highlightedChamber && activeColumn === 'items',
                }"
                :tabindex="index === highlightedChamber ? 0 : -1"
                @focus="handleItemFocus(index)"
                @pointermove="handleItemPointerMove(index, $event)"
                @pointerleave="handleItemPointerLeave"
              />
            </li>
          </ol>
          <ul v-else-if="openSection === 'settings'" class="home-row-list">
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
                @pointerleave="handleItemPointerLeave"
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
                @pointerleave="handleItemPointerLeave"
              >
                <span class="menu-row-label">Reset progress</span>
              </button>
            </li>
          </ul>
          <ul v-else class="home-row-list">
            <li v-for="(entry, index) in ABOUT" :key="entry.label">
              <a
                v-if="entry.kind === 'mail'"
                :id="aboutRowId(index)"
                class="menu-row"
                :class="{
                  'menu-row-selected': index === highlightedAbout,
                  'menu-row-active': index === highlightedAbout && activeColumn === 'items',
                }"
                :href="entry.url"
                :tabindex="index === highlightedAbout ? 0 : -1"
                @click="trackFeedbackOpen"
                @focus="handleItemFocus(index)"
                @pointerdown="handleItemPointerDown(index)"
                @pointermove="handleItemPointerMove(index, $event)"
                @pointerleave="handleItemPointerLeave"
              >
                <span class="menu-row-label">{{ entry.label }}</span>
              </a>
              <button
                v-else
                :id="aboutRowId(index)"
                class="menu-row"
                :class="{
                  'menu-row-selected': index === highlightedAbout,
                  'menu-row-active': index === highlightedAbout && activeColumn === 'items',
                }"
                type="button"
                :aria-controls="index === highlightedAbout ? detailColumnId : undefined"
                :tabindex="index === highlightedAbout ? 0 : -1"
                @click="chooseAboutRow(index)"
                @focus="handleItemFocus(index)"
                @pointerdown="handleItemPointerDown(index)"
                @pointermove="handleItemPointerMove(index, $event)"
                @pointerleave="handleItemPointerLeave"
              >
                <span class="menu-row-label">{{ entry.label }}</span>
              </button>
            </li>
          </ul>
        </section>

        <div v-if="openSection === 'play'" class="home-column home-detail">
          <div class="home-detail-frame">
            <ChamberMap v-if="highlightedChamberEntry !== undefined" :chamber="highlightedChamberEntry" />
          </div>
        </div>

        <!-- About's third column follows the highlighted row, starting level with it, and is
             drawn anew for each row so it slides out again -->
        <div
          v-else-if="openSection === 'about' && highlightedAboutEntry !== undefined && highlightedAboutEntry.kind !== 'mail'"
          :id="detailColumnId"
          ref="detailColumn"
          :key="`about-${highlightedAbout}`"
          class="home-column home-detail home-about-detail"
          :style="{
            '--menu-cascade-rows': sectionIndex('about') + highlightedAbout,
            '--menu-detail-rows': ABOUT_DETAIL_END - highlightedAbout,
          }"
        >
          <ul
            v-if="highlightedAboutEntry.kind === 'links'"
            class="home-row-list home-link-list"
            :aria-labelledby="aboutRowId(highlightedAbout)"
          >
            <li v-for="(link, index) in highlightedAboutEntry.links" :key="link.url">
              <LinkRow
                :label="link.label"
                :url="link.url"
                :class="{
                  'menu-row-selected': index === highlightedLink,
                  'menu-row-active': index === highlightedLink && activeColumn === 'details',
                }"
                :tabindex="index === highlightedLink ? 0 : -1"
                @click="trackLinkOpen(link.label, link.url)"
                @focus="handleLinkFocus(index)"
                @pointermove="handleLinkPointerMove(index, $event)"
              />
            </li>
          </ul>
          <div
            v-else
            ref="changelogScroller"
            class="home-changelog"
            :class="{
              'home-changelog-active': activeColumn === 'details',
            }"
            role="region"
            :aria-labelledby="aboutRowId(highlightedAbout)"
            tabindex="0"
            @focus="handleChangelogFocus"
          >
            <ChangelogList />
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

.home-items {
  grid-column: 2;
}

.home-detail {
  grid-column: 3;
}

/* Cascade: the open section's first item starts level with the section's own row, pushed down by
   one row and gap for every row above it (the count comes from the template); About's third
   column starts level with the About row it shows */
.home-items,
.home-about-detail {
  padding-top: calc(var(--menu-cascade-rows, 0) * (var(--menu-row-height) + var(--menu-row-gap)));
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

/* Page rows as wide as the second column's narrowest, so their arrows stay near the names */
.home-link-list {
  max-width: 28rem;
}

/* The changelog: text on the wall beside a thin rule, reaching at most as far down as the longest
   list of pages (the count comes from the template), then it scrolls (with Up and Down once it has
   the keyboard). The padding sets the first release number level with the Changelog row's name */
.home-changelog {
  max-width: 40rem;
  max-height: calc(var(--menu-detail-rows, 1) * (var(--menu-row-height) + var(--menu-row-gap)) - var(--menu-row-gap));
  padding: 0.75rem 1.25rem 0.5rem;
  border-left: 0.25rem solid rgba(var(--color-ink-rgb), 0.14);
  overflow-y: auto;
  scrollbar-color: rgba(var(--color-ink-rgb), 0.35) transparent;
  scrollbar-width: thin;
  scroll-behavior: smooth;
  transition: border-color 90ms ease;
}

/* With the keyboard the rule darkens like a row's bar, and is the focus mark */
.home-changelog-active {
  border-left-color: rgba(var(--color-ink-rgb), 0.5);
}

/* Transparent outline: hidden normally, but high-contrast mode, which paints both rules alike, shows it */
.home-changelog-active:focus-visible {
  outline-color: transparent;
}

@media (prefers-reduced-motion: reduce) {
  .home-changelog {
    scroll-behavior: auto;
  }
}
</style>
