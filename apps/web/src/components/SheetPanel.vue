<script setup lang="ts">
import { gameData } from '@bg3planner/gamedata';
import type { DerivedSpell } from '@bg3planner/rules';
import { ABILITIES } from '@bg3planner/shared';
import { computed } from 'vue';
import { titleCase } from '../lib/names';
import { useBuildStore } from '../stores/build';

const store = useBuildStore();
const c = computed(() => store.character);

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const ABBREVIATIONS = {
  strength: 'Str',
  dexterity: 'Dex',
  constitution: 'Con',
  intelligence: 'Int',
  wisdom: 'Wis',
  charisma: 'Cha',
} as const;

const spellGroups = computed(() => {
  const groups: { title: string; spells: DerivedSpell[] }[] = [
    { title: 'Cantrips', spells: [] },
    { title: 'Spells', spells: [] },
    { title: 'Innate', spells: [] },
  ];
  for (const s of c.value.spells) {
    if (s.kind === 'innate') groups[2]!.spells.push(s);
    else if (s.kind === 'cantrip') groups[0]!.spells.push(s);
    else groups[1]!.spells.push(s);
  }
  for (const g of groups)
    g.spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  return groups.filter((g) => g.spells.length);
});

const optionNames = computed(() =>
  Object.entries(c.value.options)
    .filter(([, ids]) => ids.length)
    .map(([groupId, ids]) => {
      const group = gameData.optionGroups.find((g) => g.id === groupId);
      return {
        title: group?.name ?? titleCase(groupId),
        names: ids.map((id) => group?.options.find((o) => o.id === id)?.name ?? titleCase(id)),
      };
    }),
);

const errors = computed(() => store.issues.filter((i) => i.severity === 'error').length);
const todo = computed(() => store.issues.filter((i) => i.severity === 'warning').length);
</script>

<template>
  <section class="sheet" aria-label="Character sheet">
    <p class="state" :class="{ error: errors, warning: !errors && todo }">
      <template v-if="errors"
        >{{ errors }} {{ errors === 1 ? 'problem' : 'problems' }} to fix</template
      >
      <template v-if="errors && todo">, </template>
      <template v-if="todo">{{ todo }} {{ todo === 1 ? 'choice' : 'choices' }} left</template>
      <template v-if="!errors && !todo">Every choice is made</template>
    </p>

    <dl class="vitals">
      <div>
        <dt>Hit points</dt>
        <dd>{{ c.hitPoints }}</dd>
      </div>
      <div>
        <dt>Proficiency</dt>
        <dd>{{ signed(c.proficiencyBonus) }}</dd>
      </div>
      <div>
        <dt>Speed</dt>
        <dd>{{ c.speed }} m</dd>
      </div>
      <div>
        <dt>Darkvision</dt>
        <dd>{{ c.darkvision ? `${c.darkvision} m` : 'None' }}</dd>
      </div>
    </dl>

    <ul class="abilities" aria-label="Ability scores">
      <li v-for="a in ABILITIES" :key="a" :class="{ save: c.savingThrows.includes(a) }">
        <abbr :title="titleCase(a)">{{ ABBREVIATIONS[a] }}</abbr>
        <strong>{{ c.abilityScores[a] }}</strong>
        <span class="muted">{{ signed(c.abilityModifiers[a]) }}</span>
      </li>
    </ul>
    <p class="hint muted">Underlined abilities are saving throw proficiencies.</p>

    <section v-if="c.spellSlots.slots.length || c.spellSlots.pact">
      <h3>Spell slots</h3>
      <ul class="slots">
        <li v-for="(count, i) in c.spellSlots.slots" :key="i">
          <span>Level {{ i + 1 }}</span>
          <span class="pips" :aria-label="`${count} slots`">
            <span v-for="n in count" :key="n" class="pip" />
          </span>
        </li>
        <li v-if="c.spellSlots.pact">
          <span>Pact, level {{ c.spellSlots.pact.level }}</span>
          <span class="pips pact" :aria-label="`${c.spellSlots.pact.count} pact slots`">
            <span v-for="n in c.spellSlots.pact.count" :key="n" class="pip" />
          </span>
        </li>
      </ul>
      <p v-for="caster in c.casters" :key="caster.classId" class="caster muted">
        {{ titleCase(caster.classId) }}: {{ titleCase(caster.ability) }}, save DC
        {{ caster.saveDc }}, spell attack {{ signed(caster.attackBonus) }}
      </p>
    </section>

    <section v-if="c.skills.length">
      <h3>Skills</h3>
      <p>
        <template v-for="(skill, i) in c.skills" :key="skill">
          <span :class="{ expertise: c.expertise.includes(skill) }">{{ titleCase(skill) }}</span
          ><template v-if="i < c.skills.length - 1">, </template>
        </template>
      </p>
    </section>

    <section v-if="c.features.length">
      <h3>Features</h3>
      <p>{{ c.features.map((f) => f.name).join(', ') }}</p>
    </section>

    <section v-for="group in optionNames" :key="group.title">
      <h3>{{ group.title }}</h3>
      <p>{{ group.names.join(', ') }}</p>
    </section>

    <section v-if="c.feats.length">
      <h3>Feats</h3>
      <p>{{ c.feats.map((f) => f.name).join(', ') }}</p>
    </section>

    <section v-for="group in spellGroups" :key="group.title">
      <h3>{{ group.title }}</h3>
      <p>{{ group.spells.map((s) => s.name).join(', ') }}</p>
    </section>

    <section v-if="Object.keys(c.resources).length">
      <h3>Resources</h3>
      <p>
        {{
          Object.entries(c.resources)
            .map(([id, n]) => `${titleCase(id)} ${n}`)
            .join(', ')
        }}
      </p>
    </section>
  </section>
</template>

<style scoped>
.sheet {
  display: grid;
  gap: 16px;
}

.sheet p {
  margin: 0;
}

h3 {
  font-size: 0.875rem;
  color: var(--ink-muted);
  font-weight: 400;
  margin-bottom: 2px;
}

.state {
  font-weight: 700;
  color: var(--ink-muted);
}

.state.warning {
  color: var(--warning);
}

.state.error {
  color: var(--error);
}

.vitals {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin: 0;
}

.vitals dt {
  font-size: 0.8125rem;
  color: var(--ink-muted);
}

.vitals dd {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
}

.abilities {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  text-align: center;
}

.abilities li {
  display: grid;
  padding: 6px 0;
  border-radius: var(--radius-control);
  background: var(--surface);
  border: 1px solid var(--rule);
}

.abilities abbr {
  text-decoration: none;
  font-size: 0.8125rem;
  color: var(--ink-muted);
}

.abilities .save abbr {
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
  color: var(--ink);
}

.abilities strong {
  font-size: 1.15rem;
}

.hint {
  font-size: 0.8125rem;
  margin-top: -10px !important;
}

.slots {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

.slots li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pips {
  display: flex;
  gap: 4px;
}

.pip {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--accent);
}

.pact .pip {
  background: var(--class-warlock);
  border-radius: 2px;
  transform: rotate(45deg) scale(0.85);
}

.caster {
  font-size: 0.875rem;
  margin-top: 6px !important;
}

.expertise {
  font-weight: 700;
}
</style>
