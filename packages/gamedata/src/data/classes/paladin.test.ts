import { describe, expect, it } from 'vitest';
import { bundleIssues } from './bundle';
import { oathOfTheCrown, oathOfVengeance, paladin, paladinBundle } from './paladin';

/** On bg3.wiki but on no class list, so not in spells.json yet. */
const PENDING_SPELLS: string[] = [];

describe('Paladin', () => {
  it('has no schema or integrity issues', () => {
    expect(bundleIssues(paladinBundle, PENDING_SPELLS)).toEqual([]);
  });

  it('gets feats at levels 4, 8 and 12', () => {
    const featLevels = paladin.levels
      .filter((l) => l.choices.some((c) => c.type === 'feat'))
      .map((l) => l.level);
    expect(featLevels).toEqual([4, 8, 12]);
  });

  it('has no spell slots at level 1 and 3rd-level slots from level 9 (bg3.wiki "Paladin")', () => {
    expect(paladin.spellcasting.slots[0]).toEqual([]);
    expect(paladin.spellcasting.slots[1]).toEqual([2]);
    expect(paladin.spellcasting.slots[8]).toEqual([4, 3, 2]);
    expect(paladin.spellcasting.slots[11]).toEqual([4, 3, 3]);
    expect(paladin.spellcasting.preparation).toBe('whole-list');
  });

  it('picks one of four fighting styles at level 2', () => {
    expect(paladin.levels[1]?.choices).toEqual([
      {
        type: 'option',
        group: 'fighting-styles',
        count: 1,
        only: ['defence', 'duelling', 'great-weapon-fighting', 'protection'],
      },
    ]);
  });

  it('has 3, 4 and 5 Lay on Hands charges at levels 1, 4 and 10', () => {
    const totals = paladin.levels
      .filter((l) => l.resources?.['lay-on-hands-charges'])
      .map((l) => [l.level, l.resources?.['lay-on-hands-charges']]);
    expect(totals).toEqual([
      [1, 3],
      [4, 4],
      [10, 5],
    ]);
  });
});

describe('Oaths', () => {
  it('are the five BG3 oaths, Crown added in Patch 8', () => {
    expect(paladinBundle.subclasses.map((s) => s.id)).toEqual([
      'oath-of-devotion',
      'oath-of-the-ancients',
      'oath-of-the-crown',
      'oath-of-vengeance',
      'oathbreaker',
    ]);
    expect(oathOfTheCrown.addedIn).toBe('patch-8');
  });

  it('grant two oath spells at levels 3, 5 and 9', () => {
    for (const sub of paladinBundle.subclasses) {
      const levels = sub.levels.filter((l) => 'spells' in l).map((l) => l.level);
      expect(levels, sub.name).toEqual([3, 5, 9]);
    }
  });

  it('Oath of Vengeance: Haste and Protection from Energy at level 9', () => {
    expect(oathOfVengeance.levels.find((l) => l.level === 9)?.spells).toEqual([
      'haste',
      'protection-from-energy',
    ]);
  });
});
