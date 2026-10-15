import { gameData } from '@bg3planner/gamedata';
import { describe, expect, it } from 'vitest';
import type { Build } from './build';
import { availableChoices, validateBuild } from './choices';
import { deriveCharacter } from './derive';
import { classLevels, makeBuild } from './fixtures/builds';

// Mechanics added with the remaining classes, exercised on the real class data.

/** Human Soldier (Athletics, Intimidation; Stealth from Human) with DEX 16, WIS 16 and the given levels. */
function build(levels: Build['levels']): Build {
  return makeBuild({
    abilities: {
      base: {
        strength: 8,
        dexterity: 14,
        constitution: 14,
        intelligence: 10,
        wisdom: 15,
        charisma: 10,
      },
      racialBonus: { dexterity: 2, wisdom: 1 },
    },
    levels: levels.map((entry, i) =>
      i === 0 ? { ...entry, answers: { 'race:0': ['perception'], ...entry.answers } } : entry,
    ),
  });
}

const errors = (b: Build) => validateBuild(b, gameData).filter((i) => i.severity === 'error');
const slot = (b: Build, characterLevel: number, key: string) =>
  availableChoices(b, gameData, characterLevel).find((s) => s.key === key);
const optionIds = (b: Build, characterLevel: number, key: string) => {
  const options = slot(b, characterLevel, key)?.options;
  return options?.kind === 'ids' ? options.ids : undefined;
};

describe('Rogue', () => {
  const rogue = (expertise: string[]) =>
    build(
      classLevels('rogue', 1, {
        1: {
          'class-skills': ['acrobatics', 'deception', 'sleight-of-hand', 'investigation'],
          'class:0': expertise,
        },
      }),
    );

  it('picks expertise among the skills it is proficient in', () => {
    const b = rogue(['sleight-of-hand', 'athletics']);
    expect(errors(b)).toEqual([]);
    expect(optionIds(b, 1, 'class:0')).toEqual(
      expect.arrayContaining(['acrobatics', 'athletics', 'perception', 'sleight-of-hand']),
    );
    expect(optionIds(b, 1, 'class:0')).not.toContain('arcana');
    const c = deriveCharacter(b, gameData);
    expect(c.expertise.sort()).toEqual(['athletics', 'sleight-of-hand']);
    // DEX 16: +3, doubled proficiency +4.
    expect(c.skillBonuses['sleight-of-hand']).toBe(7);
  });

  it('rejects expertise in a skill it is not proficient in', () => {
    expect(errors(rogue(['stealth', 'arcana']))).not.toEqual([]);
  });

  it('offers a skill when taken as a second class', () => {
    const b = build([
      ...classLevels('fighter', 1, {
        1: { 'class-skills': ['acrobatics', 'survival'], 'class:0': ['defence'] },
      }),
      ...classLevels('rogue', 1),
    ]);
    const choice = slot(b, 2, 'multiclass-skills');
    expect(choice?.choice).toMatchObject({ count: 1 });
    expect(optionIds(b, 2, 'multiclass-skills')).toContain('sleight-of-hand');
    expect(optionIds(b, 2, 'multiclass-skills')).not.toContain('acrobatics');
  });
});

describe('Cleric', () => {
  it('always prepares its domain spells and prepares from the whole list', () => {
    const b = build(
      classLevels('cleric', 3, {
        1: { 'class-skills': ['insight', 'medicine'], 'class:0': ['life-domain'] },
      }),
    );
    const c = deriveCharacter(b, gameData);
    const granted = c.spells.filter((s) => s.kind === 'granted').map((s) => s.id);
    expect(granted.sort()).toEqual(['aid', 'bless', 'cure-wounds', 'lesser-restoration']);
    expect(c.armour).toContain('heavy');
    expect(c.weaponTypes).toEqual(expect.arrayContaining(['flails', 'morningstars']));
    // Cleric 3, WIS 16: 3 + 3.
    expect(c.casters).toEqual([
      expect.objectContaining({
        classId: 'cleric',
        preparation: 'whole-list',
        prepares: 6,
        maxSpellLevel: 2,
      }),
    ]);
  });

  it('lets the Knowledge Domain pick expertise in a skill it was not proficient in', () => {
    const b = build(
      classLevels('cleric', 1, {
        1: {
          'class-skills': ['insight', 'medicine'],
          'class:0': ['knowledge-domain'],
          'subclass:0': ['arcana', 'history'],
        },
      }),
    );
    const c = deriveCharacter(b, gameData);
    expect(c.skills).toEqual(expect.arrayContaining(['arcana', 'history']));
    expect(c.expertise.sort()).toEqual(['arcana', 'history']);
    expect(optionIds(b, 1, 'subclass:0')?.sort()).toEqual([
      'arcana',
      'history',
      'nature',
      'religion',
    ]);
  });
});

