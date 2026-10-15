import { describe, expect, it } from 'vitest';
import { bundleIssues } from './bundle';
import { gloomStalker, ranger, rangerBundle } from './ranger';

const PENDING_SPELLS: string[] = [];

const levelsWith = (pred: (c: (typeof ranger.levels)[number]['choices'][number]) => boolean) =>
  ranger.levels.filter((l) => l.choices.some(pred)).map((l) => l.level);

describe('Ranger bundle', () => {
  it('has no schema or integrity issues', () => {
    expect(bundleIssues(rangerBundle, PENDING_SPELLS)).toEqual([]);
  });

  it('gets feats at levels 4, 8 and 12', () => {
    expect(levelsWith((c) => c.type === 'feat')).toEqual([4, 8, 12]);
  });

  it('picks a Favoured Enemy and a Natural Explorer at levels 1, 6 and 10', () => {
    const at = (group: string) => levelsWith((c) => c.type === 'option' && c.group === group);
    expect(at('ranger-favoured-enemies')).toEqual([1, 6, 10]);
    expect(at('ranger-natural-explorers')).toEqual([1, 6, 10]);
  });

  it('knows 2, 3, 4, 5, 6 and 7 spells at levels 2, 3, 5, 7, 9 and 11', () => {
    expect(ranger.spellcasting.spellsKnown).toEqual([0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7]);
  });

  it('can replace a spell from level 3 on', () => {
    expect(levelsWith((c) => c.type === 'replace-spell')).toEqual([
      3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it('has no slots at level 1 and four 3rd-level slots at level 12 (bg3.wiki)', () => {
    expect(ranger.spellcasting.slots[0]).toEqual([]);
    expect(ranger.spellcasting.slots[11]).toEqual([4, 3, 4]);
  });

  it('offers four of the fighting styles', () => {
    const style = ranger.levels[1]!.choices.find((c) => c.type === 'option');
    expect(style).toMatchObject({
      group: 'fighting-styles',
      only: ['archery', 'defence', 'duelling', 'two-weapon-fighting'],
    });
  });

  it('has the four subclasses, Swarmkeeper added in Patch 8', () => {
    expect(rangerBundle.subclasses.map((s) => s.id)).toEqual([
      'beast-master',
      'gloom-stalker',
      'hunter',
      'swarmkeeper',
    ]);
    expect(rangerBundle.subclasses.filter((s) => s.addedIn).map((s) => s.id)).toEqual([
      'swarmkeeper',
    ]);
  });

  it('gives Gloom Stalkers their always-prepared spells', () => {
    expect(gloomStalker.levels.flatMap((l) => l.spells ?? [])).toEqual([
      'disguise-self',
      'misty-step',
      'fear',
    ]);
  });
});
