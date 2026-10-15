<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="app-title">BG3 Party Planner</RouterLink>
  </header>
  <main class="app-main">
    <RouterView />
  </main>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.app-title {
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}

.app-main {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px;
}
</style>
