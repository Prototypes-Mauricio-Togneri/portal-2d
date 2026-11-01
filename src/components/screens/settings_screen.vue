<script setup lang="ts">
/**
 * Settings screen: sound effects and music on/off, laid out like the home
 * screen so its button sits where the home screen's Settings button does.
 * The left and right arrow keys move between the setting cards.
 */
import {onBeforeUnmount, onMounted, useTemplateRef} from 'vue'
import {useRouter} from 'vue-router'
import PortalLogo from '@/components/portal_logo.vue'
import SectionHeading from '@/components/section_heading.vue'
import SettingsSwitch from '@/components/settings_switch.vue'
import {useArrowFocus} from '@/composables/use_arrow_focus'
import {Sound} from '@/game/sound'
import {musicEnabled, playMusic, soundEnabled} from '@/services/settings'

const router = useRouter()

const settingList = useTemplateRef<HTMLElement>('settingList')

useArrowFocus(settingList, '.settings-switch')

/**
 * Clicks, then returns to the home screen.
 */
function goHome(): void {
  Sound.MENU_BUTTON.play()
  void router.push({
    name: 'home',
  })
}

/**
 * Escape goes back to the home screen, like the Main menu button.
 * @param event - Keyboard event
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    goHome()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  playMusic('menu')
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <main class="settings-screen room">
    <div class="settings-inner room-inner">
      <header class="room-header">
        <h1 class="room-title">
          <PortalLogo class="settings-title" size="large" text="Settings" />
        </h1>
        <button class="button button-sign" type="button" @click="goHome">
          <svg class="button-sign-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2L23 11.5H20.5V22H14.5V15.5H9.5V22H3.5V11.5H1Z" />
          </svg>
          Main menu
        </button>
      </header>

      <section class="settings-section" aria-labelledby="audio-heading">
        <SectionHeading heading-id="audio-heading" title="Audio" />
        <div ref="settingList" class="setting-list">
          <SettingsSwitch
            v-model="soundEnabled"
            label="Sound effects"
            description="Menu clicks, plus the portals, doors, buttons and other sounds inside a chamber"
            icon="sound"
          />
          <SettingsSwitch
            v-model="musicEnabled"
            label="Music"
            description="Background music in the menus and the chambers"
            icon="music"
          />
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
/* Same rhythm as the home screen */
.settings-inner {
  display: flex;
  flex-direction: column;
  gap: 5.5rem;
}

/* Screen title in capitals, unlike the wordmark it stands in for */
.settings-title {
  text-transform: uppercase;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Same columns as the three chamber cards, so the two screens line up: three across, two when
   a column would drop under 18rem (1px of slack stops rounding from losing the third column) */
.setting-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(max(18rem, calc((100% - 4rem) / 3 - 1px)), 1fr));
  gap: 2rem;
}
</style>
