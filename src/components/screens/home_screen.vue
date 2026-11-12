<script setup lang="ts">
/**
 * Home screen: a menu in up to three columns on the room's wall. The first
 * lists the sections (Play, Settings and About); moving through it changes
 * nothing else. Opening a section with Enter, Right or a click shows its
 * chambers, settings or About rows in the second column, starting level with
 * the section's row. The third follows the highlight there: Play shows the
 * chamber's map, About shows a list of pages or the changelog, and Settings'
 * Controls row the key bound to each game key (turning in place, undo and
 * redo hidden for now), from the top of the menu.
 * Right, Enter or a click steps from an About row into its pages or changelog,
 * or from Controls into its keys. Up and Down move the highlight (or scroll
 * the changelog) in the column that has the keyboard, Left and Escape step
 * back a column, closing the section from the second. Every move of the
 * highlight clicks. Picking a key's row waits for the next key, which takes
 * the whole keyboard until it is pressed or Escape cancels. Settings ends
 * with Reset progress, which asks first in a dialog; while it is open the
 * menu ignores the keyboard and Escape closes it.
 */
import {computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef, watch} from 'vue'
import type {Ref} from 'vue'
import ChamberMap from '@/components/chamber_map.vue'
import ChamberRow from '@/components/chamber_row.vue'
import ChangelogList from '@/components/changelog_list.vue'
import ConfirmDialog from '@/components/confirm_dialog.vue'
import ControlRow from '@/components/control_row.vue'
import LinkRow from '@/components/link_row.vue'
import PortalLogo from '@/components/portal_logo.vue'
import SettingsSwitch from '@/components/settings_switch.vue'
import {GameKey} from '@/game/game_key'
import {getBoundKey} from '@/game/key_bindings'
import {Sound} from '@/game/sound'
import {trackChangelogOpen, trackFeedbackOpen, trackLinkOpen, trackProgressReset} from '@/services/analytics'
import {CHAMBERS} from '@/services/chamber_catalogue'
import {bindKey, keyBindings, resetKeyBindings} from '@/services/key_bindings'
import {getKeyLabel, refreshKeyLabels} from '@/services/key_labels'
import {lastChamber} from '@/services/last_chamber'
import {bestTime, isCompleted, resetProgress} from '@/services/progress'
import {musicEnabled, playMusic, soundEnabled} from '@/services/settings'

/** A section listed in the first column. */
type MenuSection = 'play' | 'settings' | 'about'

/** The column that has the keyboard: the sections, the open section's items, or the third column (About's pages or changelog, or the controls). */
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

