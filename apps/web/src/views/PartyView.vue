<script setup lang="ts">
import { gameData } from '@bg3planner/gamedata';
import { MAX_ACTIVE, MAX_ROSTER, deriveCharacter, partyIssues } from '@bg3planner/rules';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import ImportDialog from '../components/ImportDialog.vue';
import IssueList from '../components/IssueList.vue';
import MemberCard from '../components/MemberCard.vue';
import PartyOverview from '../components/PartyOverview.vue';
import SaveBar from '../components/SaveBar.vue';
import { usePartyPaths } from '../lib/party-routes';
import { usePartyStore } from '../stores/party';

const party = usePartyStore();
const router = useRouter();
const { memberPath } = usePartyPaths();

const shown = computed(() => party.shownParty);
const byId = (id: string) => shown.value.members.find((m) => m.id === id);
const active = computed(() => shown.value.activeMemberIds.map(byId).filter((m) => m !== undefined));
const camp = computed(() =>
  shown.value.members.filter((m) => !shown.value.activeMemberIds.includes(m.id)),
);
const full = computed(() => shown.value.activeMemberIds.length >= MAX_ACTIVE);
const issues = computed(() =>
  partyIssues(shown.value, gameData).map((i) => ({ ...i, characterLevel: 1 })),
);
const activeCharacters = computed(() =>
  active.value.map((member) => ({ member, character: deriveCharacter(member.build, gameData) })),
);

const newOrigin = ref('custom');
const importDialog = ref<InstanceType<typeof ImportDialog>>();
const rosterFull = computed(() => party.party.members.length >= MAX_ROSTER);

async function addCharacter() {
  const id = party.addMember(newOrigin.value);
  if (!id) return;
  newOrigin.value = 'custom';
  await router.push(memberPath(id));
}

function startOver() {
  const message = party.remote
    ? 'Start a new party? The online copy stays at its links, but this device stops editing it.'
    : 'Start a new party? Every character on this device will be cleared.';
  if (confirm(message)) party.startOver();
}
</script>

<template>
  <div class="party">
    <header class="heading">
      <label class="name">
        <span class="visually-hidden">Party name</span>
        <input
          :value="shown.name"
          :readonly="party.readOnly"
          placeholder="Name your party"
          autocomplete="off"
          data-input="party-name"
          @input="party.setPartyName(($event.target as HTMLInputElement).value)"
        />
      </label>
      <div v-if="!party.readOnly" class="header-actions">
        <SaveBar />
        <button type="button" class="new-party" @click="startOver">New party</button>
      </div>
    </header>

    <IssueList :issues="issues" />

    <section aria-labelledby="active-heading">
      <h2 id="active-heading">
        In the party <span class="muted count">{{ active.length }} of {{ MAX_ACTIVE }}</span>
      </h2>
      <div class="slots">
        <MemberCard
          v-for="member in active"
          :key="member.id"
          :member="member"
          :active="true"
          :party-full="full"
        />
        <div v-for="n in MAX_ACTIVE - active.length" :key="`empty-${n}`" class="empty-slot">
          Empty place
        </div>
      </div>
    </section>

    <section aria-labelledby="camp-heading">
      <h2 id="camp-heading">At camp</h2>
      <div v-if="camp.length" class="slots">
        <MemberCard
          v-for="member in camp"
          :key="member.id"
          :member="member"
          :active="false"
          :party-full="full"
        />
      </div>
      <p v-else class="muted">Nobody is waiting at camp.</p>

      <form v-if="!party.readOnly" class="add" @submit.prevent="addCharacter">
        <label>
          <span>Add a character</span>
          <select v-model="newOrigin" name="new-origin" :disabled="rosterFull">
            <option
              v-for="o in gameData.origins"
              :key="o.id"
              :value="o.id"
              :disabled="party.takenOrigins.has(o.id)"
            >
              {{ o.name }}{{ party.takenOrigins.has(o.id) ? ' (already in the roster)' : '' }}
            </option>
          </select>
        </label>
        <button type="submit" class="primary" data-action="add-character" :disabled="rosterFull">
          Add character
        </button>
        <button
          type="button"
          data-action="import-guide"
          :disabled="rosterFull"
          @click="importDialog?.open()"
        >
          Import from a guide
        </button>
        <p v-if="rosterFull" class="muted">The roster holds at most {{ MAX_ROSTER }} characters.</p>
      </form>
    </section>

    <PartyOverview :members="activeCharacters" />
    <ImportDialog ref="importDialog" />
  </div>
</template>

<style scoped>
.party {
  display: grid;
  gap: 36px;
  max-width: 1240px;
  margin: 0 auto;
  padding: 28px 24px 64px;
}

.heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.name {
  flex: 1;
  min-width: 0;
}

.name input {
  width: 100%;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-family: var(--font-name);
  font-weight: 500;
  font-size: clamp(2.2rem, 5vw, 3.4rem);
  line-height: 1.1;
  padding: 0;
}

.name input:hover:not([readonly]),
.name input:focus {
  border-bottom-color: var(--rule);
  outline: none;
}

.name input:focus-visible {
  border-bottom-color: var(--accent);
}

.header-actions {
  display: flex;
  gap: 6px;
  align-items: flex-end;
}

section {
  display: grid;
  gap: 14px;
}

section > p {
  margin: 0;
}

.count {
  font-weight: 400;
  font-size: 1rem;
  margin-left: 6px;
}

.slots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 14px;
}

.empty-slot {
  display: grid;
  place-items: center;
  min-height: 150px;
  border: 1px dashed var(--rule);
  border-radius: var(--radius-panel);
  color: var(--ink-muted);
}

.add {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  align-items: flex-end;
}

.add label {
  display: grid;
  gap: 4px;
}

.add label span {
  font-size: 0.875rem;
  color: var(--ink-muted);
}

.add p {
  margin: 0;
  flex-basis: 100%;
}

@media (max-width: 860px) {
  .party {
    padding: 20px 16px 48px;
    gap: 28px;
  }

  .heading {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
