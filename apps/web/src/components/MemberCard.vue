<script setup lang="ts">
import { gameData } from '@bg3planner/gamedata';
import { type PartyMember, deriveCharacter, validateBuild } from '@bg3planner/rules';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { classColour } from '../lib/class-colours';
import { usePartyPaths } from '../lib/party-routes';
import { usePartyStore } from '../stores/party';

const props = defineProps<{ member: PartyMember; active: boolean; partyFull: boolean }>();
const party = usePartyStore();
const { memberPath } = usePartyPaths();

const character = computed(() => deriveCharacter(props.member.build, gameData));
const issues = computed(() => validateBuild(props.member.build, gameData));
const errors = computed(() => issues.value.filter((i) => i.severity === 'error').length);
const todo = computed(() => issues.value.filter((i) => i.severity === 'warning').length);

const isCustom = computed(() => (character.value.origin?.id ?? 'custom') === 'custom');
const classes = computed(() =>
  character.value.classes.map((c) => `${c.level} ${c.subclass?.name ?? c.name}`).join(', '),
);
const identity = computed(() =>
  [
    isCustom.value ? undefined : character.value.origin?.name,
    character.value.subrace?.name ?? character.value.race?.name,
    character.value.background?.name,
  ]
    .filter((part, i, all) => part && all.indexOf(part) === i && part !== props.member.name)
    .join(', '),
);

function remove() {
  if (confirm(`Remove ${props.member.name || 'this character'} from the roster?`)) {
    party.removeMember(props.member.id);
  }
}
</script>

<template>
  <article class="card" :data-member="member.id" :aria-label="member.name || 'Unnamed character'">
    <div class="classes" aria-hidden="true">
      <span
        v-for="c in character.classes"
        :key="c.id"
        :style="{ flexGrow: c.level, background: classColour(c.id) }"
      />
      <span
        v-if="character.level < 12"
        class="unused"
        :style="{ flexGrow: 12 - character.level }"
      />
    </div>

    <h3>
      <RouterLink :to="memberPath(member.id)" data-action="open">
        {{ member.name || 'Unnamed character' }}
      </RouterLink>
    </h3>
    <p class="muted identity">{{ identity }}</p>
    <p>Level {{ character.level }}: {{ classes }}</p>
    <p class="muted">{{ character.hitPoints }} hit points</p>
    <p class="state" :class="{ error: errors, warning: !errors && todo }">
      <template v-if="errors">{{ errors }} {{ errors === 1 ? 'problem' : 'problems' }}</template>
      <template v-else-if="todo">{{ todo }} {{ todo === 1 ? 'choice' : 'choices' }} left</template>
      <template v-else>Every choice is made</template>
    </p>

    <div v-if="!party.readOnly" class="actions">
      <button
        type="button"
        data-action="toggle-active"
        :disabled="!active && partyFull"
        :title="!active && partyFull ? 'The party is full; send someone to camp first.' : undefined"
        @click="party.toggleActive(member.id)"
      >
        {{ active ? 'Send to camp' : 'Add to party' }}
      </button>
      <button
        v-if="isCustom"
        type="button"
        data-action="duplicate"
        @click="party.duplicateMember(member.id)"
      >
        Duplicate
      </button>
      <button
        type="button"
        class="danger"
        data-action="remove"
        :disabled="party.party.members.length <= 1"
        @click="remove"
      >
        Remove
      </button>
    </div>
  </article>
</template>

<style scoped>
.card {
  display: grid;
  gap: 4px;
  align-content: start;
  padding: 14px 16px 16px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-panel);
  background: var(--surface);
}

.card p {
  margin: 0;
}

.classes {
  display: flex;
  gap: 2px;
  height: 6px;
  margin-bottom: 8px;
}

.classes span {
  border-radius: 2px;
  flex-basis: 0;
}

.classes .unused {
  background: var(--rule);
  opacity: 0.6;
}

h3 {
  font-family: var(--font-name);
  font-weight: 500;
  font-size: 1.6rem;
  line-height: 1.1;
}

h3 a {
  color: inherit;
  text-decoration: none;
}

h3 a:hover {
  text-decoration: underline;
  text-decoration-thickness: 1px;
}

.identity {
  font-size: 0.9375rem;
}

.state {
  font-size: 0.875rem;
  color: var(--ink-muted);
}

.state.warning {
  color: var(--warning);
}

.state.error {
  color: var(--error);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.actions button {
  font-size: 0.875rem;
  padding: 4px 10px;
}

.danger {
  color: var(--error);
}
</style>
