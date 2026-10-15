<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import ClassSplitBar from '../components/ClassSplitBar.vue';
import CreationTab from '../components/CreationTab.vue';
import LevelsTab from '../components/LevelsTab.vue';
import SaveBar from '../components/SaveBar.vue';
import SheetPanel from '../components/SheetPanel.vue';
import { useBuildStore } from '../stores/build';
import { usePartyStore } from '../stores/party';

const store = useBuildStore();
const party = usePartyStore();
const route = useRoute();
const router = useRouter();
const tab = ref<'creation' | 'levels'>('creation');
const linkProblem = ref<string | null>(null);

const tabs = [
  { id: 'creation', label: 'Creation' },
  { id: 'levels', label: 'Levels' },
] as const;

const race = computed(() => {
  const c = store.character;
  return [c.subrace?.name ?? c.race?.name, c.background?.name].filter(Boolean).join(', ');
});

const REPLACE_WARNING =
  'This replaces the character on this device, which is not saved anywhere else. ' +
  'Export it first if you want to keep it.';

/** Opens the party a link points to: /p/:id (online, #edit=token to edit) or /s#… (snapshot). */
watch(
  () => route.fullPath,
  async () => {
    linkProblem.value = null;
    if (route.name === 'party-link') {
      const id = String(route.params.id);
      const editToken = new URLSearchParams(route.hash.slice(1)).get('edit') ?? undefined;
      if (
        editToken &&
        party.remote?.id !== id &&
        party.hasUnsavedWork &&
        !confirm(REPLACE_WARNING)
      ) {
        await router.replace('/');
        return;
      }
      const result = await party.openLink({ id, ...(editToken ? { editToken } : {}) });
      // Our own party, or now editable here: show it at / so the edit token leaves the address bar.
      if (result === 'edit' || result === 'own') await router.replace('/');
      if (result === 'missing')
        linkProblem.value = 'This link does not lead to a party. It may have been deleted.';
    } else if (route.name === 'snapshot-link') {
      const result = await party.openLink({ encoded: route.hash.slice(1) });
      if (result === 'missing') linkProblem.value = 'This link is incomplete or damaged.';
    } else {
      party.stopViewing();
    }
  },
  { immediate: true },
);

function startOver() {
  const message = party.remote
    ? 'Start a new character? The online copy stays at its links, but this device stops editing it.'
    : 'Start a new character? The current one will be cleared.';
  if (confirm(message)) party.startOver();
}

function keepCopy() {
  if (party.hasUnsavedWork && !confirm(REPLACE_WARNING)) return;
  party.copyViewed();
  void router.push('/');
}
</script>

<template>
  <div class="planner">
    <div class="notices">
      <div v-if="linkProblem" class="banner problem" role="alert">
        <p>{{ linkProblem }}</p>
        <RouterLink to="/">Back to your character</RouterLink>
      </div>

      <div v-if="party.viewing" class="banner viewing" data-banner="viewing">
        <p>
          You are looking at a shared character. Changes are off; keep a copy to make it your own.
        </p>
        <div class="banner-actions">
          <button type="button" class="primary" data-action="keep-copy" @click="keepCopy">
            Keep a copy
          </button>
          <RouterLink to="/">Back to your character</RouterLink>
        </div>
      </div>

      <div v-if="party.status === 'conflict'" class="banner conflict" data-banner="conflict">
        <p>
          This party was changed on another device since this one last saved online. Pick which
          version to keep; the other is discarded.
        </p>
        <div class="banner-actions">
          <button type="button" data-action="keep-server" @click="party.keepServerVersion()">
            Use the other device's version
          </button>
          <button type="button" data-action="keep-mine" @click="party.keepMyVersion()">
            Keep this device's version
          </button>
        </div>
      </div>
    </div>

    <header class="identity">
      <div class="name-row">
        <h1 class="name">{{ store.name || 'Unnamed character' }}</h1>
        <div v-if="!party.viewing" class="header-actions">
          <SaveBar />
          <button type="button" class="reset" @click="startOver">New character</button>
        </div>
      </div>
      <p class="muted">Level {{ store.character.level }}, {{ race }}</p>
      <ClassSplitBar :classes="store.character.classes" :level="store.character.level" />
    </header>

    <aside class="sheet-column">
      <SheetPanel />
    </aside>

    <main class="work">
      <fieldset class="work-fields" :disabled="party.readOnly">
        <legend class="visually-hidden">Character choices</legend>
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
      </fieldset>
    </main>
  </div>
</template>

<style scoped>
.planner {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  grid-template-areas:
    'notices notices'
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

.header-actions {
  display: flex;
  gap: 6px;
  align-items: flex-end;
}

.reset {
  flex: none;
}

.notices {
  grid-area: notices;
  display: grid;
  gap: 10px;
}

/* No row (and no gap) when there is nothing to say. */
.notices:empty {
  display: none;
}

.banner {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: var(--radius-panel);
  border: 1px solid var(--rule);
  background: var(--surface);
}

.banner p {
  margin: 0;
  max-width: 70ch;
}

.banner.viewing {
  border-color: var(--accent);
}

.banner.conflict,
.banner.problem {
  border-color: var(--warning);
}

.banner-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
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
      'notices'
      'identity'
      'work'
      'sheet';
    padding: 20px 16px 48px;
  }

  .name-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    flex-direction: column;
  }

  .sheet-column {
    position: static;
    max-height: none;
    overflow: visible;
  }
}
</style>
