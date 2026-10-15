<script setup lang="ts">
import type { DerivedCharacter, PartyMember } from '@bg3planner/rules';
import { summariseParty } from '@bg3planner/rules';
import { ABILITIES, SKILL_ABILITIES, SKILLS, type Skill } from '@bg3planner/shared';
import { computed } from 'vue';
import { titleCase } from '../lib/names';

const props = defineProps<{ members: { member: PartyMember; character: DerivedCharacter }[] }>();

const summary = computed(() =>
  summariseParty(props.members.map((m) => ({ id: m.member.id, character: m.character }))),
);
const names = computed(() =>
  Object.fromEntries(props.members.map((m) => [m.member.id, m.member.name || 'Unnamed'])),
);

/** Skills grouped by ability, in character-sheet order. */
const skillRows = computed(() =>
  ABILITIES.flatMap((ability) => SKILLS.filter((s) => SKILL_ABILITIES[s] === ability)),
);

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
/** Marked only when someone is ahead; a tie across the whole party says nothing. */
const isBest = (memberIds: string[], id: string) =>
  memberIds.length < props.members.length && memberIds.includes(id);
const skillAbility = (skill: Skill) => titleCase(SKILL_ABILITIES[skill]).slice(0, 3);
</script>

<template>
  <section v-if="summary" class="overview" aria-labelledby="overview-heading">
    <h2 id="overview-heading">Who rolls best</h2>
    <p class="muted intro">
      Bonuses of the active party, before gear. Whoever is ahead on a check is marked, so you know
      who should try it.
    </p>

    <p v-if="summary.withoutDarkvision.length" class="darkvision">
      Without darkvision:
      {{ summary.withoutDarkvision.map((id) => names[id]).join(', ') }}. Bring light, or a party
      member who can see in the dark.
    </p>

    <div class="tables">
      <div class="scroll">
        <table>
          <caption class="visually-hidden">
            Skill check bonuses
          </caption>
          <thead>
            <tr>
              <th scope="col">Skill</th>
              <th v-for="m in members" :key="m.member.id" scope="col">{{ names[m.member.id] }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="skill in skillRows" :key="skill">
              <th scope="row">
                {{ titleCase(skill) }} <span class="muted">{{ skillAbility(skill) }}</span>
              </th>
              <td
                v-for="m in members"
                :key="m.member.id"
                :class="{ best: isBest(summary.skills[skill].memberIds, m.member.id) }"
              >
                {{ signed(m.character.skillBonuses[skill]) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="scroll">
        <table>
          <caption class="visually-hidden">
            Saving throw bonuses
          </caption>
          <thead>
            <tr>
              <th scope="col">Saving throw</th>
              <th v-for="m in members" :key="m.member.id" scope="col">{{ names[m.member.id] }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ability in ABILITIES" :key="ability">
              <th scope="row">{{ titleCase(ability) }}</th>
              <td
                v-for="m in members"
                :key="m.member.id"
                :class="{
                  best: isBest(summary.savingThrows[ability].memberIds, m.member.id),
                  proficient: m.character.savingThrows.includes(ability),
                }"
              >
                {{ signed(m.character.savingThrowBonuses[ability]) }}
              </td>
            </tr>
          </tbody>
        </table>
        <p class="muted note">Underlined: proficient in that saving throw.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.overview {
  display: grid;
  gap: 10px;
}

.overview p {
  margin: 0;
}

.intro {
  max-width: 70ch;
}

.darkvision {
  color: var(--warning);
}

.tables {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 24px;
  align-items: start;
}

.scroll {
  overflow-x: auto;
}

table {
  border-collapse: collapse;
  width: 100%;
}

th,
td {
  padding: 4px 10px;
  border-bottom: 1px solid var(--rule);
  text-align: center;
  white-space: nowrap;
}

th[scope='row'],
thead th:first-child {
  text-align: left;
}

thead th {
  font-weight: 700;
  font-size: 0.875rem;
}

th[scope='row'] {
  font-weight: 400;
}

th[scope='row'] .muted {
  font-size: 0.8125rem;
}

td.best {
  background: var(--accent-soft);
  font-weight: 700;
}

td.proficient {
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}

.note {
  font-size: 0.8125rem;
  margin-top: 6px !important;
}

@media (max-width: 860px) {
  .tables {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
