import { describe, expect, it } from 'vitest';
import type { ClassDef } from '../../schema';
import { bundleIssues } from './bundle';
import { fighter, fighterSubclasses } from './fighter';

const fighterBundle = {
  cls: fighter,
  subclasses: fighterSubclasses,
  features: [],
  optionGroups: [],
};

describe('bundleIssues', () => {
  it('finds nothing wrong with a valid class', () => {
    expect(bundleIssues(fighterBundle)).toEqual([]);
  });

  it('reports problems in the bundle, its own unused features and pending spells', () => {
    const broken = {
      ...fighterBundle,
      cls: {
        ...fighter,
        levels: fighter.levels.map((l) => ({ ...l, features: [...l.features] })),
      } as ClassDef,
      features: [{ id: 'spare', name: 'Spare', kind: 'passive' as const }],
    };
    broken.cls.levels[0]!.features.push('nope');
    broken.cls.levels[1] = { ...broken.cls.levels[1]!, spells: ['not-a-spell'] };
    expect(bundleIssues(broken)).toEqual(
      expect.arrayContaining([
        'Fighter level 1: unknown feature "nope"',
        'Fighter level 2: unknown spell "not-a-spell"',
        'feature "spare" is never granted',
      ]),
    );
    expect(bundleIssues(broken, ['not-a-spell'])).not.toContain(
      'Fighter level 2: unknown spell "not-a-spell"',
    );
  });
});
