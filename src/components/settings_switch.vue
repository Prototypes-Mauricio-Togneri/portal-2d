<script setup lang="ts">
/**
 * One on/off setting in the home menu: a row with its name and a switch. The
 * whole row is the switch, so a click, Space or Enter anywhere on it flips the
 * setting. What the setting controls is shown beside the menu and linked by id.
 */
import {nextTick, useId} from 'vue'
import {Sound} from '@/game/sound'

export interface SettingsSwitchProps {
  label: string
  descriptionId: string
}

defineProps<SettingsSwitchProps>()

const enabled = defineModel<boolean>({
  required: true,
})

const labelId = useId()

/**
 * Flips the setting, then clicks once the change has been applied, so turning
 * sound effects on is heard and turning them off stays silent.
 */
function toggle(): void {
  enabled.value = !enabled.value
  void nextTick(() => {
    Sound.MENU_BUTTON.play()
  })
}
</script>

<template>
  <button
    class="settings-switch menu-row sign-card"
    :class="{
      'switch-on': enabled,
    }"
    type="button"
    role="switch"
    :aria-checked="enabled"
    :aria-labelledby="labelId"
    :aria-describedby="descriptionId"
    @click="toggle"
  >
    <span :id="labelId" class="menu-row-label">{{ label }}</span>
    <span class="switch-control">
      <span class="switch-state">{{ enabled ? 'On' : 'Off' }}</span>
      <span class="switch-track" aria-hidden="true">
        <span class="switch-thumb"></span>
      </span>
    </span>
    <span class="sign-card-frame" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
/* State word and track at the row's right edge */
.switch-control {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.75rem;
}

.switch-state {
  min-width: 2.25rem;
  color: var(--color-ink-muted);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.06em;
  text-align: right;
  text-transform: uppercase;
}

.switch-on .switch-state {
  color: var(--color-ink);
}

.switch-track {
  position: relative;
  width: 4rem;
  height: 2.125rem;
  border: 1px solid var(--color-rule);
  border-radius: 1.125rem;
  background: var(--color-wall);
  transition: background-color 140ms ease, border-color 140ms ease;
}

.switch-on .switch-track {
  border-color: var(--color-blue-deep);
  background: var(--color-blue);
}

.switch-thumb {
  position: absolute;
  top: 0.1875rem;
  left: 0.1875rem;
  width: 1.625rem;
  height: 1.625rem;
  border-radius: 50%;
  background: var(--color-white);
  box-shadow: 0 1px 2px rgba(var(--color-ink-rgb), 0.3);
  transition: transform 140ms var(--ease-out);
}

.switch-on .switch-thumb {
  transform: translateX(1.875rem);
}
</style>
