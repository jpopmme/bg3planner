import { describe, expect, it } from 'vitest';
import { proficiencyBonus } from './levels';

describe('proficiencyBonus', () => {
  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [12, 4],
  ])('level %i → +%i', (level, expected) => {
    expect(proficiencyBonus(level)).toBe(expected);
  });

  it.each([0, 13, 2.5])('rejects level %s', (level) => {
    expect(() => proficiencyBonus(level)).toThrow(RangeError);
  });
});
