import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it.each([
    ["Tasha's Hideous Laughter", 'tashas-hideous-laughter'],
    ['Hexblade’s Curse', 'hexblades-curse'],
    ['Enlarge/Reduce', 'enlarge-reduce'],
    ['Remarkable Athlete: Jump', 'remarkable-athlete-jump'],
    ['  Shield  ', 'shield'],
    ['Falcäo', 'falcao'],
  ])('%s → %s', (name, expected) => {
    expect(slugify(name)).toBe(expected);
  });
});
