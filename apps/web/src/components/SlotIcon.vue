<script setup lang="ts">
import type { EquipSlot } from '@bg3planner/rules';
import { SLOT_ICONS } from '../lib/icons';

defineProps<{ name: EquipSlot }>();
</script>

<template>
  <svg
    class="slot-icon"
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="d in SLOT_ICONS[name]" :key="d" :d="d" />
  </svg>
</template>

<style scoped>
.slot-icon {
  flex: none;
}
</style>
