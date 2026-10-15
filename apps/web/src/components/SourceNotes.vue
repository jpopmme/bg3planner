<script setup lang="ts">
import type { BuildSource } from '@bg3planner/rules';
import { computed } from 'vue';

const props = defineProps<{ source: BuildSource; level?: number }>();

/** Notes about this level; without a level, notes about character creation. */
const notes = computed(() => props.source.notes.filter((n) => n.level === props.level));
const date = computed(() => new Date(props.source.importedAt).toLocaleDateString());
</script>

<template>
  <div v-if="level === undefined || notes.length" class="source-notes">
    <p v-if="level === undefined" class="origin">
      Imported from
      <a v-if="source.url" :href="source.url" target="_blank" rel="noopener">{{ source.title }}</a>
      <template v-else>{{ source.title }}</template>
      on {{ date }}.
    </p>
    <ul v-if="notes.length" :aria-label="level ? `Guide notes for level ${level}` : 'Guide notes'">
      <li v-for="(note, i) in notes" :key="i">{{ note.message }}</li>
    </ul>
  </div>
</template>

<style scoped>
.source-notes {
  display: grid;
  gap: 4px;
  padding: 10px 14px;
  border-left: 3px solid var(--accent);
  background: var(--accent-soft);
  border-radius: 0 var(--radius-control) var(--radius-control) 0;
  font-size: 0.9375rem;
}

p {
  margin: 0;
}

ul {
  margin: 0;
  padding-left: 18px;
}
</style>
