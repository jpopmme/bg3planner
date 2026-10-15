import { describe, expect, it } from 'vitest';
import { pointBuyCost, pointBuySpent } from './point-buy';

describe('point buy', () => {
  it.each([
    [8, 0],
    [9, 1],
    [13, 5],
    [14, 7],
    [15, 9],
  ])('score %i costs %i', (score, cost) => {
    expect(pointBuyCost(score)).toBe(cost);
  });

  it.each([7, 16])('rejects %i', (score) => {
    expect(() => pointBuyCost(score)).toThrow(RangeError);
  });

  it('adds up a full spread', () => {
    expect(
      pointBuySpent({
        strength: 8,
        dexterity: 15,
        constitution: 14,
        intelligence: 8,
        wisdom: 10,
        charisma: 15,
      }),
    ).toBe(27);
  });
});
