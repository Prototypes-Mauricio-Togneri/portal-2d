<script setup lang="ts">
import DesktopOnlyNotice from '@/components/desktop_only_notice.vue'
import {isTouchFirst} from '@/services/device'
</script>

<!-- The view is keyed so moving between chamber addresses always builds a fresh chamber screen -->
<template>
  <DesktopOnlyNotice v-if="isTouchFirst" />
  <RouterView v-else :key="$route.fullPath" />
</template>
