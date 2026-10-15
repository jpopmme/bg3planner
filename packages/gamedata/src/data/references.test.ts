import { describe, expect, it } from 'vitest';
import { referencedSpellIds } from './references';

describe('referencedSpellIds', () => {
  it('finds expanded spells, fixed picks and innate spells', () => {
    const ids = referencedSpellIds();
    expect(ids).toContain('staggering-smite'); // Hexblade expanded list
    expect(ids).toContain('true-strike'); // Arcane Archer cantrip pick
    expect(ids).toContain('enlarge-duergar'); // Duergar innate spell
    expect(ids).toContain('thorn-whip'); // Spell Sniper
  });

  it('does not collect ids that are not spells', () => {
    const ids = referencedSpellIds();
    expect(ids).not.toContain('warlock');
    expect(ids).not.toContain('darkvision');
  });
});