/** A game key listed in the Controls column, with the key bound to it. */
type ControlEntry = {
  gameKey: GameKey // The game key the row rebinds
  label: string // What the key does, on the row
  portal: 'blue' | 'orange' | null // The portal the key shoots, if any
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

const CONTROLS_INDEX = settings.length // The Controls row comes after the switches
const RESET_PROGRESS_INDEX = settings.length + 1 // Reset progress comes last

// Every game key, in the order its row would show
const ALL_CONTROLS: ControlEntry[] = [
  {
    gameKey: GameKey.UP,
    label: 'Move up',
    portal: null,
  },
  {
    gameKey: GameKey.DOWN,
    label: 'Move down',
    portal: null,
  },
  {
    gameKey: GameKey.LEFT,
    label: 'Move left',
    portal: null,
  },
  {
    gameKey: GameKey.RIGHT,
    label: 'Move right',
    portal: null,
  },
  {
    gameKey: GameKey.TURN,
    label: 'Turn in place',
    portal: null,
  },
  {
    gameKey: GameKey.BLUE,
    label: 'Blue portal',
    portal: 'blue',
  },
  {
    gameKey: GameKey.ORANGE,
    label: 'Orange portal',
    portal: 'orange',
  },
  {
    gameKey: GameKey.INTERACT,
    label: 'Interact',
    portal: null,
  },
  {
    gameKey: GameKey.UNDO,
    label: 'Undo',
    portal: null,
  },
  {
    gameKey: GameKey.REDO,
    label: 'Redo',
    portal: null,
  },
]

// Game keys whose rows are hidden for now, as in the chamber's legend, kept so they can be shown
// again; their keys still work
const HIDDEN_CONTROLS: ReadonlySet<GameKey> = new Set([
  GameKey.TURN,
  GameKey.UNDO,
  GameKey.REDO,
])

// The rows of the Controls column
const CONTROLS = ALL_CONTROLS.filter((control) => !HIDDEN_CONTROLS.has(control.gameKey))

const RESET_CONTROLS_INDEX = CONTROLS.length // Reset controls comes after the keys

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
const highlightedControl = ref(0)
const resetDialogOpen = ref(false)
const waitingControl = ref<GameKey | null>(null) // The game key whose row waits for a new key, or null
const refusedKey = ref<string | null>(null) // The key last refused while waiting, by name, or null
const controlStatus = ref('') // What the Controls column last did, read aloud by screen readers

let pointerSection: MenuSection | null = null // Section row under the pointer, so only moving onto a row takes the keyboard
let pointerItem: number | null = null // Item row under the pointer, so moving within an About or Controls row just clicked leaves the keyboard in its third column
let capturedCode: string | null = null // The key last taken while waiting, whose keyup must not press the focused row again

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

const controlsShown = computed(() => openSection.value === 'settings' && highlightedSetting.value === CONTROLS_INDEX)
const changelogShown = computed(() => openSection.value === 'about' && highlightedAboutEntry.value?.kind === 'changelog')

// The third column takes the keyboard only for About's pages and changelog and for the controls; Play's map is just shown
const detailTakesKeyboard = computed(() => {
  const kind = highlightedAboutEntry.value?.kind
  return controlsShown.value || (openSection.value === 'about' && (kind === 'links' || kind === 'changelog'))
})
const highlightedLinks = computed(() => {
  const entry = highlightedAboutEntry.value
  return openSection.value === 'about' && entry?.kind === 'links' ? entry.links : []
})
// The third column's rows: About's pages, or the keys with Reset controls
const detailRowCount = computed(() => controlsShown.value ? CONTROLS.length + 1 : highlightedLinks.value.length)
const highlightedDetail = computed(() => controlsShown.value ? highlightedControl.value : highlightedLink.value)
// The game key of the row that has the keyboard in the Controls column, or null
const activeControl = computed(() => {
  if (activeColumn.value !== 'details' || !controlsShown.value) {
    return null
  }
  return CONTROLS[highlightedControl.value]?.gameKey ?? null
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
    return settings.length + 2
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
 * Builds the id of a Settings row, which its third column is labelled by.
 * @param index - The row's index in the second column
 * @returns The row's id
 */
function settingRowId(index: number): string {
  return `${menuId}-settings-${index}`
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
    // Coming back to Controls starts its keys at the top, as another About row does
    if (index !== highlightedSetting.value) {
      highlightedControl.value = 0
    }
    highlightedSetting.value = index
  }
}

/**
 * Highlights a row of the third column: a page under About, or a key under Controls.
 * @param index - The row's index in the third column
 */
function highlightDetail(index: number): void {
  if (controlsShown.value) {
    highlightedControl.value = index
  } else {
    highlightedLink.value = index
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
 * Gives the third column the keyboard: the highlighted page or key, or the changelog.
 */
function focusDetail(): void {
  if (changelogShown.value) {
    changelogScroller.value?.focus()
  } else {
    focusRow('details', highlightedDetail.value)
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
    if (changelogShown.value) {
      changelogScroller.value?.scrollBy({
        top: offset * CHANGELOG_SCROLL_PIXELS,
      })
      return
    }
    const rowCount = detailRowCount.value
    if (rowCount === 0) {
      return
    }
    const nextRow = (highlightedDetail.value + offset + rowCount) % rowCount
    if (nextRow !== highlightedDetail.value) {
      highlightDetail(nextRow)
      Sound.MENU_BUTTON.play()
    }
    focusRow('details', nextRow)
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
 * third column, or from Controls into its keys, with a click. Does nothing
 * anywhere else, or for Feedback, which has nothing there.
 */
function openDetail(): void {
  if (activeColumn.value !== 'items' || !detailTakesKeyboard.value) {
    return
  }
  activeColumn.value = 'details'
  Sound.MENU_BUTTON.play()
  if (changelogShown.value) {
    trackChangelogOpen()
  }
  // The player may have switched keyboard layouts since the labels were read
  if (controlsShown.value) {
    refreshKeyLabels()
  }
  // A row clicked has only just been highlighted, so its third column may not be drawn yet
  void nextTick(focusDetail)
}

/**
 * Steps into the third column of an About or Controls row picked with the
 * mouse (or Space), just like Right. The row is highlighted first, since some
 * browsers (Safari) don't focus a clicked button, which would otherwise have done it.
 * @param index - The row's index in the second column
 */
function chooseDetailRow(index: number): void {
  handleItemFocus(index)
  openDetail()
}

/**
 * Right opens the highlighted section from the first column, or steps into the
 * third column from an About row that has pages or the changelog there, or from Controls.
 */
function stepIn(): void {
  if (activeColumn.value === 'sections') {
    openHighlightedSection()
  } else {
    openDetail()
  }
}

/**
 * Left and Escape step back from the third column to its About or Controls
 * row, with a click, or close the open section.
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
 * Keeps the state in step when a page or key row in the third column gets
 * the keyboard, such as through Tab, clicking when that moves the highlight.
 * @param index - The row's index in the third column
 */
function handleDetailFocus(index: number): void {
  if (activeColumn.value === 'details' && highlightedDetail.value === index) {
    return
  }
  activeColumn.value = 'details'
  highlightDetail(index)
  Sound.MENU_BUTTON.play()
}

/**
 * Highlights the page or key row under a moving pointer, with a click. Only
 * real movement counts, so rows shown under a still pointer never pull the keyboard into them.
 * @param index - The row's index in the third column
 * @param event - Pointer event
 */
function handleDetailPointerMove(index: number, event: PointerEvent): void {
  if (event.movementX === 0 && event.movementY === 0) {
    return
  }
  if (activeColumn.value === 'details' && highlightedDetail.value === index) {
    return
  }
  activeColumn.value = 'details'
  highlightDetail(index)
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
 * Waits for a new key for a game key picked in the Controls column (Enter,
 * Space or a click), with a click. The row is highlighted first, as for a
 * row stepped into, since some browsers (Safari) don't focus a clicked button.
 * @param index - The row's index in the third column
 */
function chooseControl(index: number): void {
  const control = CONTROLS[index]
  if (control === undefined) {
    return
  }
  handleDetailFocus(index)
  waitingControl.value = control.gameKey
  refusedKey.value = null
  controlStatus.value = `Press a key for ${control.label}, or Escape to cancel`
  Sound.MENU_BUTTON.play()
}

/**
 * Stops waiting for a key, leaving the binding as it was, silently.
 */
function cancelWaiting(): void {
  if (waitingControl.value === null) {
    return
  }
  waitingControl.value = null
  refusedKey.value = null
  controlStatus.value = ''
}

/**
 * Takes a key pressed while a row waits for one, keeping it from the page and
 * the menu: binds it, with a click (a key bound to another game key is
 * swapped), or refuses it with a note and keeps waiting. Escape cancels; a
 * held key's repeats are ignored, so the key that started the wait can't bind.
 * @param event - Keyboard event
 * @param gameKey - The game key waiting for a key
 */
function captureKey(event: KeyboardEvent, gameKey: GameKey): void {
  event.preventDefault()
  if (event.repeat) {
    return
  }
  capturedCode = event.code
  if (event.code === 'Escape') {
    cancelWaiting()
    return
  }
  const key = getBoundKey(event.code)
  if (key === null) {
    refusedKey.value = event.key === '' || event.key === 'Unidentified' ? 'that key' : event.key
    controlStatus.value = `Can't use ${refusedKey.value}. Press another key, or Escape to cancel`
    return
  }
  const control = CONTROLS.find((entry) => entry.gameKey === gameKey)
  const previousKey = keyBindings.value[gameKey]
  const swapped = ALL_CONTROLS.find((entry) => entry.gameKey !== gameKey && keyBindings.value[entry.gameKey] === key)
  bindKey(gameKey, key)
  waitingControl.value = null
  refusedKey.value = null
  const swapNote = swapped === undefined ? '' : `. ${swapped.label} moved to ${getKeyLabel(previousKey).name}`
  controlStatus.value = `${control?.label ?? 'Key'} set to ${getKeyLabel(key).name}${swapNote}`
  Sound.MENU_BUTTON.play()
}

/**
 * Puts every game key back on its default key, with a click.
 */
function resetControls(): void {
  cancelWaiting()
  resetKeyBindings()
  controlStatus.value = 'Controls reset to the defaults'
  Sound.MENU_BUTTON.play()
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
    : rowElements('details')[highlightedDetail.value]
  if (row !== undefined && document.activeElement !== row) {
    event.preventDefault()
    row.click()
  }
}

/**
 * Arrow keys, Enter and Escape drive the menu, unless a row in the Controls
 * column waits for a key, which then takes every key.
 * @param event - Keyboard event
 */
function handleKeydown(event: KeyboardEvent): void {
  // Before the modifier check, so Ctrl and Shift can be bound
  if (waitingControl.value !== null) {
    captureKey(event, waitingControl.value)
    return
  }
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

/**
 * Keeps the release of a key just taken for a binding from pressing the
 * focused row again, as Space would, which would start waiting once more.
 * @param event - Keyboard event
 */
function handleKeyup(event: KeyboardEvent): void {
  if (capturedCode !== null && event.code === capturedCode) {
    event.preventDefault()
    capturedCode = null
  }
}

// Moving the keyboard off the waiting row (the pointer, onto another row or column) stops the wait
watch(activeControl, (gameKey) => {
  if (gameKey !== waitingControl.value) {
    cancelWaiting()
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', handleKeyup)
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
  window.removeEventListener('keyup', handleKeyup)
})
</script>

<template>
  <main class="home-screen room">
    <div class="home-inner room-inner">
      <h1 class="room-title">
        <PortalLogo size="medium" />
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
                :id="settingRowId(CONTROLS_INDEX)"
                class="menu-row"
                :class="{
                  'menu-row-selected': highlightedSetting === CONTROLS_INDEX,
                  'menu-row-active': highlightedSetting === CONTROLS_INDEX && activeColumn === 'items',
                }"
                type="button"
                :aria-controls="highlightedSetting === CONTROLS_INDEX ? detailColumnId : undefined"
                :tabindex="highlightedSetting === CONTROLS_INDEX ? 0 : -1"
                @click="chooseDetailRow(CONTROLS_INDEX)"
                @focus="handleItemFocus(CONTROLS_INDEX)"
                @pointerdown="handleItemPointerDown(CONTROLS_INDEX)"
                @pointermove="handleItemPointerMove(CONTROLS_INDEX, $event)"
                @pointerleave="handleItemPointerLeave"
              >
                <span class="menu-row-label">Controls</span>
              </button>
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
                @click="chooseDetailRow(index)"
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
                @focus="handleDetailFocus(index)"
                @pointermove="handleDetailPointerMove(index, $event)"
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

        <!-- The Controls column runs from the top of the menu, since its keys reach well below
             the Settings rows -->
        <div
          v-else-if="controlsShown"
          :id="detailColumnId"
          ref="detailColumn"
          key="controls"
          class="home-column home-detail"
        >
          <ul class="home-row-list home-control-list" :aria-labelledby="settingRowId(CONTROLS_INDEX)">
            <li v-for="(control, index) in CONTROLS" :key="control.gameKey">
              <ControlRow
                :label="control.label"
                :bound-key="keyBindings[control.gameKey]"
                :portal="control.portal"
                :waiting="waitingControl === control.gameKey"
                :refused-key="refusedKey"
                :class="{
                  'menu-row-selected': index === highlightedControl,
                  'menu-row-active': index === highlightedControl && activeColumn === 'details',
                }"
                :tabindex="index === highlightedControl ? 0 : -1"
                @click="chooseControl(index)"
                @focus="handleDetailFocus(index)"
                @pointermove="handleDetailPointerMove(index, $event)"
              />
            </li>
            <li>
              <button
                class="menu-row"
                :class="{
                  'menu-row-selected': highlightedControl === RESET_CONTROLS_INDEX,
                  'menu-row-active': highlightedControl === RESET_CONTROLS_INDEX && activeColumn === 'details',
                }"
                type="button"
                :tabindex="highlightedControl === RESET_CONTROLS_INDEX ? 0 : -1"
                @click="resetControls"
                @focus="handleDetailFocus(RESET_CONTROLS_INDEX)"
                @pointermove="handleDetailPointerMove(RESET_CONTROLS_INDEX, $event)"
              >
                <span class="menu-row-label">Reset controls</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Read aloud as the Controls column waits for, takes or refuses a key -->
    <p class="home-status" role="status">{{ controlStatus }}</p>

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
/* The logo clear of the menu below it; with the logo, as much height as the menu had below the
   earlier text wordmark, so the open Play section still fits the same windows */
.home-inner {
  display: flex;
  flex-direction: column;
  gap: 3rem;
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

/* Page and key rows as wide as the second column's narrowest, so their arrows and keys stay near the names */
.home-link-list,
.home-control-list {
  max-width: 28rem;
}

/* Heard, not seen */
.home-status {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
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
