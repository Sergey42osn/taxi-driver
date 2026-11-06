<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { useDriverStore } from '@/stores/driver'

const driver = useDriverStore()
</script>

<template>
  <div class="app-shell">
    <AppHeader v-if="driver.isAuthenticated" />
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100dvh;
}

.app-main {
  flex: 1;
  min-height: 0;
  display: flex;
}
</style>