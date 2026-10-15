export const ABILITIES = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const;

export type Ability = (typeof ABILITIES)[number];

export type AbilityScores = Record<Ability, number>;

/** Standard 5e modifier: 10–11 → +0, 12–13 → +1, 8–9 → -1. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
