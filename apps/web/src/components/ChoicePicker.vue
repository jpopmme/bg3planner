<script setup lang="ts">
import type { ChoiceSlot, Issue } from '@bg3planner/rules';
import AbilityPointsPicker from './AbilityPointsPicker.vue';
import IdPicker from './IdPicker.vue';
import IssueList from './IssueList.vue';
import ReplacePicker from './ReplacePicker.vue';

defineProps<{ choiceSlot: ChoiceSlot; issues: Issue[] }>();
</script>

<template>
  <div class="choice">
    <ReplacePicker v-if="choiceSlot.options.kind === 'replace'" :choice-slot="choiceSlot" />
    <AbilityPointsPicker
      v-else-if="choiceSlot.options.kind === 'abilities'"
      :choice-slot="choiceSlot"
    />
    <IdPicker v-else :choice-slot="choiceSlot" />
    <IssueList :issues="issues.filter((i) => i.severity === 'error')" />
  </div>
</template>

<style scoped>
.choice {
  display: grid;
  gap: 6px;
}
</style>