describe('Druid', () => {
  it('chooses a land for each tier of circle spells', () => {
    const b = build(
      classLevels('druid', 3, {
        2: { 'class:0': ['circle-of-the-land'] },
        3: { 'subclass:0': ['arctic'] },
      }),
    );
    expect(optionIds(b, 3, 'subclass:0')).toHaveLength(8);
    const c = deriveCharacter(b, gameData);
    expect(c.spells.filter((s) => s.kind === 'granted').map((s) => s.id)).toEqual([
      'hold-person',
      'spike-growth',
    ]);
    expect(c.weaponTypes).toContain('scimitars');
  });
});

describe('Ranger', () => {
  const ranger = (answers: Record<number, Build['levels'][number]['answers']>, count = 2) =>
    build(classLevels('ranger', count, answers));

  it('gains skills and spells from Favoured Enemy', () => {
    const c = deriveCharacter(
      ranger({
        1: {
          'class-skills': ['nature', 'stealth', 'survival'],
          'class:0': ['keeper-of-the-veil'],
          'class:1': ['urban-tracker'],
        },
      }),
      gameData,
    );
    expect(c.skills).toEqual(expect.arrayContaining(['arcana', 'sleight-of-hand']));
    expect(c.spells.find((s) => s.id === 'protection-from-evil-and-good')?.kind).toBe('granted');
  });

  it('only offers the ranger fighting styles', () => {
    const b = ranger({ 1: { 'class:0': ['bounty-hunter'] } });
    expect(optionIds(b, 2, 'class:0')?.sort()).toEqual([
      'archery',
      'defence',
      'duelling',
      'two-weapon-fighting',
    ]);
  });

  it('gives a Gloom Stalker Wisdom saving throws at level 7', () => {
    const c = deriveCharacter(ranger({ 3: { 'class:0': ['gloom-stalker'] } }, 7), gameData);
    expect(c.savingThrows.sort()).toEqual(['dexterity', 'intelligence', 'strength', 'wisdom']);
  });
});

describe('Bard', () => {
  it('adds half proficiency to unproficient skills with Jack of All Trades', () => {
    const c = deriveCharacter(build(classLevels('bard', 2)), gameData);
    expect(c.features.map((f) => f.id)).toContain('jack-of-all-trades');
    // INT 10: +0, plus half of +2.
    expect(c.skillBonuses.arcana).toBe(1);
    // WIS 16 proficient: +3 + 2, unchanged.
    expect(c.skillBonuses.perception).toBe(5);
  });
});

describe('Barbarian', () => {
  const c = deriveCharacter(
    build(classLevels('barbarian', 5, { 3: { 'class:0': ['giant'] } })),
    gameData,
  );

  it('adds Constitution to its unarmoured Armour Class and moves faster', () => {
    // 10 + DEX 16 (+3) + CON 14 (+2).
    expect(c.armourClass).toBe(15);
    // Human 9 m, Fast Movement +3 m.
    expect(c.speed).toBe(12);
  });

  it('gets the Giant subclass spell as an innate spell', () => {
    expect(c.spells.find((s) => s.id === 'thaumaturgy')?.kind).toBe('innate');
    expect(c.casters).toEqual([]);
  });
});

describe('Monk', () => {
  it('adds Wisdom to its unarmoured Armour Class and gains Unarmoured Movement', () => {
    const c = deriveCharacter(build(classLevels('monk', 2)), gameData);
    // 10 + DEX 16 (+3) + WIS 16 (+3).
    expect(c.armourClass).toBe(16);
    expect(c.speed).toBe(12);
  });
});

describe('Sorcerer', () => {
  it('gets Draconic Resilience: Armour Class 13 + Dexterity and one hit point per level', () => {
    const b = build(
      classLevels('sorcerer', 1, {
        1: { 'class:0': ['draconic-bloodline'], 'subclass:0': ['red'] },
      }),
    );
    const c = deriveCharacter(b, gameData);
    expect(c.armourClass).toBe(16);
    // 6 + CON 14 (+2) + 1.
    expect(c.hitPoints).toBe(9);
    expect(c.spells.find((s) => s.id === 'burning-hands')?.kind).toBe('granted');
  });
});

describe('Wizard', () => {
  it('prepares spells from its spellbook', () => {
    const c = deriveCharacter(build(classLevels('wizard', 3)), gameData);
    // Wizard 3, INT 10: 3 + 0.
    expect(c.casters).toEqual([
      expect.objectContaining({ preparation: 'spellbook', prepares: 3, maxSpellLevel: 2 }),
    ]);
  });
});
