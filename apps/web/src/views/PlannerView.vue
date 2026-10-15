<script setup lang="ts">
import { computed, ref } from 'vue';
import ClassSplitBar from '../components/ClassSplitBar.vue';
import CreationTab from '../components/CreationTab.vue';
import LevelsTab from '../components/LevelsTab.vue';
import SheetPanel from '../components/SheetPanel.vue';
import { useBuildStore } from '../stores/build';

const store = useBuildStore();
const tab = ref<'creation' | 'levels'>('creation');

const tabs = [
  { id: 'creation', label: 'Creation' },
  { id: 'levels', label: 'Levels' },
] as const;

const race = computed(() => {
  const c = store.character;
  return [c.subrace?.name ?? c.race?.name, c.background?.name].filter(Boolean).join(', ');
});

function startOver() {
  if (confirm('Start a new character? The current one will be cleared.')) store.reset();
}
</script>

<template>
  <div class="planner">
    <header class="identity">
      <div class="name-row">
        <h1 class="name">{{ store.name || 'Unnamed character' }}</h1>
        <button type="button" class="reset" @click="startOver">New character</button>
      </div>
      <p class="muted">Level {{ store.character.level }}, {{ race }}</p>
      <ClassSplitBar :classes="store.character.classes" :level="store.character.level" />
    </header>

    <aside class="sheet-column">
      <SheetPanel />
    </aside>

    <main class="work">
      <div class="tabs" role="tablist" aria-label="Planner sections">
        <button
          v-for="t in tabs"
          :id="`tab-${t.id}`"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="tab === t.id"
          :aria-controls="`panel-${t.id}`"
          :tabindex="tab === t.id ? 0 : -1"
          @click="tab = t.id"
        >
          {{ t.label }}
        </button>
      </div>
      <section
        v-for="t in tabs"
        v-show="tab === t.id"
        :id="`panel-${t.id}`"
        :key="t.id"
        role="tabpanel"
        :aria-labelledby="`tab-${t.id}`"
        class="panel"
      >
        <CreationTab v-if="t.id === 'creation'" />
        <LevelsTab v-else />
      </section>
    </main>
  </div>
</template>

<style scoped>
.planner {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  grid-template-areas:
    'identity identity'
    'sheet work';
  gap: 28px 40px;
  max-width: 1240px;
  margin: 0 auto;
  padding: 28px 24px 64px;
}

.identity {
  grid-area: identity;
  display: grid;
  gap: 6px;
}

.identity p {
  margin: 0;
}

.name-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}

.name {
  font-family: var(--font-name);
  font-weight: 500;
  font-size: clamp(2.2rem, 5vw, 3.4rem);
  line-height: 1;
  letter-spacing: 0.01em;
  overflow-wrap: anywhere;
}

.reset {
  flex: none;
}

.sheet-column {
  grid-area: sheet;
  align-self: start;
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding-right: 4px;
}

.work {
  grid-area: work;
  min-width: 0;
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--rule);
  margin-bottom: 20px;
}

.tabs button {
  border: none;
  border-bottom: 3px solid transparent;
  border-radius: 0;
  background: none;
  padding: 8px 14px;
  color: var(--ink-muted);
  font-weight: 700;
}

.tabs button[aria-selected='true'] {
  color: var(--ink);
  border-bottom-color: var(--accent);
}

@media (max-width: 860px) {
  .planner {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'identity'
      'work'
      'sheet';
    padding: 20px 16px 48px;
  }

  .sheet-column {
    position: static;
    max-height: none;
    overflow: visible;
  }
}
</style>
