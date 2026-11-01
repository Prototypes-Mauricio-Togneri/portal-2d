<script setup lang="ts">
/**
 * What a setting controls, shown beside the home menu while the setting is
 * highlighted: its pictogram and a sentence describing it. The sentence's id
 * lets the setting's switch name it as its description.
 */
export interface SettingDetailProps {
  icon: 'sound' | 'music'
  description: string
  descriptionId: string
}

defineProps<SettingDetailProps>()
</script>

<template>
  <div class="setting-detail">
    <svg class="setting-detail-icon" viewBox="0 0 24 24" aria-hidden="true">
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
    <p :id="descriptionId" class="setting-detail-description">{{ description }}</p>
  </div>
</template>

<style scoped>
/* Pictogram over the sentence, set at the top left like the rows beside it */
.setting-detail {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.25rem;
  padding: 0.5rem 0.25rem;
}

.setting-detail-icon {
  flex: none;
  width: 4rem;
  height: 4rem;
  color: var(--color-ink);
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

.setting-detail-description {
  max-width: 30ch;
  color: var(--color-ink-muted);
  font-size: 1.25rem;
  line-height: 1.45;
}
</style>
