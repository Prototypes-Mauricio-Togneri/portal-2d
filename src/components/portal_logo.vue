<script setup lang="ts">
/**
 * A sign title set between a blue and an orange portal: the "Portal 2D"
 * wordmark, or a screen's title in the same place and size.
 * The large size opens its portals once when it first appears.
 */
export interface PortalLogoProps {
  size?: 'large' | 'small'
  text?: string
}

withDefaults(defineProps<PortalLogoProps>(), {
  size: 'large',
  text: 'Portal 2D',
})
</script>

<template>
  <span class="portal-logo" :class="`portal-logo-${size}`">
    <span class="portal portal-blue" aria-hidden="true"></span>
    <span class="wordmark">{{ text }}</span>
    <span class="portal portal-orange" aria-hidden="true"></span>
  </span>
</template>

<style scoped>
.portal-logo {
  display: inline-flex;
  align-items: stretch;
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1;
  color: var(--color-ink);
}

/* Portal bars flanking the word */
.portal {
  flex: none;
  width: 0.14em;
  transform-origin: center;
}

.portal-blue {
  background: var(--color-blue);
}

.portal-orange {
  background: var(--color-orange);
}

.wordmark {
  padding: 0.04em 0.16em 0;
  letter-spacing: -0.01em;
}

/* Sizes */
.portal-logo-large {
  font-size: clamp(3.5rem, 7vw, 6rem);
}

.portal-logo-small {
  font-size: 1.5rem;
}

/* Portals open once on the home screen */
.portal-logo-large .portal {
  animation: portal-open 520ms var(--ease-out) both;
}

.portal-logo-large .portal-orange {
  animation-delay: 140ms;
}

.portal-logo-large .wordmark {
  animation: wordmark-arrive 520ms var(--ease-out) 220ms both;
}

@keyframes portal-open {
  from {
    transform: scaleY(0);
  }

  to {
    transform: scaleY(1);
  }
}

@keyframes wordmark-arrive {
  from {
    opacity: 0;
    transform: translateX(-0.12em);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
