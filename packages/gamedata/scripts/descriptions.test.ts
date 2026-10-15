import { describe, expect, it } from 'vitest';
import { descriptionText, featDescriptions, toDescriptions } from './descriptions';

const row = (name: string, description: string | null, page = name) => ({
  page,
  name,
  description,
});

const featsHtml = `
<table>
  <tr><th rowspan="2" scope="rowgroup">Athlete</th><th>Athlete: Standing Up</th></tr>
  <tr><td><ul><li>Your <a>Strength</a> increases by 1 .</li><li>Jump further.</li></ul></td></tr>
  <tr><th scope="rowgroup">Lucky</th></tr>
  <tr><td><ul><li>Gain Luck Points:<ul><li>Use one on an attack.</li></ul></li></ul></td></tr>
</table>`;

describe('descriptionText', () => {
  it('turns wiki bullets into lines starting with "•"', () => {
    expect(descriptionText('Intro.\n* [[Prone|Prone]] targets\n** nested\n:indented')).toBe(
      'Intro.\n• Prone targets\n• nested\nindented',
    );
  });
});

describe('featDescriptions', () => {
  it('reads each feat’s bullet points from the rendered Feats page', () => {
    expect(Object.fromEntries(featDescriptions(featsHtml))).toEqual({
      athlete: '• Your Strength increases by 1.\n• Jump further.',
      lucky: '• Gain Luck Points:\n• Use one on an attack.',
    });
  });
});

describe('toDescriptions', () => {
  const ours = {
    spells: [{ id: 'hex', wikiPage: 'Hex' }],
    features: [
      { id: 'action-surge', name: 'Action Surge', kind: 'action' as const },
      { id: 'defence', name: 'Defence', kind: 'passive' as const },
    ],
    feats: [{ id: 'athlete', name: 'Athlete' }],
    optionGroups: [
      {
        id: 'arcane-shots',
        name: 'Arcane Shots',
        options: [
          { id: 'banishing-arrow', name: 'Banishing Arrow' },
          { id: 'mystery', name: 'Mystery' },
        ],
      },
    ],
  };
  const sources = {
    spells: [row('Hex', 'Curse a [[target]].')],
    passives: [row('Action Surge', 'The passive.'), row('Defense', 'Plus one AC.')],
    actions: [
      row('Action Surge', 'Gain an extra action.'),
      row('Arcane Shot: Banishing Arrow', 'Banish the target.'),
    ],
    featsHtml,
  };

  it('matches by name across tables, preferring actions for actions', () => {
    const { descriptions, missing } = toDescriptions(ours, sources);
    expect(descriptions).toEqual({
      'spell:hex': 'Curse a target.',
      'feature:action-surge': 'Gain an extra action.',
      'feature:defence': 'Plus one AC.',
      'feat:athlete': '• Your Strength increases by 1.\n• Jump further.',
      'option:arcane-shots:banishing-arrow': 'Banish the target.',
    });
    expect(missing).toEqual(['option:arcane-shots:mystery']);
  });
});
