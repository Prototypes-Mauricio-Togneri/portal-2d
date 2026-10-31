<script setup lang="ts">
/**
 * One on/off setting as a sign card: an icon, its name, what it controls, and
 * a switch. The whole card is the switch, so a click, Space or Enter anywhere
 * on it flips the setting.
 */
import {useId} from 'vue'

export interface SettingsSwitchProps {
  label: string
  description: string
  icon: 'sound' | 'music'
}

defineProps<SettingsSwitchProps>()

const enabled = defineModel<boolean>({
  required: true,
})

const labelId = useId()
const descriptionId = useId()
</script>

<template>
  <button
    class="settings-switch sign-card"
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
    <span class="sign-card-head">
      <svg class="switch-icon" viewBox="0 0 24 24" aria-hidden="true">
        <template v-if="icon === 'sound'">
          <path class="icon-fill" d="M3 9h4l5-4v14l-5-4H3z" />
          <path class="icon-stroke" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
        </template>
        <template v-else>
          <path class="icon-fill" d="M7.5 6L20.5 3V15H18.5V6.46L9.5 8.54V18H7.5Z" />
          <circle class="icon-fill" cx="6.5" cy="18" r="3" />
          <circle class="icon-fill" cx="17.5" cy="15" r="3" />
        </template>
      </svg>
      <span class="sign-card-name">
        <span :id="labelId" class="sign-card-title">{{ label }}</span>
      </span>
    </span>
    <span class="switch-body">
      <span :id="descriptionId" class="switch-description">{{ description }}</span>
      <span class="switch-control">
        <span class="switch-state">{{ enabled ? 'On' : 'Off' }}</span>
        <span class="switch-track" aria-hidden="true">
          <span class="switch-thumb"></span>
        </span>
      </span>
    </span>
  </button>
</template>

<style scoped>
/* Sign card (styles.css) that is itself the switch */
.settings-switch {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0;
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
}

/* Icon in the header strip, where a chamber card shows its number */
.switch-icon {
  flex: none;
  width: 3rem;
  height: 3rem;
}

.icon-fill {
  fill: currentColor;
}

.icon-stroke {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

/* What the setting controls, with the switch pinned to the bottom right */
.switch-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.25rem;
}

.switch-description {
  color: var(--color-ink-muted);
}

.switch-control {
  display: inline-flex;
  align-items: center;
  align-self: flex-end;
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
