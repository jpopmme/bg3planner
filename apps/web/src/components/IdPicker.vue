<script setup lang="ts">
import type { ChoiceSlot } from '@bg3planner/rules';
import { computed, ref, useId } from 'vue';
import { choiceTarget } from '../lib/details';
import { optionName, pickCount } from '../lib/names';
import DetailsButton from './DetailsButton.vue';
import { useBuildStore } from '../stores/build';

const props = defineProps<{ choiceSlot: ChoiceSlot }>();
const store = useBuildStore();
const id = useId();

const count = computed(() => pickCount(props.choiceSlot.choice));
const single = computed(() => count.value === 1);
const selected = computed(() =>
  Array.isArray(props.choiceSlot.answer) ? props.choiceSlot.answer : [],
);
const offered = computed(() =>
  props.choiceSlot.options.kind === 'ids' ? props.choiceSlot.options.ids : [],
);
/** Picks no longer allowed (e.g. after an earlier change) stay visible so they can be removed. */
const invalid = computed(() => selected.value.filter((s) => !offered.value.includes(s)));

const query = ref('');
const searchable = computed(() => offered.value.length > 12);
const visible = computed(() => {
  const q = query.value.trim().toLowerCase();
  return offered.value.filter(
    (o) =>
      !q ||
      selected.value.includes(o) ||
      optionName(props.choiceSlot.choice, o).name.toLowerCase().includes(q),
  );
});

function update(next: string[]) {
  store.setAnswer(
    props.choiceSlot.characterLevel,
    props.choiceSlot.key,
    next.length ? next : undefined,
  );
}

function toggle(optionId: string, checked: boolean) {
  if (single.value) update(checked ? [optionId] : []);
  else if (checked) update([...selected.value, optionId]);
  else update(selected.value.filter((s) => s !== optionId));
}

const full = computed(() => selected.value.length >= count.value);

/** Spells known from elsewhere: shown greyed out, so a missing spell is explained. */
const knownElsewhere = computed(() => {
  const q = query.value.trim().toLowerCase();
  return (props.choiceSlot.alreadyKnown ?? []).filter(
    (k) => !q || optionName(props.choiceSlot.choice, k.id).name.toLowerCase().includes(q),
  );
});
</script>

<template>
  <fieldset class="picker" :data-slot="`${choiceSlot.characterLevel}:${choiceSlot.key}`">
    <legend>
      <span class="title">{{ choiceSlot.label }}</span>
      <span class="status" :class="{ done: selected.length === count && invalid.length === 0 }">
        {{ single ? (selected.length ? 'Chosen' : 'Choose 1') : `${selected.length} of ${count}` }}
      </span>
    </legend>

    <label v-if="searchable" class="search">
      <span class="visually-hidden">Filter {{ choiceSlot.label.toLowerCase() }}</span>
      <input v-model="query" type="search" placeholder="Filter by name" />
    </label>

    <ul class="options">
      <li v-for="optionId in invalid" :key="`invalid-${optionId}`" class="invalid">
        <label>
          <input type="checkbox" checked :value="optionId" @change="toggle(optionId, false)" />
          <span class="text">
            <span class="name">{{ optionName(choiceSlot.choice, optionId).name }}</span>
            <span class="detail">No longer allowed here</span>
          </span>
        </label>
      </li>
      <li v-for="optionId in visible" :key="optionId">
        <label :class="{ checked: selected.includes(optionId) }">
          <input
            :type="single ? 'radio' : 'checkbox'"
            :name="id"
            :value="optionId"
            :checked="selected.includes(optionId)"
            :disabled="!single && full && !selected.includes(optionId)"
            @change="toggle(optionId, ($event.target as HTMLInputElement).checked)"
          />
          <span class="text">
            <span class="name">{{ optionName(choiceSlot.choice, optionId).name }}</span>
            <span v-if="optionName(choiceSlot.choice, optionId).detail" class="detail">
              {{ optionName(choiceSlot.choice, optionId).detail }}
            </span>
          </span>
        </label>
        <DetailsButton
          v-if="choiceTarget(choiceSlot.choice, optionId)"
          icon
          :target="choiceTarget(choiceSlot.choice, optionId)!"
          :label="optionName(choiceSlot.choice, optionId).name"
        />
      </li>
      <li v-for="known in knownElsewhere" :key="`known-${known.id}`" class="known">
        <label>
          <input :type="single ? 'radio' : 'checkbox'" disabled :value="known.id" />
          <span class="text">
            <span class="name">{{ optionName(choiceSlot.choice, known.id).name }}</span>
            <span class="detail">Already known: {{ known.source }}</span>
          </span>
        </label>
      </li>
      <li
        v-if="visible.length === 0 && invalid.length === 0 && knownElsewhere.length === 0"
        class="empty"
      >
        {{ offered.length ? 'Nothing matches the filter.' : 'Nothing left to choose here.' }}
      </li>
    </ul>

    <button v-if="single && selected.length" type="button" class="clear" @click="update([])">
      Clear choice
    </button>
  </fieldset>
</template>

<style scoped>
.picker {
  border: 1px solid var(--rule);
  border-radius: var(--radius-panel);
  padding: 12px 14px 14px;
  margin: 0;
  min-width: 0;
  background: var(--surface);
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

.search input {
  width: 100%;
  margin: 4px 0 10px;
  padding: 6px 10px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-control);
  background: var(--ground);
}

.options {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 2px 12px;
  max-height: 320px;
  overflow-y: auto;
}

.options li {
  display: flex;
  gap: 4px;
  align-items: center;
}

.options li > :deep(.details-icon) {
  opacity: 0.75;
}

label {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 4px 6px;
  border-radius: var(--radius-control);
  cursor: pointer;
}

label.checked {
  background: var(--accent-soft);
}

input[type='checkbox'],
input[type='radio'] {
  accent-color: var(--accent);
  flex: none;
}

input:disabled + .text .name {
  color: var(--ink-muted);
}

.text {
  display: grid;
}

.detail {
  font-size: 0.8125rem;
  color: var(--ink-muted);
}

.invalid .name,
.invalid .detail {
  color: var(--error);
}

.known .name {
  color: var(--ink-muted);
}

.empty {
  color: var(--ink-muted);
  padding: 4px 6px;
}

.clear {
  margin-top: 8px;
  font-size: 0.875rem;
  padding: 3px 10px;
}
</style>
