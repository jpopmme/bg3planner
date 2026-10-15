import { describe, expect, it } from 'vitest';
import { gameData } from '../../index';
import { warlock } from './warlock';

describe('Warlock', () => {
  it('knows 2, 3, 4, 5 and 6 invocations at levels 2, 5, 7, 9 and 12 (bg3.wiki)', () => {
    let known = 0;
    const perLevel = warlock.levels.map((l) => {
      for (const c of l.choices) {
        if (c.type === 'option' && c.group === 'eldritch-invocations') known += c.count;
      }
      return known;
    });
    expect(perLevel).toEqual([0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6]);
  });

  it('has the spell list bg3.wiki shows per level', () => {
    const counts = [0, 1, 2, 3, 4, 5, 6].map(
      (level) =>
        gameData.spells.filter((s) => s.level === level && s.classes.includes('warlock')).length,
    );
    expect(counts).toEqual([10, 8, 11, 8, 3, 1, 5]);
  });

  it('offers the five 6th-level spells as Mystic Arcanum', () => {
    const arcanum = gameData.spells
      .filter((s) => s.level === 6 && s.classes.includes('warlock'))
      .map((s) => s.id);
    expect(arcanum).toEqual([
      'arcane-gate',
      'circle-of-death',
      'create-undead',
      'eyebite',
      'flesh-to-stone',
    ]);
  });
});
