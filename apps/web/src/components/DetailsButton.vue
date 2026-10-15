<script setup lang="ts">
import { computed } from 'vue';
import { type DetailsTarget, detailsKey } from '../lib/details';
import { useDetailsStore } from '../stores/details';

/**
 * A name that opens its details card. `icon` shows a small "i" button instead of the name, for
 * places where the name itself already does something (a picker option).
 */
const props = defineProps<{ target: DetailsTarget; icon?: boolean; label?: string }>();
const details = useDetailsStore();
const open = computed(
  () => details.target !== null && detailsKey(details.target) === detailsKey(props.target),
);

function toggle(event: MouseEvent) {
  if (open.value) details.close();
  else void details.open(props.target, event.currentTarget as HTMLElement);
}
</script>

<template>
  <button
    type="button"
    :class="icon ? 'details-icon' : 'details-term'"
    :aria-expanded="open"
    aria-haspopup="dialog"
    :aria-label="icon ? `About ${label}` : undefined"
    :data-details="detailsKey(target)"
    @click="toggle"
  >
    <template v-if="icon">i</template>
    <slot v-else />
  </button>
</template>

<style scoped>
/* Reads as text with a dotted underline: everything named can be asked about. */
.details-term {
  all: unset;
  cursor: pointer;
  text-decoration: underline dotted;
  text-decoration-color: var(--ink-muted);
  text-underline-offset: 3px;
  border-radius: 3px;
}

.details-term:hover,
.details-term[aria-expanded='true'] {
  text-decoration-style: solid;
  text-decoration-color: var(--accent);
}

.details-term:focus-visible,
.details-icon:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.details-icon {
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--rule);
  background: var(--surface);
  color: var(--ink-muted);
  font:
    italic 700 0.8125rem/1 Georgia,
    serif;
  display: inline-grid;
  place-items: center;
}

.details-icon:hover,
.details-icon[aria-expanded='true'] {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
