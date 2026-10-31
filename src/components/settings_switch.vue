<script setup lang="ts">
/**
 * One on/off row on the settings screen.
 */
import {useId} from 'vue'

export interface SettingsSwitchProps {
  label: string
  description: string
}

defineProps<SettingsSwitchProps>()

const enabled = defineModel<boolean>({
  required: true,
})

const labelId = useId()
const descriptionId = useId()
</script>

<template>
  <div class="settings-switch">
    <div class="switch-text">
      <span :id="labelId" class="switch-label">{{ label }}</span>
      <span :id="descriptionId" class="switch-description">{{ description }}</span>
    </div>
    <button
      class="switch"
      :class="{
        'switch-on': enabled,
      }"
      type="button"
      role="switch"
      :aria-checked="enabled"
      :aria-labelledby="labelId"
      :aria-describedby="descriptionId"
      @click="enabled = !enabled"
    >
      <span class="switch-state">{{ enabled ? 'On' : 'Off' }}</span>
      <span class="switch-track" aria-hidden="true">
        <span class="switch-thumb"></span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.settings-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  padding: 1.25rem 0;
}

/* Rule between rows */
.settings-switch + .settings-switch {
  border-top: 1px solid var(--color-rule);
}

.switch-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.switch-label {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.2;
}

.switch-description {
  color: var(--color-ink-muted);
}

/* Switch control */
.switch {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.75rem;
  padding: 0 0.25rem 0 0.75rem;
  border: none;
  border-radius: 0.25rem;
  background: none;
  cursor: pointer;
}

.switch-state {
  min-width: 1.75rem;
  color: var(--color-ink-muted);
  font-weight: 600;
  text-align: right;
}

.switch-on .switch-state {
  color: var(--color-ink);
}

.switch-track {
  position: relative;
  width: 3.25rem;
  height: 1.75rem;
  border: 1px solid var(--color-rule);
  border-radius: 1rem;
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
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: var(--color-white);
  box-shadow: 0 1px 2px rgba(var(--color-ink-rgb), 0.3);
  transition: transform 140ms var(--ease-out);
}

.switch-on .switch-thumb {
  transform: translateX(1.5rem);
}
</style>
