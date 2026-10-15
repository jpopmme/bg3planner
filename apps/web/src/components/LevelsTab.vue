<script setup lang="ts">
import { gameData } from '@bg3planner/gamedata';
import { MAX_LEVEL } from '@bg3planner/shared';
import { computed, ref, watch } from 'vue';
import { useBuildStore } from '../stores/build';
import LevelRow from './LevelRow.vue';

const store = useBuildStore();
const levels = computed(() => store.build.levels.length);
const nextClass = ref(store.build.levels.at(-1)?.classId ?? 'fighter');
watch(levels, () => (nextClass.value = store.build.levels.at(-1)?.classId ?? nextClass.value));
</script>

<template>
  <div class="levels">
    <ol>
      <LevelRow v-for="level in levels" :key="level" :level="level" />
    </ol>

    <div class="controls">
      <template v-if="levels < MAX_LEVEL">
        <label>
          <span class="visually-hidden">Class for level {{ levels + 1 }}</span>
          <select v-model="nextClass" name="next-class">
            <option v-for="c in gameData.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <button
          type="button"
          class="primary"
          data-action="add-level"
          @click="store.addLevel(nextClass)"
        >
          Add level {{ levels + 1 }}
        </button>
      </template>
      <p v-else class="muted">Level {{ MAX_LEVEL }} is the highest level in the game.</p>
      <button
        v-if="levels > 1"
        type="button"
        data-action="remove-level"
        @click="store.removeLastLevel()"
      >
        Remove level {{ levels }}
      </button>
    </div>
  </div>
</template>

<style scoped>
ol {
  list-style: none;
  margin: 0;
  padding: 0;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 12px 0 0 46px;
}

.controls p {
  margin: 0;
}
</style>
