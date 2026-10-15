<script setup lang="ts">
import { gameData } from '@bg3planner/gamedata';
import type { ImportResult } from '@bg3planner/importer';
import { ACT_NAMES, ACTS, MAX_ROSTER, deriveCharacter } from '@bg3planner/rules';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { importGuide } from '../lib/api';
import { usePartyPaths } from '../lib/party-routes';
import { usePartyStore } from '../stores/party';

const party = usePartyStore();
const router = useRouter();
const { memberPath } = usePartyPaths();

const dialog = ref<HTMLDialogElement>();
const url = ref('');
const html = ref('');
const busy = ref(false);
const problem = ref<string | null>(null);
const result = ref<ImportResult | null>(null);

function open() {
  url.value = '';
  html.value = '';
  problem.value = null;
  result.value = null;
  dialog.value?.showModal();
}
defineExpose({ open });

async function run(source: { url: string } | { html: string }) {
  busy.value = true;
  problem.value = null;
  try {
    result.value = await importGuide(source);
  } catch (error) {
    problem.value =
      error instanceof Error ? error.message : 'The guide could not be imported. Try again later.';
  } finally {
    busy.value = false;
  }
}

const character = computed(() =>
  result.value ? deriveCharacter(result.value.build, gameData) : undefined,
);
const summary = computed(() => {
  const c = character.value;
  if (!c) return '';
  const classes = c.classes.map((x) => `${x.level} ${x.subclass?.name ?? x.name}`).join(', ');
  const acts = ACTS.filter((a) => result.value?.build.equipment?.[a]).map((a) => ACT_NAMES[a]);
  const gear = acts.length
    ? ` Gear for ${acts.length > 1 ? `${acts.slice(0, -1).join(', ')} and ${acts.at(-1)}` : acts[0]}.`
    : ' No gear.';
  return `Level ${c.level}: ${classes}. ${c.subrace?.name ?? c.race?.name}, ${c.background?.name}, ${c.hitPoints} hit points.${gear}`;
});
const groupedNotes = computed(() => {
  const groups = new Map<string, string[]>();
  for (const note of result.value?.notes ?? []) {
    const title = note.act
      ? `${ACT_NAMES[note.act]} gear`
      : note.level
        ? `Level ${note.level}`
        : 'Character creation';
    groups.set(title, [...(groups.get(title) ?? []), note.message]);
  }
  return [...groups];
});
const left = computed(
  () => result.value?.issues.filter((i) => i.severity === 'warning').length ?? 0,
);
const problems = computed(
  () => result.value?.issues.filter((i) => i.severity === 'error').length ?? 0,
);
const rosterFull = computed(() => party.party.members.length >= MAX_ROSTER);

async function addToParty() {
  if (!result.value) return;
  const id = party.addImportedMember(result.value.name, result.value.build);
  dialog.value?.close();
  if (id) await router.push(memberPath(id));
}
</script>

<template>
  <dialog ref="dialog" class="import" aria-labelledby="import-heading">
    <template v-if="!result">
      <h2 id="import-heading">Import a build guide</h2>
      <form class="url" @submit.prevent="run({ url })">
        <label for="guide-url">Gamestegy guide link</label>
        <div class="row">
          <input
            id="guide-url"
            v-model="url"
            type="url"
            required
            placeholder="https://gamestegy.com/post/bg3/…"
            data-input="guide-url"
          />
          <button type="submit" class="primary" :disabled="busy" data-action="import-url">
            {{ busy ? 'Importing…' : 'Import' }}
          </button>
        </div>
      </form>

      <details>
        <summary>The link does not work? Paste the page instead</summary>
        <ol class="steps">
          <li>Open the guide in your browser.</li>
          <li>Open its page source (Ctrl+U, or ⌥⌘U on a Mac).</li>
          <li>Select everything, copy it, and paste it below.</li>
        </ol>
        <form @submit.prevent="run({ html })">
          <label for="guide-html" class="visually-hidden">Guide page source</label>
          <textarea id="guide-html" v-model="html" rows="5" data-input="guide-html" />
          <button type="submit" :disabled="busy || !html.trim()" data-action="import-html">
            Import pasted page
          </button>
        </form>
      </details>

      <p v-if="problem" class="problem" role="alert">{{ problem }}</p>
      <form method="dialog" class="close">
        <button type="submit">Cancel</button>
      </form>
    </template>

    <template v-else>
      <h2 id="import-heading">{{ result.name }}</h2>
      <p class="summary" data-summary>{{ summary }}</p>
      <p class="muted">
        <template v-if="problems">
          {{ problems }} {{ problems === 1 ? 'problem' : 'problems' }} to fix and
        </template>
        {{ left }} {{ left === 1 ? 'choice' : 'choices' }} left to make in the planner.
      </p>

      <section v-if="groupedNotes.length" class="notes" aria-label="Notes from the import">
        <h3>What the guide leaves to you</h3>
        <div v-for="[title, messages] in groupedNotes" :key="title" class="group">
          <h4>{{ title }}</h4>
          <ul>
            <li v-for="(message, i) in messages" :key="i">{{ message }}</li>
          </ul>
        </div>
      </section>

      <p class="muted small">
        These notes stay with the character, next to the levels and gear they are about.
      </p>

      <div class="actions">
        <button type="button" @click="result = null">Back</button>
        <button
          type="button"
          class="primary"
          data-action="add-imported"
          :disabled="rosterFull"
          @click="addToParty"
        >
          Add to party
        </button>
      </div>
      <p v-if="rosterFull" class="problem">The roster is full; remove someone first.</p>
    </template>
  </dialog>
</template>

<style scoped>
.import {
  width: min(640px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  border: 1px solid var(--rule);
  border-radius: var(--radius-panel);
  background: var(--ground);
  color: var(--ink);
  padding: 20px 22px;
}

.import::backdrop {
  background: rgb(10 12 18 / 0.45);
}

.import > * + * {
  margin-top: 14px;
}

p {
  margin: 0;
}

label {
  font-size: 0.875rem;
  color: var(--ink-muted);
}

.url {
  display: grid;
  gap: 6px;
}

.row {
  display: flex;
  gap: 6px;
}

input,
textarea {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-control);
  background: var(--surface);
  font: inherit;
}

textarea {
  width: 100%;
  font-size: 0.8125rem;
  margin: 6px 0;
}

summary {
  cursor: pointer;
  color: var(--accent);
}

.steps {
  margin: 8px 0;
  padding-left: 20px;
}

.problem {
  color: var(--error);
}

.summary {
  font-size: 1.05rem;
}

.notes {
  display: grid;
  gap: 10px;
  max-height: 45vh;
  overflow-y: auto;
  padding: 12px 14px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-panel);
  background: var(--surface);
}

h3 {
  font-size: 1rem;
}

h4 {
  font-size: 0.875rem;
  color: var(--ink-muted);
  margin: 0 0 2px;
}

ul {
  margin: 0;
  padding-left: 18px;
}

.small {
  font-size: 0.875rem;
}

.actions,
.close {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
