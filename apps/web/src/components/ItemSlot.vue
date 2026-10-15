<script setup lang="ts">
import { gameData } from '@bg3planner/gamedata';
import { type Act, type EquipSlot, SLOT_NAMES, itemsForSlot } from '@bg3planner/rules';
import { computed, nextTick, ref, useId } from 'vue';
import { byRarity, itemBasics, itemById, itemEffects, rarityName } from '../lib/items';
import { useBuildStore } from '../stores/build';
import DetailsButton from './DetailsButton.vue';
import SlotIcon from './SlotIcon.vue';

const props = defineProps<{
  act: Act;
  equipSlot: EquipSlot;
  /** Item id → names of other active party members using it in this act. */
  usedBy: Map<string, string[]>;
}>();
const open = defineModel<boolean>('open', { default: false });
const store = useBuildStore();
const id = useId();

const itemId = computed(() => store.build.equipment?.[props.act]?.[props.equipSlot]);
const item = computed(() => itemById(itemId.value));
const issues = computed(() =>
  store.gearIssues.filter((i) => i.act === props.act && i.slot === props.equipSlot),
);
const clash = computed(() => (itemId.value ? props.usedBy.get(itemId.value) : undefined));

const SHOWN = 40;
const query = ref('');
const candidates = computed(() => itemsForSlot(props.equipSlot, gameData).sort(byRarity));
const matches = computed(() => {
  const words = query.value.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return candidates.value;
  return candidates.value.filter((i) => {
    const text = `${i.name} ${itemBasics(i)} ${itemEffects(i).join(' ')}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
});

const search = ref<HTMLInputElement>();
async function startPicking() {
  open.value = true;
  query.value = '';
  await nextTick();
  search.value?.focus();
}

function choose(next: string | undefined) {
  store.setItem(props.act, props.equipSlot, next);
  open.value = false;
}
</script>

<template>
  <li class="slot" :data-slot="equipSlot" :class="{ empty: !item }">
    <span class="slot-name">
      <SlotIcon :name="equipSlot" />
      <span :id="`${id}-label`">{{ SLOT_NAMES[equipSlot] }}</span>
    </span>

    <div class="current">
      <template v-if="item">
        <span class="item-name" :data-rarity="item.rarity">
          <DetailsButton :target="{ kind: 'item', id: item.id }">{{ item.name }}</DetailsButton>
        </span>
        <span class="basics muted">
          {{ rarityName(item) }} · {{ itemBasics(item)
          }}<template v-if="item.unique"> · one of a kind</template>
        </span>
        <span v-if="itemEffects(item).length" class="effects" :title="itemEffects(item).join('\n')">
          {{ itemEffects(item).join(' · ') }}
        </span>
      </template>
      <span v-else-if="itemId" class="item-name">Unknown item “{{ itemId }}”</span>
      <span v-else class="muted">Nothing planned</span>

      <ul v-if="issues.length || clash" class="problems">
        <li v-for="(issue, i) in issues" :key="i" :class="issue.severity">{{ issue.message }}</li>
        <li v-if="clash" class="warning">
          {{ clash.join(' and ') }} also {{ clash.length === 1 ? 'plans' : 'plan' }} to use it in
          this act, and there is only one.
        </li>
      </ul>
    </div>

    <div class="actions">
      <button
        type="button"
        :aria-expanded="open"
        :aria-controls="`${id}-picker`"
        :aria-describedby="`${id}-label`"
        data-action="pick-item"
        @click="open ? (open = false) : startPicking()"
      >
        {{ open ? 'Close' : item ? 'Change' : 'Choose' }}
      </button>
      <button
        v-if="itemId"
        type="button"
        class="quiet"
        :aria-describedby="`${id}-label`"
        data-action="clear-item"
        @click="choose(undefined)"
      >
        Remove
      </button>
    </div>

    <div v-if="open" :id="`${id}-picker`" class="picker">
      <label class="search">
        <span class="visually-hidden"
          >Search items for {{ SLOT_NAMES[equipSlot].toLowerCase() }}</span
        >
        <input
          ref="search"
          v-model="query"
          type="search"
          placeholder="Search by name or effect"
          data-input="item-search"
          @keydown.esc="open = false"
        />
      </label>
      <ul class="options" :aria-label="`Items for ${SLOT_NAMES[equipSlot].toLowerCase()}`">
        <li v-for="option in matches.slice(0, SHOWN)" :key="option.id">
          <button
            type="button"
            :aria-pressed="option.id === itemId"
            :data-item="option.id"
            @click="choose(option.id)"
          >
            <span class="item-name" :data-rarity="option.rarity">{{ option.name }}</span>
            <span class="basics muted">
              {{ rarityName(option) }} · {{ itemBasics(option) }}
              <template v-if="usedBy.get(option.id)">
                · used by {{ usedBy.get(option.id)!.join(', ') }}</template
              >
            </span>
          </button>
        </li>
        <li v-if="matches.length > SHOWN" class="more muted">
          {{ matches.length - SHOWN }} more; type to narrow the list.
        </li>
        <li v-if="!matches.length" class="more muted">Nothing matches.</li>
      </ul>
    </div>
  </li>
</template>

<style scoped>
.slot {
  display: grid;
  grid-template-columns: 9.5rem minmax(0, 1fr) auto;
  grid-template-areas:
    'name current actions'
    'picker picker picker';
  gap: 4px 14px;
  align-items: start;
  padding: 10px 0;
  border-bottom: 1px solid var(--rule);
}

.slot-name {
  grid-area: name;
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 700;
  font-size: 0.9375rem;
}

.slot-name .slot-icon {
  color: var(--ink-muted);
}

.empty .slot-name .slot-icon {
  opacity: 0.6;
}

.current {
  grid-area: current;
  display: grid;
  gap: 2px;
  min-width: 0;
}

.item-name {
  font-weight: 700;
  overflow-wrap: anywhere;
}

.item-name[data-rarity='uncommon'] {
  color: var(--rarity-uncommon);
}
.item-name[data-rarity='rare'] {
  color: var(--rarity-rare);
}
.item-name[data-rarity='very rare'] {
  color: var(--rarity-very-rare);
}
.item-name[data-rarity='legendary'] {
  color: var(--rarity-legendary);
}
.item-name[data-rarity='story'] {
  color: var(--rarity-story);
}

.basics {
  font-size: 0.875rem;
}

.effects {
  font-size: 0.875rem;
  /* The full text stays in the title and for screen readers. */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.problems {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: grid;
  gap: 2px;
  font-size: 0.875rem;
}

.problems .error {
  color: var(--error);
}

.problems .warning {
  color: var(--warning);
}

.actions {
  grid-area: actions;
  display: flex;
  gap: 6px;
}

.quiet {
  background: none;
  border-color: transparent;
  color: var(--ink-muted);
}

.picker {
  grid-area: picker;
  display: grid;
  gap: 8px;
  margin-top: 6px;
  padding: 12px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-panel);
  background: var(--surface);
}

.search input {
  width: 100%;
}

.options {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 22rem;
  overflow-y: auto;
  display: grid;
  gap: 2px;
}

.options button {
  display: grid;
  gap: 1px;
  width: 100%;
  text-align: left;
  border: 1px solid transparent;
  background: none;
  padding: 6px 8px;
  border-radius: var(--radius-control);
}

.options button:hover {
  background: var(--accent-soft);
}

.options button[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.more {
  padding: 6px 8px;
  font-size: 0.875rem;
}

@media (max-width: 560px) {
  .slot {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'name actions'
      'current current'
      'picker picker';
  }
}
</style>
