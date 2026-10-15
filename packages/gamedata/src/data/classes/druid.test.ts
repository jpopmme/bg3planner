import { describe, expect, it } from 'vitest';
import { multiclassSpellSlots } from '../spell-slots';
import { bundleIssues } from './bundle';
import { circleOfTheLand, circleOfTheSpores, druid, druidBundle } from './druid';

/** On bg3.wiki but on no class list, so not in spells.json yet. */
const PENDING_SPELLS = ['star-map-guiding-bolt'];

describe('Druid bundle', () => {
  it('has no schema or integrity issues', () => {
    expect(bundleIssues(druidBundle, PENDING_SPELLS)).toEqual([]);
  });

  it('gets feats at levels 4, 8 and 12', () => {
    const featLevels = druid.levels
      .filter((l) => l.choices.some((c) => c.type === 'feat'))
      .map((l) => l.level);
    expect(featLevels).toEqual([4, 8, 12]);
  });

  it('prepares from the whole list and has full-caster slots', () => {
    expect(druid.spellcasting.preparation).toBe('whole-list');
    expect(druid.spellcasting.spellsKnown.every((n) => n === 0)).toBe(true);
    expect(druid.spellcasting.slots).toEqual(multiclassSpellSlots);
  });

  it('has the four circles, Circle of the Stars added in Patch 8', () => {
    expect(druidBundle.subclasses.map((s) => s.id)).toEqual([
      'circle-of-the-land',
      'circle-of-the-moon',
      'circle-of-the-spores',
      'circle-of-the-stars',
    ]);
    expect(druidBundle.subclasses.filter((s) => s.addedIn).map((s) => s.id)).toEqual([
      'circle-of-the-stars',
    ]);
  });

  it('chooses a land at Druid levels 3, 5, 7 and 9, each with its own circle spells', () => {
    const landLevels = circleOfTheLand.levels
      .filter((l) => l.choices.some((c) => c.type === 'option'))
      .map((l) => l.level);
    expect(landLevels).toEqual([3, 5, 7, 9]);
    const group = druidBundle.optionGroups.find((g) => g.id === 'land-circle-spells-5');
    expect(group?.options.map((o) => o.id)).toHaveLength(8);
    expect(group?.options.find((o) => o.id === 'mountain')?.grants?.spells).toEqual([
      'lightning-bolt',
      'grant-flight',
    ]);
  });

  it('gives Circle of the Spores its circle spells', () => {
    const at = (level: number) => circleOfTheSpores.levels.find((l) => l.level === level)?.spells;
    expect(at(3)).toEqual(['blindness', 'detect-thoughts']);
    expect(at(9)).toEqual(['cloudkill', 'contagion']);
  });
});
