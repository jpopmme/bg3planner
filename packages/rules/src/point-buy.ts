import { ABILITIES, type Ability } from '@bg3planner/shared';

/** Points available for buying ability scores at character creation. */
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;

/** Cost of a base score: 8 is free, each point to 13 costs 1, 14 and 15 cost 2 each. */
const COSTS: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export function pointBuyCost(score: number): number {
  const cost = COSTS[score];
  if (cost === undefined) {
    throw new RangeError(
      `Point-buy scores range from ${POINT_BUY_MIN} to ${POINT_BUY_MAX}, got ${score}`,
    );
  }
  return cost;
}

/** Total points spent on a set of base scores. */
export function pointBuySpent(base: Record<Ability, number>): number {
  return ABILITIES.reduce((sum, ability) => sum + pointBuyCost(base[ability]), 0);
}
