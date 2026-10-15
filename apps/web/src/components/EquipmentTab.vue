<script setup lang="ts">
import { ACT_NAMES, ACTS, type Act, type EquipSlot } from '@bg3planner/rules';
import { computed, ref, watch } from 'vue';
import { useBuildStore } from '../stores/build';
import { usePartyStore } from '../stores/party';
import ItemSlot from './ItemSlot.vue';
import SourceNotes from './SourceNotes.vue';

const store = useBuildStore();
const party = usePartyStore();

const GROUPS: { title: string; slots: EquipSlot[] }[] = [
  { title: 'Weapons', slots: ['meleeMain', 'meleeOff', 'rangedMain', 'rangedOff'] },
  { title: 'Armour', slots: ['head', 'cloak', 'armour', 'gloves', 'boots'] },
  { title: 'Jewellery', slots: ['amulet', 'ring1', 'ring2'] },
];

/** One item picker open at a time. */
const openSlot = ref<EquipSlot | null>(null);
watch(
  () => store.act,
  () => (openSlot.value = null),
);

const loadout = computed(() => store.build.equipment?.[store.act] ?? {});
const planned = (act: Act) => Object.keys(store.build.equipment?.[act] ?? {}).length;
/** The closest earlier act with gear, to start this one from. */
const copyFrom = computed(() =>
  planned(store.act)
    ? undefined
    : ACTS.slice(0, ACTS.indexOf(store.act))
        .reverse()
        .find((a) => planned(a)),
);

/** Who else in the active party uses each item in this act. */
const usedBy = computed(() => {
  const shown = party.shownParty;
  const me = party.currentMember.id;
  const map = new Map<string, string[]>();
  for (const member of shown.members) {
    if (member.id === me || !shown.activeMemberIds.includes(member.id)) continue;
    for (const id of new Set(Object.values(member.build.equipment?.[store.act] ?? {}))) {
      map.set(id, [...(map.get(id) ?? []), member.name || 'Unnamed']);
    }
  }
  return map;
});

const ac = computed(() => store.character.armourClassParts);
</script>

<template>
  <div class="equipment">
    <div class="act-bar">
      <div class="acts" role="radiogroup" aria-label="Act">
        <button
          v-for="act in ACTS"
          :key="act"
          type="button"
          role="radio"
          :aria-checked="store.act === act"
          :data-act="act"
          @click="store.act = act"
        >
          {{ ACT_NAMES[act] }}
          <span class="count muted">{{ planned(act) || '–' }}</span>
        </button>
      </div>
      <button
        v-if="copyFrom"
        type="button"
        data-action="copy-loadout"
        @click="store.copyLoadout(copyFrom, store.act)"
      >
        Start from {{ ACT_NAMES[copyFrom] }}’s gear
      </button>
    </div>

    <p class="armour-class" data-summary="armour-class">
      <strong>Armour Class {{ store.character.armourClass }}</strong>
      <span class="muted">
        =
        {{
          ac
            .map((p, i) => `${i ? (p.value < 0 ? '− ' : '+ ') : ''}${Math.abs(p.value)} ${p.label}`)
            .join(' ')
        }}
      </span>
    </p>

    <SourceNotes v-if="store.build.source" :source="store.build.source" :act="store.act" />

    <section v-for="group in GROUPS" :key="group.title" class="group">
      <h3>{{ group.title }}</h3>
      <ul>
        <ItemSlot
          v-for="slot in group.slots"
          :key="`${store.act}-${slot}`"
          :act="store.act"
          :equip-slot="slot"
          :used-by="usedBy"
          :open="openSlot === slot"
          @update:open="(value: boolean) => (openSlot = value ? slot : null)"
        />
      </ul>
    </section>

    <p v-if="!Object.keys(loadout).length && !copyFrom" class="muted hint">
      Plan what this character wears in {{ ACT_NAMES[store.act] }}. The sheet shows the act you pick
      here, gear included.
    </p>
  </div>
</template>

<style scoped>
.equipment {
  display: grid;
  gap: 18px;
}

.act-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.acts {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border: 1px solid var(--rule);
  border-radius: calc(var(--radius-control) + 3px);
  background: var(--surface);
}

.acts button {
  border: none;
  background: none;
  padding: 6px 14px;
  border-radius: var(--radius-control);
  font-weight: 700;
  color: var(--ink-muted);
  display: inline-flex;
  gap: 8px;
  align-items: baseline;
}

.acts button[aria-checked='true'] {
  background: var(--accent-soft);
  color: var(--ink);
}

.count {
  font-size: 0.8125rem;
  font-weight: 400;
}

.armour-class {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  align-items: baseline;
}

.armour-class strong {
  font-size: 1.25rem;
}

.group {
  display: grid;
  gap: 2px;
}

.group h3 {
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-muted);
}

.group ul {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--rule);
}

.hint {
  margin: 0;
}
</style>
