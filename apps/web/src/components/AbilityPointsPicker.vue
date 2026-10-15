<script setup lang="ts">
import type { ChoiceSlot } from '@bg3planner/rules';
import type { Ability } from '@bg3planner/shared';
import { computed } from 'vue';
import { titleCase } from '../lib/names';
import { useBuildStore } from '../stores/build';

const props = defineProps<{ choiceSlot: ChoiceSlot }>();
const store = useBuildStore();

const choice = computed(() =>
  props.choiceSlot.choice.type === 'ability-increase' ? props.choiceSlot.choice : undefined,
);
const abilities = computed(() =>
  props.choiceSlot.options.kind === 'abilities' ? props.choiceSlot.options.abilities : [],
);
const points = computed<Partial<Record<Ability, number>>>(() =>
  props.choiceSlot.answer &&
  !Array.isArray(props.choiceSlot.answer) &&
  !('from' in props.choiceSlot.answer)
    ? (props.choiceSlot.answer as Partial<Record<Ability, number>>)
    : {},
);
const spent = computed(() => Object.values(points.value).reduce((a, b) => a + (b ?? 0), 0));
const total = computed(() => choice.value?.points ?? 0);

function change(ability: Ability, delta: number) {
  const next = { ...points.value, [ability]: (points.value[ability] ?? 0) + delta };
  if (!next[ability]) delete next[ability];
  store.setAnswer(
    props.choiceSlot.characterLevel,
    props.choiceSlot.key,
    Object.keys(next).length ? next : undefined,
  );
}

function canRaise(ability: Ability) {
  return (
    spent.value < total.value &&
    (points.value[ability] ?? 0) < (choice.value?.maxPerAbility ?? 0) &&
    store.character.abilityScores[ability] < 20
  );
}
</script>

<template>
  <fieldset class="points" :data-slot="`${choiceSlot.characterLevel}:${choiceSlot.key}`">
    <legend>
      <span class="title">{{ choiceSlot.label }}</span>
      <span class="status" :class="{ done: spent === total }">{{ spent }} of {{ total }}</span>
    </legend>
    <ul>
      <li v-for="ability in abilities" :key="ability">
        <span class="name">{{ titleCase(ability) }}</span>
        <span class="score muted">{{ store.character.abilityScores[ability] }}</span>
        <button
          type="button"
          :aria-label="`Remove a point from ${ability}`"
          :disabled="!points[ability]"
          :data-ability="ability"
          data-step="-1"
          @click="change(ability, -1)"
        >
          −
        </button>
        <output :aria-label="`Points on ${ability}`">+{{ points[ability] ?? 0 }}</output>
        <button
          type="button"
          :aria-label="`Add a point to ${ability}`"
          :disabled="!canRaise(ability)"
          :data-ability="ability"
          data-step="1"
          @click="change(ability, 1)"
        >
          +
        </button>
      </li>
    </ul>
  </fieldset>
</template>

<style scoped>
.points {
  border: 1px solid var(--rule);
  border-radius: var(--radius-panel);
  padding: 12px 14px 14px;
  margin: 0;
  background: var(--surface);
  min-width: 0;
}

legend {
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding: 0 6px;
  margin-left: -6px;
}

.title {
  font-weight: 700;
}

.status {
  font-size: 0.875rem;
  color: var(--warning);
}

.status.done {
  color: var(--ink-muted);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 6px 16px;
}

li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name {
  flex: 1;
}

button {
  width: 30px;
  padding: 2px 0;
}

output {
  min-width: 2.2em;
  text-align: center;
}
</style>
