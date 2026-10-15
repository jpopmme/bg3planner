import { describe, expect, it } from 'vitest';
import { maxSpellLevel } from '../../integrity';
import { multiclassSpellSlots } from '../spell-slots';
import { bundleIssues } from './bundle';
import { arcaneTrickster, rogue, rogueBundle } from './rogue';

const PENDING_SPELLS: string[] = [];

describe('Rogue bundle', () => {
  it('passes the schema and integrity checks', () => {
    expect(bundleIssues(rogueBundle, PENDING_SPELLS)).toEqual([]);
  });

  it('has the four subclasses, Swashbuckler added in Patch 8', () => {
    expect(rogueBundle.subclasses.map((s) => s.id)).toEqual([
      'arcane-trickster',
      'assassin',
      'swashbuckler',
      'thief',
    ]);
    expect(rogueBundle.subclasses.filter((s) => s.addedIn === 'patch-8').map((s) => s.id)).toEqual([
      'swashbuckler',
    ]);
  });
});

describe('Rogue', () => {
  const levelsWith = (type: string) =>
    rogue.levels.filter((l) => l.choices.some((c) => c.type === type)).map((l) => l.level);

  it('gets feats at levels 4, 8, 10 and 12 (one more than most classes)', () => {
    expect(levelsWith('feat')).toEqual([4, 8, 10, 12]);
  });

  it('gets expertise in two skills at levels 1 and 6', () => {
    expect(levelsWith('expertise')).toEqual([1, 6]);
    for (const l of rogue.levels) {
      for (const c of l.choices) if (c.type === 'expertise') expect(c.count).toBe(2);
    }
  });
});

describe('Arcane Trickster', () => {
  it('has one-third caster slots up to level 9, then six 1st- and two 2nd-level slots', () => {
    arcaneTrickster.spellcasting.slots.forEach((slots, i) => {
      const level = i + 1;
      const expected =
        level < 3 ? [] : level >= 10 ? [6, 2] : multiclassSpellSlots[Math.ceil(level / 3) - 1];
      expect(slots, `Rogue level ${level}`).toEqual(expected);
    });
    expect(maxSpellLevel(arcaneTrickster.spellcasting, 12)).toBe(2);
  });

  it('knows 3 spells at level 3 and 8 at level 11, and gets Mage Hand for free', () => {
    expect(arcaneTrickster.spellcasting.spellsKnown[2]).toBe(3);
    expect(arcaneTrickster.spellcasting.spellsKnown[10]).toBe(8);
    expect(arcaneTrickster.levels[0]!.spells).toEqual(['mage-hand']);
  });

  it('can replace a spell at levels 4 to 9 and 12 only', () => {
    const replaceLevels = arcaneTrickster.levels
      .filter((l) => l.choices.some((c) => c.type === 'replace-spell'))
      .map((l) => l.level);
    expect(replaceLevels).toEqual([4, 5, 6, 7, 8, 9, 12]);
  });
});
