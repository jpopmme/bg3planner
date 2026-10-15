import type { Spellcasting } from '@bg3planner/gamedata';

export interface CasterLevel {
  level: number;
  spellcasting: Spellcasting;
}

export interface SpellSlots {
  /** Spellcasting slots per spell level: `[4, 3]` = four 1st-level and three 2nd-level slots. */
  slots: number[];
  /** Warlock Pact Magic slots, which recharge on a short rest and never combine with `slots`. */
  pact?: { count: number; level: number };
}

const DIVISOR = { full: 1, half: 2, third: 3 } as const;

/**
 * Spell slots for a character's spellcasting classes, following BG3 (bg3.wiki "Spells"):
 * - one Spellcasting class uses its own table (its caster level rounds up);
 * - several combine fractional caster levels, round the sum down and read the shared table;
 * - Pact Magic is separate and adds nothing to the caster level.
 */
export function spellSlots(casters: CasterLevel[], multiclassTable: number[][]): SpellSlots {
  const result: SpellSlots = { slots: [] };

  const pact = casters.find((c) => c.spellcasting.kind === 'pact');
  if (pact && pact.spellcasting.kind === 'pact') {
    result.pact = pact.spellcasting.pactSlots[pact.level - 1];
  }

  const regular = casters.filter((c) => c.spellcasting.kind !== 'pact');
  const [only] = regular;
  if (regular.length === 1 && only && only.spellcasting.kind !== 'pact') {
    result.slots = [...(only.spellcasting.slots[only.level - 1] ?? [])];
  } else if (regular.length > 1) {
    const casterLevel = Math.floor(
      regular.reduce((sum, c) => {
        const kind = c.spellcasting.kind as keyof typeof DIVISOR;
        return sum + c.level / DIVISOR[kind];
      }, 0),
    );
    result.slots = casterLevel >= 1 ? [...(multiclassTable[casterLevel - 1] ?? [])] : [];
  }

  return result;
}
