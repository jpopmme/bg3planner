import { gameData } from '@bg3planner/gamedata';
import { describe, expect, it } from 'vitest';
import type { Build } from './build';
import { availableChoices } from './choices';
import { classLevels, makeBuild } from './fixtures/builds';
import type { ChoiceSlot } from './walker';

const slot = (build: Build, characterLevel: number, key: string): ChoiceSlot => {
  const found = availableChoices(build, gameData, characterLevel).find((s) => s.key === key);
  if (!found) throw new Error(`no choice ${key} at level ${characterLevel}`);
  return found;
};
const ids = (s: ChoiceSlot) => (s.options.kind === 'ids' ? s.options.ids : []);

const level1Fighter = {
  'class-skills': ['acrobatics', 'perception'],
  'class:0': ['defence'],
  'race:0': ['stealth'],
};

const warlockBuild = (answers: Record<number, Build['levels'][number]['answers']>, levels = 2) =>
  makeBuild({
    raceId: 'half-orc',
    levels: classLevels('warlock', levels, {
      ...answers,
      1: { 'class-skills': ['arcana', 'deception'], ...answers[1] },
    }),
  });

describe('availableChoices', () => {
  it('lists level 1 choices in game order, including character creation', () => {
    expect(availableChoices(makeBuild(), gameData, 1).map((s) => [s.key, s.label])).toEqual([
      ['class-skills', 'Skills'],
      ['race:0', 'Skills'],
      ['class:0', 'Fighting Style'],
    ]);
  });

  it('lists every level when no level is given', () => {
    const build = makeBuild({
      levels: classLevels('fighter', 3, { 1: level1Fighter, 3: { 'class:0': ['champion'] } }),
    });
    expect(availableChoices(build, gameData).map((s) => `${s.characterLevel}:${s.key}`)).toEqual([
      '1:class-skills',
      '1:race:0',
      '1:class:0',
      '3:class:0',
    ]);
  });

  it('offers only class skills the background does not already give', () => {
    // Soldier gives Athletics and Intimidation.
    expect(ids(slot(makeBuild(), 1, 'class-skills'))).toEqual([
      'acrobatics',
      'animal-handling',
      'history',
      'insight',
      'perception',
      'survival',
    ]);
  });

  it('does not offer a fighting style twice (Champion level 10)', () => {
    const build = makeBuild({
      levels: classLevels('fighter', 10, { 1: level1Fighter, 3: { 'class:0': ['champion'] } }),
    });
    expect(ids(slot(build, 10, 'subclass:0'))).not.toContain('defence');
    expect(ids(slot(build, 10, 'subclass:0'))).toHaveLength(5);
  });

  it('gates invocations by warlock level', () => {
    const build = warlockBuild({}, 12);
    expect(ids(slot(build, 2, 'class:0'))).not.toContain('lifedrinker');
    expect(ids(slot(build, 2, 'class:0'))).not.toContain('mire-the-mind');
    expect(ids(slot(build, 12, 'class:1'))).toContain('lifedrinker');
  });

  it('adds the patron’s expanded spells to the warlock list', () => {
    const hexblade = warlockBuild({ 1: { 'class:0': ['the-hexblade'] } });
    const fiend = warlockBuild({ 1: { 'class:0': ['the-fiend'] } });
    expect(ids(slot(hexblade, 1, 'class:2'))).toContain('shield');
    expect(ids(slot(fiend, 1, 'class:2'))).not.toContain('shield');
    expect(ids(slot(fiend, 1, 'class:2'))).toContain('command');
  });

  it('does not offer spells the character already knows', () => {
    const build = warlockBuild({ 1: { 'class:0': ['the-fiend'], 'class:2': ['hex', 'command'] } });
    expect(ids(slot(build, 2, 'class:1'))).not.toContain('hex');
  });

  it('offers known spells to replace and new ones to learn', () => {
    const build = warlockBuild({ 1: { 'class:0': ['the-fiend'], 'class:2': ['hex', 'command'] } });
    const replace = slot(build, 2, 'class:2');
    expect(replace.optional).toBe(true);
    expect(replace.options).toMatchObject({ kind: 'replace', from: ['hex', 'command'] });
  });

  it('restricts Eldritch Knight picks to Abjuration and Evocation', () => {
    const build = makeBuild({
      levels: classLevels('fighter', 3, {
        1: level1Fighter,
        3: { 'class:0': ['eldritch-knight'] },
      }),
    });
    const schools = ids(slot(build, 3, 'subclass:1')).map(
      (id) => gameData.spells.find((s) => s.id === id)!.school,
    );
    expect(new Set(schools)).toEqual(new Set(['abjuration', 'evocation']));
    expect(ids(slot(build, 3, 'subclass:2')).length).toBeGreaterThan(
      ids(slot(build, 3, 'subclass:1')).length,
    );
  });

  describe('feats', () => {
    it('applies armour prerequisites', () => {
      const fighter = makeBuild({
        levels: classLevels('fighter', 4, { 1: level1Fighter, 3: { 'class:0': ['champion'] } }),
      });
      const warlock = warlockBuild({ 1: { 'class:0': ['the-fiend'] } }, 4);
      expect(ids(slot(fighter, 4, 'class:0'))).toContain('heavily-armoured');
      expect(ids(slot(warlock, 4, 'class:0'))).not.toContain('heavily-armoured');
      expect(ids(slot(warlock, 4, 'class:0'))).toContain('moderately-armoured');
    });

    it('applies ability prerequisites (Defensive Duellist needs Dexterity 13)', () => {
      const dexterous = makeBuild({
        levels: classLevels('fighter', 4, { 1: level1Fighter, 3: { 'class:0': ['champion'] } }),
      });
      const clumsy: Build = {
        ...dexterous,
        abilities: {
          base: { ...dexterous.abilities.base, dexterity: 8, wisdom: 15 },
          racialBonus: { strength: 2, constitution: 1 },
        },
      };
      expect(ids(slot(dexterous, 4, 'class:0'))).toContain('defensive-duellist');
      expect(ids(slot(clumsy, 4, 'class:0'))).not.toContain('defensive-duellist');
    });

    it('offers non-repeatable feats once and Ability Improvement again', () => {
      const build = makeBuild({
        levels: classLevels('fighter', 6, {
          1: level1Fighter,
          3: { 'class:0': ['champion'] },
          4: { 'class:0': ['alert'] },
        }),
      });
      expect(ids(slot(build, 6, 'class:0'))).not.toContain('alert');
      expect(ids(slot(build, 6, 'class:0'))).toContain('ability-improvement');
    });

    it('lists the chosen feat’s own choices', () => {
      const build = makeBuild({
        levels: classLevels('fighter', 4, {
          1: level1Fighter,
          3: { 'class:0': ['champion'] },
          4: { 'class:0': ['magic-initiate-wizard'] },
        }),
      });
      const keys = availableChoices(build, gameData, 4).map((s) => `${s.key}:${s.choice.type}`);
      expect(keys).toEqual(['class:0:feat', 'feat:0:cantrip', 'feat:1:spell']);
    });

    it('offers Weapon Master only weapon types not already covered', () => {
      const warlock = warlockBuild(
        { 1: { 'class:0': ['the-fiend'] }, 4: { 'class:0': ['weapon-master'] } },
        4,
      );
      const offered = ids(slot(warlock, 4, 'feat:1'));
      const martial = gameData.weaponTypes.filter((w) => w.category === 'martial').map((w) => w.id);
      // Warlocks know simple weapons; Half-Orcs add no weapon training.
      expect(offered.sort()).toEqual(martial.sort());
    });
  });
});
