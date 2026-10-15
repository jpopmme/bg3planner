import { describe, expect, it } from 'vitest';
import { bundleIssues } from './bundle';
import { sorcererBundle } from './sorcerer';

/** On bg3.wiki but on no class list, so not generated into spells.json yet. */
const PENDING_SPELLS = ['eyes-of-the-dark-darkness'];

const { cls, subclasses } = sorcererBundle;

describe('Sorcerer bundle', () => {
  it('passes schema and integrity checks', () => {
    expect(bundleIssues(sorcererBundle, PENDING_SPELLS)).toEqual([]);
  });

  it('chooses a subclass at level 1 and has the four Patch 8 subclasses', () => {
    expect(cls.subclassLevel).toBe(1);
    expect(subclasses.map((s) => s.id)).toEqual([
      'draconic-bloodline',
      'shadow-magic',
      'storm-sorcery',
      'wild-magic-sorcerer',
    ]);
    expect(subclasses.filter((s) => s.addedIn === 'patch-8').map((s) => s.id)).toEqual([
      'shadow-magic',
    ]);
  });

  it('gets feats at levels 4, 8 and 12', () => {
    const featLevels = cls.levels
      .filter((l) => l.choices.some((c) => c.type === 'feat'))
      .map((l) => l.level);
    expect(featLevels).toEqual([4, 8, 12]);
  });

  it('knows 2, 3 and 4 Metamagic options from levels 2, 3 and 10', () => {
    let known = 0;
    const perLevel = cls.levels.map((l) => {
      for (const c of l.choices) {
        if (c.type === 'option' && c.group === 'sorcerer-metamagic') known += c.count;
      }
      return known;
    });
    expect(perLevel).toEqual([0, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4]);
  });

  it('can replace a known spell at every level from 2', () => {
    const replaceLevels = cls.levels
      .filter((l) => l.choices.some((c) => c.type === 'replace-spell'))
      .map((l) => l.level);
    expect(replaceLevels).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('has as many Sorcery Points as Sorcerer levels from level 2', () => {
    expect(cls.levels.map((l) => l.resources?.['sorcery-points'] ?? 0)).toEqual([
      0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it('has the slots of a level 9 full caster', () => {
    const sc = cls.spellcasting;
    expect(sc?.kind === 'full' && sc.slots[8]).toEqual([4, 3, 3, 3, 1]);
  });

  it('offers ten draconic ancestries', () => {
    const group = sorcererBundle.optionGroups.find((g) => g.id === 'sorcerer-draconic-ancestry');
    expect(group?.options).toHaveLength(10);
    expect(group?.options.find((o) => o.id === 'white')?.grants?.spells).toEqual([
      'armour-of-agathys',
    ]);
  });
});
