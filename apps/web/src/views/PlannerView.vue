<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import ClassSplitBar from '../components/ClassSplitBar.vue';
import CreationTab from '../components/CreationTab.vue';
import EquipmentTab from '../components/EquipmentTab.vue';
import LevelsTab from '../components/LevelsTab.vue';
import SaveBar from '../components/SaveBar.vue';
import SheetPanel from '../components/SheetPanel.vue';
import { usePartyPaths } from '../lib/party-routes';
import { useBuildStore } from '../stores/build';
import { usePartyStore } from '../stores/party';

const store = useBuildStore();
const party = usePartyStore();
const { partyPath } = usePartyPaths();
const tab = ref<'creation' | 'levels' | 'equipment'>('creation');

const tabs = [
  { id: 'creation', label: 'Creation' },
  { id: 'levels', label: 'Levels' },
  { id: 'equipment', label: 'Equipment' },
] as const;

const race = computed(() => {
  const c = store.character;
  return [c.subrace?.name ?? c.race?.name, c.background?.name].filter(Boolean).join(', ');
});
</script>

<template>
  <div class="planner">
    <header class="identity">
      <RouterLink :to="partyPath" class="back" data-action="back-to-party">
        {{ party.shownParty.name || 'Your party' }}
      </RouterLink>
      <div class="name-row">
        <h1 class="name">{{ store.name || 'Unnamed character' }}</h1>
        <SaveBar v-if="!party.viewing" />
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
      <!-- Tabs stay usable read-only; only the choices are switched off. -->
      <fieldset class="work-fields" :disabled="party.readOnly">
        <legend class="visually-hidden">Character choices</legend>
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
          <LevelsTab v-else-if="t.id === 'levels'" />
          <EquipmentTab v-else />
        </section>
      </fieldset>
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

.back {
  justify-self: start;
  font-size: 0.9375rem;
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

.work-fields {
  border: none;
  margin: 0;
  padding: 0;
  min-width: 0;
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

  .name-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .sheet-column {
    position: static;
    max-height: none;
    overflow: visible;
  }
}
</style>
