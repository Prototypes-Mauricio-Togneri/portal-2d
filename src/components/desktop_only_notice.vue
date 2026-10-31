<script setup lang="ts">
/**
 * Replaces the whole app on touch-first devices, which have no keyboard to play with.
 */
import PortalLogo from '@/components/portal_logo.vue'
</script>

<template>
  <main class="desktop-only wall">
    <PortalLogo size="small" />
    <p class="message">Portal 2D is currently only available in desktop version</p>
  </main>
</template>

<style scoped>
.desktop-only {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 1.25rem;
  min-height: 100%;
  padding: 2rem 1.5rem;
}

.message {
  max-width: 22rem;
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.15;
}
</style>
