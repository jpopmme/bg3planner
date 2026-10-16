<script setup lang="ts">
import type { ChoiceSlot } from '@bg3planner/rules';
import { computed, ref, useId } from 'vue';
import { spellName } from '../lib/names';
import { useBuildStore } from '../stores/build';

const props = defineProps<{ choiceSlot: ChoiceSlot }>();
const store = useBuildStore();
const id = useId();

const swap = computed(() =>
  props.choiceSlot.answer &&
  !Array.isArray(props.choiceSlot.answer) &&
  'from' in props.choiceSlot.answer
    ? (props.choiceSlot.answer as { from: string; to: string })
    : undefined,
);
const known = computed(() =>
  props.choiceSlot.options.kind === 'replace' ? props.choiceSlot.options.from : [],
);
const replacements = computed(() =>
  props.choiceSlot.options.kind === 'replace' ? props.choiceSlot.options.to : [],
);
/** Spells the character knows already cannot be learned again; listed so their absence is clear. */
const knownElsewhere = computed(() => props.choiceSlot.alreadyKnown ?? []);

/** The spell picked to replace, held here until its replacement is picked too. */
const pendingFrom = ref('');
const from = computed(() => swap.value?.from ?? pendingFrom.value);

function setFrom(value: string) {
  pendingFrom.value = value;
  if (swap.value) store.setAnswer(props.choiceSlot.characterLevel, props.choiceSlot.key, undefined);
}

function setTo(value: string) {
  if (!from.value || !value) return;
  store.setAnswer(props.choiceSlot.characterLevel, props.choiceSlot.key, {
    from: from.value,
    to: value,
  });
}

function clear() {
  pendingFrom.value = '';
  store.setAnswer(props.choiceSlot.characterLevel, props.choiceSlot.key, undefined);
}
</script>

<template>
  <fieldset class="replace" :data-slot="`${choiceSlot.characterLevel}:${choiceSlot.key}`">
    <legend>
      <span class="title">{{ choiceSlot.label }}</span>
      <span class="muted">Optional</span>
    </legend>
    <div class="row">
      <label :for="`${id}-from`">Replace</label>
      <select
        :id="`${id}-from`"
        name="from"
        :value="from"
        :disabled="known.length === 0"
        @change="setFrom(($event.target as HTMLSelectElement).value)"
      >
        <option value="">
          {{ known.length ? 'Keep all spells' : 'No spells to replace yet' }}
        </option>
        <option v-for="spellId in known" :key="spellId" :value="spellId">
          {{ spellName(spellId).name }}
        </option>
      </select>
      <label :for="`${id}-to`">with</label>
      <select
        :id="`${id}-to`"
        name="to"
        :value="swap?.to ?? ''"
        :disabled="!from"
        @change="setTo(($event.target as HTMLSelectElement).value)"
      >
        <option value="">Choose a spell</option>
        <option v-for="spellId in replacements" :key="spellId" :value="spellId">
          {{ spellName(spellId).name }} ({{ spellName(spellId).detail }})
        </option>
        <optgroup v-if="knownElsewhere.length" label="Already known">
          <option v-for="spell in knownElsewhere" :key="spell.id" :value="spell.id" disabled>
            {{ spellName(spell.id).name }} ({{ spell.source }})
          </option>
        </optgroup>
      </select>
      <button v-if="from" type="button" @click="clear">Keep all spells</button>
    </div>
  </fieldset>
</template>

<style scoped>
.replace {
  border: 1px dashed var(--rule);
  border-radius: var(--radius-panel);
  padding: 10px 14px 12px;
  margin: 0;
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

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

select {
  max-width: 100%;
}
</style>
