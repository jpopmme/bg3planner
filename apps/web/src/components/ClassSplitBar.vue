<script setup lang="ts">
import type { DerivedClass } from '@bg3planner/rules';
import { computed } from 'vue';
import { classColour } from '../lib/class-colours';

const props = defineProps<{ classes: DerivedClass[]; level: number }>();
const summary = computed(() => props.classes.map((c) => `${c.level} ${c.name}`).join(' / '));
</script>

<template>
  <div class="split">
    <div class="bar" role="img" :aria-label="`Level ${level}: ${summary}`">
      <span
        v-for="c in classes"
        :key="c.id"
        class="segment"
        :style="{ flexGrow: c.level, background: classColour(c.id) }"
      />
      <span v-if="level < 12" class="segment empty" :style="{ flexGrow: 12 - level }" />
    </div>
    <p class="legend">
      <span v-for="c in classes" :key="c.id" class="entry">
        <span class="swatch" :style="{ background: classColour(c.id) }" />
        {{ c.level }} {{ c.name }}<template v-if="c.subclass">, {{ c.subclass.name }}</template>
      </span>
    </p>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  gap: 3px;
  height: 10px;
}

.segment {
  border-radius: 3px;
  flex-basis: 0;
}

.segment.empty {
  background: repeating-linear-gradient(
    90deg,
    var(--rule) 0 calc(100% / 12 - 3px),
    transparent calc(100% / 12 - 3px) calc(100% / 12)
  );
  opacity: 0.6;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 8px 0 0;
}

.entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}
</style>
