<script setup lang="ts">
import {
  POINT_BUY_BUDGET,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  pointBuyCost,
  pointBuySpent,
} from '@bg3planner/rules';
import { ABILITIES, type Ability, abilityModifier } from '@bg3planner/shared';
import { computed } from 'vue';
import { titleCase } from '../lib/names';
import { useBuildStore } from '../stores/build';

const store = useBuildStore();
const base = computed(() => store.build.abilities.base);
const bonus = computed(() => store.build.abilities.racialBonus);
const remaining = computed(() => POINT_BUY_BUDGET - pointBuySpent(base.value));

const canRaise = (ability: Ability) => {
  const score = base.value[ability];
  return score < POINT_BUY_MAX && pointBuyCost(score + 1) - pointBuyCost(score) <= remaining.value;
};

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
</script>

<template>
  <section class="abilities" aria-labelledby="abilities-heading">
    <div class="heading">
      <h2 id="abilities-heading">Ability scores</h2>
      <p :class="remaining === 0 ? 'muted' : 'left'">
        {{ remaining }} of {{ POINT_BUY_BUDGET }} points left
      </p>
    </div>
    <table>
      <thead>
        <tr>
          <th scope="col">Ability</th>
          <th scope="col">Base</th>
          <th scope="col">+2</th>
          <th scope="col">+1</th>
          <th scope="col">Score</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ability in ABILITIES" :key="ability" :data-ability="ability">
          <th scope="row">{{ titleCase(ability) }}</th>
          <td class="stepper">
            <button
              type="button"
              :aria-label="`Lower base ${ability}`"
              :disabled="base[ability] <= POINT_BUY_MIN"
              data-step="-1"
              @click="store.setBaseScore(ability, base[ability] - 1)"
            >
              −
            </button>
            <output>{{ base[ability] }}</output>
            <button
              type="button"
              :aria-label="`Raise base ${ability}`"
              :disabled="!canRaise(ability)"
              data-step="1"
              @click="store.setBaseScore(ability, base[ability] + 1)"
            >
              +
            </button>
          </td>
          <td v-for="amount in [2, 1] as const" :key="amount">
            <label>
              <span class="visually-hidden">+{{ amount }} to {{ ability }}</span>
              <input
                type="radio"
                :name="`racial-${amount}`"
                :value="ability"
                :checked="bonus[ability] === amount"
                @change="store.setRacialBonus(ability, amount)"
              />
            </label>
          </td>
          <td class="score">
            <strong>{{ store.bareCharacter.abilityScores[ability] }}</strong>
            <span class="muted">{{
              signed(abilityModifier(store.bareCharacter.abilityScores[ability]))
            }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="muted note">
      Every race adds +2 to one ability and +1 to another. Scores shown include feats taken later,
      but not gear.
    </p>
  </section>
</template>

<style scoped>
.heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 8px;
}

.heading p {
  margin: 0;
}

.left {
  color: var(--warning);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 5px 6px;
  text-align: center;
  border-bottom: 1px solid var(--rule);
}

th[scope='row'],
thead th:first-child {
  text-align: left;
}

thead th {
  font-weight: 400;
  color: var(--ink-muted);
  font-size: 0.875rem;
}

.stepper {
  white-space: nowrap;
}

.stepper button {
  width: 28px;
  padding: 1px 0;
}

.stepper output {
  display: inline-block;
  width: 2.2em;
}

input[type='radio'] {
  accent-color: var(--accent);
}

.score {
  white-space: nowrap;
}

.score .muted {
  margin-left: 6px;
}

.note {
  font-size: 0.875rem;
  margin: 8px 0 0;
}
</style>
