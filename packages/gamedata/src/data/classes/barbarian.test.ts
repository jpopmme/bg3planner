import { describe, expect, it } from 'vitest';
import { barbarianBundle } from './barbarian';
import { bundleIssues } from './bundle';

const PENDING_SPELLS: string[] = [];
const { cls, subclasses, optionGroups } = barbarianBundle;

describe('Barbarian', () => {
  it('has no schema or integrity issues', () => {
    expect(bundleIssues(barbarianBundle, PENDING_SPELLS)).toEqual([]);
  });

  it('gets feats at levels 4, 8 and 12', () => {
    const featLevels = cls.levels
      .filter((l) => l.choices.some((c) => c.type === 'feat'))
      .map((l) => l.level);
    expect(featLevels).toEqual([4, 8, 12]);
  });

  it('rages 2, 3, 4 and 5 times at levels 1, 3, 6 and 12 (bg3.wiki)', () => {
    let total = 0;
    const perLevel = cls.levels.map((l) => (total = l.resources?.['rage-charges'] ?? total));
    expect(perLevel).toEqual([2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5]);
  });

  it('gets Extra Attack and Fast Movement at level 5', () => {
    expect(cls.levels[4]?.features).toEqual(['extra-attack', 'fast-movement']);
  });

  it('has the four Patch 8 subclasses, Giant being new', () => {
    expect(subclasses.map((s) => s.id)).toEqual([
      'berserker',
      'giant',
      'wild-magic-barbarian',
      'wildheart',
    ]);
    expect(subclasses.filter((s) => s.addedIn === 'patch-8').map((s) => s.id)).toEqual(['giant']);
  });

  it('lets a Wildheart pick two of ten Aspects of the Beast', () => {
    const wildheart = subclasses.find((s) => s.id === 'wildheart');
    const picks = wildheart?.levels.flatMap((l) =>
      l.choices.flatMap((c) =>
        c.type === 'option' && c.group === 'animal-aspects' ? [c.count] : [],
      ),
    );
    expect(picks).toEqual([1, 1]);
    expect(optionGroups.find((g) => g.id === 'animal-aspects')?.options).toHaveLength(10);
  });
});
