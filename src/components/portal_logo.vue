<script setup lang="ts">
/**
 * The "Portal 2D" logo: the name between a blue and an orange portal's sweep.
 * Large on the loading screen, medium on the home screen, small beside a
 * chamber and on the desktop-only notice. The large and medium sizes fade in
 * once when they first appear.
 */
import logoUrl from '@/assets/images/portal_2d_logo.webp'

export interface PortalLogoProps {
  size?: 'large' | 'medium' | 'small'
}

withDefaults(defineProps<PortalLogoProps>(), {
  size: 'large',
})
</script>

<template>
  <!-- The file's own size, so its space is kept while it downloads -->
  <img
    class="portal-logo"
    :class="`portal-logo-${size}`"
    :src="logoUrl"
    alt="Portal 2D"
    width="1312"
    height="729"
  >
</template>

<style scoped>
/* A fixed width, capped by the space there is: a width in percent would leave a box that shrinks
   to fit it (the loading screen's title) as wide as the file itself, and the logo off centre */
.portal-logo {
  display: block;
  max-width: 100%;
  height: auto;
}

/* Sizes */
.portal-logo-large {
  width: 28rem;
}

.portal-logo-medium {
  width: 20.5rem;
}

.portal-logo-small {
  width: 13rem;
}

/* The loading and home screens' logo fades in once */
.portal-logo-large,
.portal-logo-medium {
  animation: logo-arrive 520ms var(--ease-out) both;
}

@keyframes logo-arrive {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>
