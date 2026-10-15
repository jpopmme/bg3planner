import { describe, expect, it } from 'vitest';
import { ABILITIES, abilityModifier } from './abilities';

describe('abilityModifier', () => {
  it.each([
    [1, -5],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [15, 2],
    [16, 3],
    [17, 3],
    [20, 5],
    [24, 7],
  ])('score %i → %i', (score, expected) => {
    expect(abilityModifier(score)).toBe(expected);
  });
});

describe('ABILITIES', () => {
  it('lists the six abilities in character-sheet order', () => {
    expect(ABILITIES).toEqual([
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ]);
  });
});
