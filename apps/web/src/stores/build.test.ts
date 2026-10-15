import { hexknight } from '@bg3planner/rules/fixtures';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { newBuild, useBuildStore } from './build';

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe('build store', () => {
  it('starts as a level 1 fighter with nothing chosen', () => {
    const store = useBuildStore();
    expect(store.build).toEqual(newBuild());
    expect(store.character.level).toBe(1);
    expect(store.issues.some((i) => i.message === '27 point-buy points unspent')).toBe(true);
  });

  it('drops race answers that no longer apply when the race changes', () => {
    const store = useBuildStore();
    store.setAnswer(1, 'race:0', ['stealth']);
    store.setRace('elf');
    expect(store.build.levels[0]!.answers).toEqual({});
    expect(store.build.subraceId).toBeUndefined();
  });

  it('moves a racial bonus off the ability that had it', () => {
    const store = useBuildStore();
    store.setRacialBonus('strength', 2);
    store.setRacialBonus('dexterity', 2);
    expect(store.build.abilities.racialBonus).toEqual({ dexterity: 2 });
    store.setRacialBonus('dexterity', undefined);
    expect(store.build.abilities.racialBonus).toEqual({});
  });

  it('starts a level’s class choices over when its class changes', () => {
    const store = useBuildStore();
    store.setAnswer(1, 'race:0', ['stealth']);
    store.setAnswer(1, 'class:0', ['defence']);
    store.setLevelClass(0, 'warlock');
    expect(store.build.levels[0]!.answers).toEqual({ 'race:0': ['stealth'] });
  });

  it('drops a feat’s follow-up answers when a different feat is picked', () => {
    const store = useBuildStore();
    store.build = structuredClone(hexknight);
    expect(store.build.levels[3]!.answers['feat:0']).toEqual({ charisma: 2 });
    store.setAnswer(4, 'class:0', ['alert']);
    expect(store.build.levels[3]!.answers['feat:0']).toBeUndefined();
  });

  it('adds levels up to 12 and removes them down to 1', () => {
    const store = useBuildStore();
    for (let i = 0; i < 15; i++) store.addLevel('warlock');
    expect(store.build.levels).toHaveLength(12);
    for (let i = 0; i < 15; i++) store.removeLastLevel();
    expect(store.build.levels).toHaveLength(1);
  });

  it('keeps a draft across visits', async () => {
    const store = useBuildStore();
    store.name = 'Hexknight';
    store.build = structuredClone(hexknight);
    await nextTick();

    setActivePinia(createPinia());
    const next = useBuildStore();
    expect(next.name).toBe('Hexknight');
    expect(next.character.hitPoints).toBe(99);
  });

  it('ignores a damaged draft', () => {
    localStorage.setItem('bg3planner:draft', '{"build": {"levels": []}}');
    expect(useBuildStore().build).toEqual(newBuild());
  });
});
