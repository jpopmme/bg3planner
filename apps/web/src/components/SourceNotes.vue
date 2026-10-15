<script setup lang="ts">
import { ACT_NAMES, type Act, type BuildSource } from '@bg3planner/rules';
import { computed } from 'vue';

const props = defineProps<{ source: BuildSource; level?: number; act?: Act }>();

/** Notes about this level or act's gear; with neither, notes about character creation. */
const notes = computed(() =>
  props.source.notes.filter((n) =>
    props.act ? n.act === props.act : n.level === props.level && !n.act,
  ),
);
const header = computed(() => props.level === undefined && props.act === undefined);
const date = computed(() => new Date(props.source.importedAt).toLocaleDateString());
</script>

<template>
  <div v-if="header || notes.length" class="source-notes">
    <p v-if="header" class="origin">
      Imported from
      <a v-if="source.url" :href="source.url" target="_blank" rel="noopener">{{ source.title }}</a>
      <template v-else>{{ source.title }}</template>
      on {{ date }}.
    </p>
    <ul
      v-if="notes.length"
      :aria-label="
        act
          ? `Guide notes for ${ACT_NAMES[act]} gear`
          : level
            ? `Guide notes for level ${level}`
            : 'Guide notes'
      "
    >
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
