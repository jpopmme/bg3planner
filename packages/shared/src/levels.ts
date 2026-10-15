/** BG3's level cap. */
export const MAX_LEVEL = 12;

/** Number of characters that can be in the active party at once. */
export const ACTIVE_PARTY_SIZE = 4;

/** Proficiency bonus by total character level: +2 at 1–4, +3 at 5–8, +4 at 9–12. */
export function proficiencyBonus(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) {
    throw new RangeError(`Character level must be an integer from 1 to ${MAX_LEVEL}, got ${level}`);
  }
  return 2 + Math.floor((level - 1) / 4);
}
