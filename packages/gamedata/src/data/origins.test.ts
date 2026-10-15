import { describe, expect, it } from 'vitest';
import { findIntegrityIssues, gameData } from '../index';
import { origins } from './origins';

describe('origins', () => {
  it('has custom, The Dark Urge, six origins and four companions', () => {
    const count = (kind: string) => origins.filter((o) => o.kind === kind).length;
    expect([count('custom'), count('dark-urge'), count('origin'), count('companion')]).toEqual([
      1, 1, 6, 4,
    ]);
  });

  it('fixes race, subrace and background as bg3.wiki lists them', () => {
    const summary = Object.fromEntries(
      origins
        .filter((o) => o.kind === 'origin' || o.kind === 'companion')
        .map((o) => [o.id, [o.subraceId ?? o.raceId, o.backgroundId]]),
    );
    expect(summary).toEqual({
      astarion: ['high-elf', 'charlatan'],
      gale: ['human', 'sage'],
      karlach: ['zariel-tiefling', 'outlander'],
      laezel: ['githyanki', 'soldier'],
      shadowheart: ['high-half-elf', 'acolyte'],
      wyll: ['human', 'folk-hero'],
      halsin: ['wood-elf', 'outlander'],
      jaheira: ['high-half-elf', 'soldier'],
      minsc: ['human', 'folk-hero'],
      minthara: ['lolth-sworn-drow', 'noble'],
    });
  });

  it('is checked for unknown or mismatched ids', () => {
    const data = structuredClone(gameData);
    data.origins.push({
      id: 'broken',
      name: 'Broken',
      kind: 'origin',
      raceId: 'elf',
      subraceId: 'duergar',
      backgroundId: 'pirate',
      defaultClass: 'fighter',
    });
    expect(findIntegrityIssues(data)).toEqual([
      'Broken: "duergar" is not a subrace of elf',
      'Broken: unknown background "pirate"',
    ]);
  });
});
