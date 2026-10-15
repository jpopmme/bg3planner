<script setup lang="ts">
import type { Issue } from '@bg3planner/rules';

defineProps<{ issues: Issue[] }>();
</script>

<template>
  <ul v-if="issues.length" class="issues">
    <li v-for="(issue, i) in issues" :key="i" :class="issue.severity">
      <span class="visually-hidden">{{ issue.severity === 'error' ? 'Problem:' : 'To do:' }}</span>
      {{ issue.message }}
    </li>
  </ul>
</template>

<style scoped>
.issues {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
  font-size: 0.875rem;
}

li {
  padding-left: 14px;
  position: relative;
}

li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.5em;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.error {
  color: var(--error);
}

.error::before {
  background: var(--error);
}

.warning::before {
  background: var(--warning);
}
</style>
