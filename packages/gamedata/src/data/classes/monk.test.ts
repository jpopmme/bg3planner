import { describe, expect, it } from 'vitest';
import { bundleIssues } from './bundle';
import { monkBundle } from './monk';

const PENDING_SPELLS: string[] = [];
const { cls, subclasses, optionGroups } = monkBundle;

describe('Monk', () => {
  it('has no schema or integrity issues', () => {
    expect(bundleIssues(monkBundle, PENDING_SPELLS)).toEqual([]);
  });

  it('gets feats at levels 4, 8 and 12', () => {
    const featLevels = cls.levels
      .filter((l) => l.choices.some((c) => c.type === 'feat'))
      .map((l) => l.level);
    expect(featLevels).toEqual([4, 8, 12]);
  });

  it('has one more ki point than its level from level 2 (bg3.wiki)', () => {
    const ki = cls.levels.map((l) => l.resources?.['ki-points']);
    expect(ki).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('is proficient with shortswords, also as a later class', () => {
    expect(cls.proficiencies.weaponTypes).toEqual(['shortswords']);
    expect(cls.multiclassProficiencies.weaponTypes).toEqual(['shortswords']);
  });

  it('gains Unarmoured Movement once, at level 2', () => {
    const levels = cls.levels
      .filter((l) => l.features.includes('unarmoured-movement'))
      .map((l) => l.level);
    expect(levels).toEqual([2]);
  });

  it('has the four Patch 8 subclasses, Drunken Master being new', () => {
    expect(subclasses.map((s) => s.id).sort()).toEqual([
      'way-of-shadow',
      'way-of-the-drunken-master',
      'way-of-the-four-elements',
      'way-of-the-open-hand',
    ]);
    expect(subclasses.filter((s) => s.addedIn === 'patch-8').map((s) => s.id)).toEqual([
      'way-of-the-drunken-master',
    ]);
  });

  it('gives Drunken Masters Performance proficiency at level 3', () => {
    const drunken = subclasses.find((s) => s.id === 'way-of-the-drunken-master');
    expect(drunken?.levels.find((l) => l.level === 3)?.skills).toEqual(['performance']);
  });

  it('lets Four Elements monks learn 3, 4, 5 and 6 disciplines at levels 3, 6, 9 and 11', () => {
    const fourElements = subclasses.find((s) => s.id === 'way-of-the-four-elements');
    let known = 0;
    const totals = fourElements?.levels.map((l) => {
      for (const c of l.choices) if (c.type === 'option') known += c.count;
      return [l.level, known];
    });
    expect(totals).toEqual([
      [3, 3],
      [6, 4],
      [9, 5],
      [11, 6],
    ]);
    const options = optionGroups.find((g) => g.id === 'elemental-disciplines')?.options ?? [];
    expect(options.filter((o) => !o.minClassLevel)).toHaveLength(11);
  });
});
