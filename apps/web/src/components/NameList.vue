<script setup lang="ts">
import type { DetailsTarget } from '../lib/details';
import DetailsButton from './DetailsButton.vue';

/** Names separated by commas, each opening its details. */
defineProps<{ entries: { target: DetailsTarget; name: string }[] }>();
</script>

<template>
  <span class="names">
    <template v-for="(entry, i) in entries" :key="i">
      <!-- A name keeps its comma: lines may only break between entries. -->
      <span class="entry"
        ><DetailsButton :target="entry.target">{{ entry.name }}</DetailsButton
        ><template v-if="i < entries.length - 1">,</template></span
      >{{ ' ' }}
    </template>
  </span>
</template>

<style scoped>
.entry {
  white-space: nowrap;
}
</style>
