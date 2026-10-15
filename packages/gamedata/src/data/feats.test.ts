import { describe, expect, it } from 'vitest';
import { backgrounds } from './backgrounds';
import type { Feat } from '../schema';
import { feats as featData } from './feats';

const feats: Feat[] = featData;

describe('feats', () => {
  it('lists the 41 feats on bg3.wiki "Feats"', () => {
    expect(feats).toHaveLength(41);
  });

  it('only lets Ability Improvement be taken more than once', () => {
    expect(feats.filter((f) => f.repeatable).map((f) => f.id)).toEqual(['ability-improvement']);
  });

  it('has a Magic Initiate feat per spell list, cast with that class’s ability', () => {
    const initiates = feats
      .filter((f) => f.id.startsWith('magic-initiate-'))
      .map((f) => [f.name, f.spellcastingAbility]);
    expect(initiates).toEqual([
      ['Magic Initiate: Bard', 'charisma'],
      ['Magic Initiate: Cleric', 'wisdom'],
      ['Magic Initiate: Druid', 'wisdom'],
      ['Magic Initiate: Sorcerer', 'charisma'],
      ['Magic Initiate: Warlock', 'charisma'],
      ['Magic Initiate: Wizard', 'intelligence'],
    ]);
  });
});

describe('backgrounds', () => {
  it('has 11 backgrounds plus the Dark Urge’s Haunted One (bg3.wiki "Backgrounds")', () => {
    expect(backgrounds).toHaveLength(12);
    expect(backgrounds.filter((b) => 'darkUrgeOnly' in b).map((b) => b.id)).toEqual([
      'haunted-one',
    ]);
  });

  it('grants two different skills each', () => {
    for (const b of backgrounds) expect(new Set(b.skills).size, b.name).toBe(2);
  });
});
