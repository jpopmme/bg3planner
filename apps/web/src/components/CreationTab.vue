<script setup lang="ts">
import { gameData } from '@bg3planner/gamedata';
import { computed } from 'vue';
import { useBuildStore } from '../stores/build';
import { usePartyStore } from '../stores/party';
import AbilityScores from './AbilityScores.vue';
import ChoicePicker from './ChoicePicker.vue';
import IssueList from './IssueList.vue';
import SourceNotes from './SourceNotes.vue';

const store = useBuildStore();
const party = usePartyStore();
const race = computed(() => gameData.races.find((r) => r.id === store.build.raceId));

const isCreationKey = (key?: string) => !!key && /^(race|subrace):/.test(key);
const slots = computed(() =>
  store.choices.filter((c) => c.characterLevel === 1 && isCreationKey(c.key)),
);
/** Level-1 issues about race, background or abilities; pickers show their own status. */
const issues = computed(() =>
  store.issues.filter((i) => i.characterLevel === 1 && i.key === undefined),
);
const slotIssues = (key: string) =>
  store.issues.filter((i) => i.characterLevel === 1 && i.key === key);
</script>

<template>
  <div class="creation">
    <SourceNotes v-if="store.build.source" :source="store.build.source" />
    <IssueList :issues="issues" />

    <div class="fields">
      <label class="field">
        <span>Origin</span>
        <select
          name="origin"
          :value="store.origin.id"
          @change="store.setOrigin(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="o in gameData.origins"
            :key="o.id"
            :value="o.id"
            :disabled="o.id !== store.origin.id && party.takenOrigins.has(o.id)"
          >
            {{ o.name }}
          </option>
        </select>
      </label>
      <label class="field">
        <span>Name</span>
        <input v-model="store.name" type="text" placeholder="Tav" autocomplete="off" />
      </label>
      <label class="field">
        <span>Race</span>
        <select
          name="race"
          :disabled="store.locks.race"
          :value="store.build.raceId"
          @change="store.setRace(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="r in gameData.races" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
      </label>
      <label v-if="race && race.subraces.length" class="field">
        <span>Subrace</span>
        <select
          name="subrace"
          :disabled="store.locks.race"
          :value="store.build.subraceId ?? ''"
          @change="store.setSubrace(($event.target as HTMLSelectElement).value || undefined)"
        >
          <option value="" disabled>Choose a subrace</option>
          <option v-for="s in race.subraces" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </label>
      <label class="field">
        <span>Background</span>
        <select
          name="background"
          :disabled="store.locks.background"
          :value="store.build.backgroundId"
          @change="store.setBackground(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="b in gameData.backgrounds" :key="b.id" :value="b.id">
            {{ b.name }}{{ b.darkUrgeOnly ? ' (Dark Urge only)' : '' }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="store.locks.race || store.locks.background" class="muted lock-note">
      {{ store.origin.name }} always has this
      {{
        store.locks.race && store.locks.background
          ? 'race and background'
          : store.locks.race
            ? 'race'
            : 'background'
      }}. Class and everything else can change.
    </p>

    <ChoicePicker
      v-for="slot in slots"
      :key="slot.key"
      :choice-slot="slot"
      :issues="slotIssues(slot.key)"
    />

    <AbilityScores />
  </div>
</template>

<style scoped>
.creation {
  display: grid;
  gap: 24px;
}

.fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px 16px;
}

.field {
  display: grid;
  gap: 4px;
}

.field span {
  font-size: 0.875rem;
  color: var(--ink-muted);
}

.lock-note {
  margin: -12px 0 0;
  font-size: 0.875rem;
}

.field input {
  padding: 6px 10px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-control);
  background: var(--surface);
}
</style>
