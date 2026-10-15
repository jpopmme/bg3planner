import { describe, expect, it } from 'vitest';
import type { Choice } from '../../schema';
import { bundleIssues } from './bundle';
import { cleric, clericBundle, deathDomain, knowledgeDomain, warDomain } from './cleric';

/** On bg3.wiki but on no class list, so not in spells.json yet. */
const PENDING_SPELLS = ['destructive-wave'];

const featLevels = cleric.levels
  .filter((l) => l.choices.some((c) => c.type === 'feat'))
  .map((l) => l.level);

describe('Cleric', () => {
  it('has no schema or integrity issues', () => {
    expect(bundleIssues(clericBundle, PENDING_SPELLS)).toEqual([]);
  });

  it('gets feats at levels 4, 8 and 12', () => {
    expect(featLevels).toEqual([4, 8, 12]);
  });

  it('prepares from the whole list, picking only cantrips', () => {
    expect(cleric.spellcasting.preparation).toBe('whole-list');
    expect(cleric.spellcasting.spellsKnown.every((n) => n === 0)).toBe(true);
    const picks = cleric.levels.flatMap((l): Choice[] => l.choices).map((c) => c.type);
    expect(picks).not.toContain('spell');
  });

  it('has 6th-level slots from level 11 (bg3.wiki "Cleric")', () => {
    expect(cleric.spellcasting.slots[10]).toEqual([4, 3, 3, 3, 2, 1]);
    expect(cleric.spellcasting.slots[4]).toEqual([4, 3, 2]);
  });

  it('has 1 Channel Divinity charge at level 2 and 2 at level 6', () => {
    const totals = cleric.levels
      .filter((l) => l.resources?.['channel-divinity'])
      .map((l) => [l.level, l.resources?.['channel-divinity']]);
    expect(totals).toEqual([
      [2, 1],
      [6, 2],
    ]);
  });
});

describe('Domains', () => {
  it('are the eight BG3 domains, Death added in Patch 8', () => {
    expect(clericBundle.subclasses.map((s) => s.id)).toEqual([
      'death-domain',
      'knowledge-domain',
      'life-domain',
      'light-domain',
      'nature-domain',
      'tempest-domain',
      'trickery-domain',
      'war-domain',
    ]);
    expect(clericBundle.subclasses.filter((s) => 'addedIn' in s).map((s) => s.id)).toEqual([
      'death-domain',
    ]);
  });

  it('grant two domain spells at levels 3, 5, 7 and 9', () => {
    for (const sub of clericBundle.subclasses) {
      for (const level of [3, 5, 7, 9]) {
        const spells = sub.levels.find((l) => l.level === level)?.spells;
        expect(spells, `${sub.name} level ${level}`).toHaveLength(2);
      }
    }
  });

  it('Death Domain: Animate Dead and Vampiric Touch at level 5, martial weapons', () => {
    expect(deathDomain.levels.find((l) => l.level === 5)?.spells).toEqual([
      'animate-dead',
      'vampiric-touch',
    ]);
    expect(deathDomain.levels[0]?.proficiencies).toEqual({ weapons: ['martial'] });
  });

  it('Knowledge Domain: expertise in two of Arcana, History, Nature, Religion', () => {
    expect(knowledgeDomain.levels[0]?.choices).toEqual([
      {
        type: 'expertise',
        count: 2,
        from: ['arcana', 'history', 'nature', 'religion'],
        grantsProficiency: true,
      },
    ]);
  });

  it('War Domain: 3, 4, 5 and 6 War Priest charges at levels 1, 5, 8 and 11', () => {
    const totals = warDomain.levels
      .filter((l) => 'resources' in l)
      .map((l) => [l.level, l.resources?.['war-priest-charges']]);
    expect(totals).toEqual([
      [1, 3],
      [5, 4],
      [8, 5],
      [11, 6],
    ]);
  });
});
