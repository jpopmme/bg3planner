<script setup lang="ts">
import { gameData } from '@bg3planner/gamedata';
import { computed, ref } from 'vue';
import { classColour } from '../lib/class-colours';
import { useBuildStore } from '../stores/build';
import ChoicePicker from './ChoicePicker.vue';
import IssueList from './IssueList.vue';

const props = defineProps<{ level: number }>();
const store = useBuildStore();

const entry = computed(() => store.build.levels[props.level - 1]!);
const cls = computed(() => gameData.classes.find((c) => c.id === entry.value.classId));
const classLevel = computed(
  () =>
    store.build.levels.slice(0, props.level).filter((l) => l.classId === entry.value.classId)
      .length,
);
const subclass = computed(() => {
  const id = store.character.classes.find((c) => c.id === entry.value.classId)?.subclass?.id;
  return gameData.subclasses.find((s) => s.id === id);
});

const isCreationKey = (key: string) => /^(race|subrace):/.test(key);
const slots = computed(() =>
  store.choices.filter((c) => c.characterLevel === props.level && !isCreationKey(c.key)),
);
const issues = computed(() =>
  store.issues.filter(
    (i) => i.characterLevel === props.level && i.key !== undefined && !isCreationKey(i.key),
  ),
);
const errors = computed(() => issues.value.filter((i) => i.severity === 'error').length);
const todo = computed(() => issues.value.filter((i) => i.severity === 'warning').length);
/** Issues not tied to a picker shown in this row (e.g. an answer to a choice that is gone). */
const looseIssues = computed(() =>
  issues.value.filter((i) => !slots.value.some((s) => s.key === i.key)),
);
const slotIssues = (key: string) => issues.value.filter((i) => i.key === key);
/** Starts open while the level needs attention; afterwards the player decides. */
const open = ref(errors.value > 0 || todo.value > 0);

/** Features this class level (and its subclass level) grants. */
const features = computed(() =>
  [
    ...(cls.value?.levels[classLevel.value - 1]?.features ?? []),
    ...(subclass.value?.levels.find((l) => l.level === classLevel.value)?.features ?? []),
  ].map((id) => gameData.features.find((f) => f.id === id)?.name ?? id),
);
</script>

<template>
  <li class="level" :style="{ '--class-colour': classColour(entry.classId) }" :data-level="level">
    <details :open="open" @toggle="open = ($event.target as HTMLDetailsElement).open">
      <summary>
        <span class="marker" aria-hidden="true">{{ level }}</span>
        <span class="heading">
          <span class="visually-hidden">Level {{ level }}:</span>
          <strong>{{ cls?.name ?? entry.classId }} {{ classLevel }}</strong>
          <span v-if="subclass" class="muted">{{ subclass.name }}</span>
        </span>
        <span v-if="errors" class="badge error"
          >{{ errors }} {{ errors === 1 ? 'problem' : 'problems' }}</span
        >
        <span v-if="todo" class="badge warning">{{ todo }} to choose</span>
      </summary>

      <div class="body">
        <label class="class-select">
          <span>Class</span>
          <select
            name="class"
            :value="entry.classId"
            @change="store.setLevelClass(level - 1, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="c in gameData.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>

        <p v-if="features.length" class="features">
          <span class="muted">Gains</span>
          {{ features.join(', ') }}
        </p>

        <IssueList :issues="looseIssues" />

        <ChoicePicker
          v-for="slot in slots"
          :key="slot.key"
          :choice-slot="slot"
          :issues="slotIssues(slot.key)"
        />

        <p v-if="slots.length === 0 && features.length === 0" class="muted">
          Nothing to choose at this level.
        </p>
      </div>
    </details>
  </li>
</template>

<style scoped>
.level {
  position: relative;
  padding-left: 46px;
}

/* The rung line joining level markers. */
.level::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--class-colour);
  opacity: 0.35;
}

summary {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 0;
  cursor: pointer;
  list-style: none;
}

summary::-webkit-details-marker {
  display: none;
}

.marker {
  position: absolute;
  left: 0;
  width: 33px;
  height: 33px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--class-colour);
  color: #fff;
  font-weight: 700;
}

.heading {
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.badge {
  font-size: 0.8125rem;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid currentColor;
}

.badge.error {
  color: var(--error);
}

.badge.warning {
  color: var(--warning);
}

.body {
  display: grid;
  gap: 14px;
  padding: 2px 0 22px;
}

.class-select {
  display: flex;
  gap: 8px;
  align-items: center;
}

.class-select span {
  color: var(--ink-muted);
  font-size: 0.875rem;
}

.features {
  margin: 0;
}
</style>
