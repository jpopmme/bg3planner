import { describe, expect, it } from 'vitest';
import { matchName } from './match';
import { cleanText, editDistance, normaliseName } from './text';

describe('text helpers', () => {
  it('cleans the spaces guides are full of', () => {
    expect(cleanText('Shield\u200b,\u00a0 Blur ')).toBe('Shield, Blur');
  });

  it('normalises spelling and punctuation', () => {
    expect(normaliseName('Devil’s Sight')).toBe('devils sight');
    expect(normaliseName('Heavy Armor Master')).toBe(normaliseName('Heavy Armour Master'));
    expect(normaliseName('Defense')).toBe('defence');
  });

  it('measures edit distance', () => {
    expect(editDistance('agonizing', 'agonising')).toBe(1);
    expect(editDistance('', 'abc')).toBe(3);
  });
});

describe('matchName', () => {
  const options = [
    { id: 'the-hexblade', name: 'The Hexblade' },
    { id: 'agonising-blast', name: 'Agonising Blast' },
    { id: 'blur', name: 'Blur' },
  ];

  it('matches exactly, with or without "The"', () => {
    expect(matchName('Hexblade', options)?.id).toBe('the-hexblade');
    expect(matchName('The Hexblade', options)?.id).toBe('the-hexblade');
  });

  it('tolerates small typos in longer names only', () => {
    expect(matchName('Agonizing Blast', options)?.id).toBe('agonising-blast');
    expect(matchName('Blue', options)).toBeUndefined();
    expect(matchName('Burning Hands', options)).toBeUndefined();
    expect(matchName('', options)).toBeUndefined();
  });
});
