import type { Spellcasting } from '@bg3planner/gamedata';
import { gameData } from '@bg3planner/gamedata';
import { describe, expect, it } from 'vitest';
import { spellSlots } from './spell-slots';

const table = gameData.multiclassSpellSlots;
const ek = gameData.subclasses.find((s) => s.id === 'eldritch-knight')!.spellcasting!;
if (ek.kind === 'pact') throw new Error('expected Eldritch Knight to use Spellcasting');
const third: Spellcasting = ek;
const half: Spellcasting = { ...ek, kind: 'half' };
const full: Spellcasting = { ...ek, kind: 'full', slots: table };
const pact: Spellcasting = gameData.classes.find((c) => c.id === 'warlock')!.spellcasting!;

describe('spellSlots', () => {
  it('gives nothing without casters', () => {
    expect(spellSlots([], table)).toEqual({ slots: [] });
  });

  it('uses a single class’s own table, rounding its caster level up', () => {
    // Eldritch Knight 4 = caster level ⌈4/3⌉ = 2 → three 1st-level slots.
    expect(spellSlots([{ level: 4, spellcasting: third }], table).slots).toEqual([3]);
  });

  it('sums multiclass caster levels and rounds the total down (bg3.wiki example)', () => {
    // 5/3 + 5/3 = 3.33 → caster level 3.
    const casters = [
      { level: 5, spellcasting: third },
      { level: 5, spellcasting: third },
    ];
    expect(spellSlots(casters, table).slots).toEqual([4, 2]);
  });

  it('gives no slots when combined fractions stay below 1', () => {
    const casters = [
      { level: 1, spellcasting: half },
      { level: 1, spellcasting: third },
    ];
    expect(spellSlots(casters, table).slots).toEqual([]);
  });

  it('keeps Pact Magic out of the caster level', () => {
    const casters = [
      { level: 3, spellcasting: full },
      { level: 5, spellcasting: pact },
    ];
    expect(spellSlots(casters, table)).toEqual({ slots: [4, 2], pact: { count: 2, level: 3 } });
  });
});
