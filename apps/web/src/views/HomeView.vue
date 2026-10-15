<script setup lang="ts">
import type { HealthResponse } from '@bg3planner/shared';
import { onMounted, onUnmounted, ref } from 'vue';
import { fetchHealth } from '../api/client';

const health = ref<HealthResponse | null>(null);
const error = ref<string | null>(null);
const controller = new AbortController();

onMounted(async () => {
  try {
    health.value = await fetchHealth(controller.signal);
  } catch (err) {
    if (!controller.signal.aborted) {
      error.value = err instanceof Error ? err.message : String(err);
    }
  }
});

onUnmounted(() => controller.abort());
</script>

<template>
  <h1>Your parties</h1>
  <p class="muted">Party and character planning arrive in the next milestones.</p>

  <p class="api-status" data-testid="api-status">
    <template v-if="health">
      API online · v{{ health.version }} · game data {{ health.gameDataVersion }}
    </template>
    <template v-else-if="error">API unreachable: {{ error }}</template>
    <template v-else>Checking API…</template>
  </p>
</template>

<style scoped>
.muted {
  color: var(--text-muted);
}

.api-status {
  margin-top: 32px;
  font-size: 0.875rem;
  color: var(--text-muted);
}
</style>
