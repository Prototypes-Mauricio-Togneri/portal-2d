<script setup lang="ts">
import {ref} from 'vue'
import DesktopOnlyNotice from '@/components/desktop_only_notice.vue'
import LoadingScreen from '@/components/screens/loading_screen.vue'
import {isTouchFirst} from '@/services/device'

const started = ref(false) // True once the player has pressed Start on the loading screen
</script>

<!-- Every visit opens on the loading screen, then the requested address.
     The view is keyed so moving between chamber addresses always builds a fresh chamber screen -->
<template>
  <DesktopOnlyNotice v-if="isTouchFirst" />
  <LoadingScreen v-else-if="!started" @start="started = true" />
  <RouterView v-else :key="$route.fullPath" />
</template>
