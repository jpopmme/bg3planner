import { describe, expect, it } from 'vitest';
import { gameData } from '../../index';
import { multiclassSpellSlots } from '../spell-slots';
import { bard, bardBundle, collegeOfLore, collegeOfSwords, magicalSecretsSpells } from './bard';
import { bundleIssues } from './bundle';

const PENDING_SPELLS: string[] = [];

describe('Bard bundle', () => {
  it('passes the schema and integrity checks', () => {
    expect(bundleIssues(bardBundle, PENDING_SPELLS)).toEqual([]);
  });

  it('has the four colleges, College of Glamour added in Patch 8', () => {
    expect(bardBundle.subclasses.map((s) => s.id)).toEqual([
      'college-of-glamour',
      'college-of-lore',
      'college-of-swords',
      'college-of-valour',
    ]);
    expect(bardBundle.subclasses.filter((s) => s.addedIn === 'patch-8').map((s) => s.id)).toEqual([
      'college-of-glamour',
    ]);
  });
});

describe('Bard', () => {
  it('gets feats at levels 4, 8 and 12 and expertise at 3 and 10', () => {
    const levelsWith = (type: string) =>
      bard.levels.filter((l) => l.choices.some((c) => c.type === type)).map((l) => l.level);
    expect(levelsWith('feat')).toEqual([4, 8, 12]);
    expect(levelsWith('expertise')).toEqual([3, 10]);
  });

  it('knows 4 spells at level 1 and 15 at level 12, plus Magical Secrets on top', () => {
    expect(bard.spellcasting.spellsKnown[0]).toBe(4);
    expect(bard.spellcasting.spellsKnown[11]).toBe(15);
    const secrets = bard.levels[9]!.choices.find((c) => c.type === 'spell' && 'extra' in c);
    expect(secrets).toMatchObject({ count: 2, maxLevel: 5, extra: true });
  });

  it('has the slots of a full caster', () => {
    expect(bard.spellcasting.slots).toEqual(multiclassSpellSlots);
  });

  it('has 3, 4 and 5 Bardic Inspiration charges from levels 1, 5 and 8', () => {
    const totals = bard.levels
      .filter((l) => 'resources' in l)
      .map((l) => [l.level, l.resources?.['bardic-inspiration']]);
    expect(totals).toEqual([
      [1, 3],
      [5, 4],
      [8, 5],
    ]);
  });
});

describe('Magical Secrets', () => {
  it('lists only spells that are not on the Bard list', () => {
    const byId = new Map(gameData.spells.map((s) => [s.id, s]));
    expect(magicalSecretsSpells).toHaveLength(62);
    for (const id of magicalSecretsSpells) expect(byId.get(id)?.classes).not.toContain('bard');
  });

  it('is limited to level 3 spells for College of Lore at Bard level 6', () => {
    expect(collegeOfLore.levels[1]).toMatchObject({
      level: 6,
      choices: [{ type: 'spell', count: 2, maxLevel: 3, extra: true }],
    });
  });
});

describe('College of Swords', () => {
  it('picks Duelling or Two-Weapon Fighting', () => {
    expect(collegeOfSwords.levels[0]!.choices).toEqual([
      {
        type: 'option',
        group: 'fighting-styles',
        count: 1,
        only: ['duelling', 'two-weapon-fighting'],
      },
    ]);
  });
});
