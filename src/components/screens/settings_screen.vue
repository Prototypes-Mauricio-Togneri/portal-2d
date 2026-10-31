<script setup lang="ts">
/**
 * Settings screen: sound effects and music on/off.
 */
import {onBeforeUnmount, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import PortalLogo from '@/components/portal_logo.vue'
import SettingsSwitch from '@/components/settings_switch.vue'
import {musicEnabled, soundEnabled} from '@/services/settings'

const router = useRouter()

/**
 * Returns to the home screen.
 */
function goHome(): void {
  void router.push({
    name: 'home',
  })
}

/**
 * Escape goes back to the home screen.
 * @param event - Keyboard event
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    goHome()
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
  <main class="settings-screen wall">
    <div class="settings-inner">
      <header class="settings-header">
        <PortalLogo size="small" />
        <button class="button button-quiet" type="button" @click="goHome">Back to chambers</button>
      </header>

      <section class="settings-panel" aria-labelledby="settings-heading">
        <h1 id="settings-heading" class="settings-heading">Settings</h1>
        <SettingsSwitch
          v-model="soundEnabled"
          label="Sound effects"
          description="Portals, doors, buttons and the other sounds inside a chamber"
        />
        <SettingsSwitch
          v-model="musicEnabled"
          label="Music"
          description="Background music, starting with your first chamber"
        />
      </section>
    </div>
  </main>
</template>

<style scoped>
.settings-screen {
  height: 100%;
  overflow-y: auto;
}

.settings-inner {
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
  max-width: 80rem;
  margin: 0 auto;
  padding: 3.5rem 4rem 4rem;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

/* Settings sign */
.settings-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 40rem;
  padding: 1.5rem 2rem 0.75rem;
  border: 1px solid var(--color-rule);
  border-radius: 0.25rem;
  background: var(--color-panel);
}

.settings-heading {
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-rule);
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}
</style>
