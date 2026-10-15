import { describe, expect, it } from 'vitest';
import { bundleIssues } from './bundle';
import { wizardBundle } from './wizard';

const PENDING_SPELLS: string[] = [];

const { cls, subclasses } = wizardBundle;

describe('Wizard bundle', () => {
  it('passes schema and integrity checks', () => {
    expect(bundleIssues(wizardBundle, PENDING_SPELLS)).toEqual([]);
  });

  it('chooses a school at level 2 and has the nine Patch 8 subclasses', () => {
    expect(cls.subclassLevel).toBe(2);
    expect(subclasses.map((s) => s.id)).toEqual([
      'abjuration-school',
      'bladesinging',
      'conjuration-school',
      'divination-school',
      'enchantment-school',
      'evocation-school',
      'illusion-school',
      'necromancy-school',
      'transmutation-school',
    ]);
    expect(subclasses.filter((s) => s.addedIn === 'patch-8').map((s) => s.id)).toEqual([
      'bladesinging',
    ]);
  });

  it('gets feats at levels 4, 8 and 12', () => {
    const featLevels = cls.levels
      .filter((l) => l.choices.some((c) => c.type === 'feat'))
      .map((l) => l.level);
    expect(featLevels).toEqual([4, 8, 12]);
  });

  it('fills a spellbook of 6 + 2 per level', () => {
    expect(cls.spellcasting?.preparation).toBe('spellbook');
    expect(cls.spellcasting?.spellsKnown[0]).toBe(6);
    expect(cls.spellcasting?.spellsKnown[4]).toBe(14);
    expect(cls.spellcasting?.spellsKnown[11]).toBe(28);
  });

  it('has the slots of a level 11 full caster', () => {
    const sc = cls.spellcasting;
    expect(sc?.kind === 'full' && sc.slots[10]).toEqual([4, 3, 3, 3, 2, 1]);
  });

  it('recovers up to 6 slot levels with Arcane Recovery at level 11', () => {
    expect(cls.levels[10]?.resources).toEqual({ 'arcane-recovery-charges': 6 });
  });

  it('gives Bladesinging Extra Attack and light armour', () => {
    const blade = subclasses.find((s) => s.id === 'bladesinging');
    expect(blade?.levels.find((l) => l.level === 6)?.features).toContain('extra-attack');
    expect(blade?.levels[0]?.proficiencies?.armour).toEqual(['light']);
  });
});
