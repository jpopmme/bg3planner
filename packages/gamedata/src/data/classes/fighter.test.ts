import { describe, expect, it } from 'vitest';
import { maxSpellLevel } from '../../integrity';
import { multiclassSpellSlots } from '../spell-slots';
import { battleMaster, eldritchKnight, fighter } from './fighter';

describe('Fighter', () => {
  it('gets feats at levels 4, 6, 8 and 12', () => {
    const featLevels = fighter.levels
      .filter((l) => l.choices.some((c) => c.type === 'feat'))
      .map((l) => l.level);
    expect(featLevels).toEqual([4, 6, 8, 12]);
  });
});

describe('Eldritch Knight', () => {
  it('has the slots of a one-third caster, rounding the class level up (bg3.wiki "Spells")', () => {
    eldritchKnight.spellcasting.slots.forEach((slots, i) => {
      const esl = Math.ceil((i + 1) / 3);
      expect(slots, `Fighter level ${i + 1}`).toEqual(i < 2 ? [] : multiclassSpellSlots[esl - 1]);
    });
  });

  it('never casts above 2nd level', () => {
    expect(maxSpellLevel(eldritchKnight.spellcasting, 12)).toBe(2);
  });
});

describe('Battle Master', () => {
  it('knows 3, 5 and 7 manoeuvres at levels 3, 7 and 10', () => {
    let known = 0;
    const totals = battleMaster.levels.map((l) => {
      for (const c of l.choices) if (c.type === 'option') known += c.count;
      return [l.level, known];
    });
    expect(totals).toEqual([
      [3, 3],
      [7, 5],
      [10, 7],
    ]);
  });
});
