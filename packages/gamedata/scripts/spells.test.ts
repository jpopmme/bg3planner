import { describe, expect, it } from 'vitest';
import { type CargoSpellRow, toSpells } from './spells';
import { decodeEntities } from './wikitext';

const row = (overrides: Partial<CargoSpellRow>): CargoSpellRow => ({
  page: 'Shield (spell)',
  name: 'Shield',
  'spell level': 1,
  'spell school': 'Abjuration',
  'is npc': null,
  'is concentration': null,
  'is ritual': null,
  classes: ['Sorcerer', ' Wizard'],
  'action type': 'reaction',
  ...overrides,
});

describe('decodeEntities', () => {
  it('decodes numeric and named entities', () => {
    expect(decodeEntities('Tasha&#039;s &amp; Otto&#x27;s &quot;x&quot;')).toBe(
      'Tasha\'s & Otto\'s "x"',
    );
  });
});

describe('toSpells', () => {
  it('maps a wiki row to a spell', () => {
    expect(toSpells([row({})])).toEqual([
      {
        id: 'shield',
        name: 'Shield',
        level: 1,
        school: 'abjuration',
        classes: ['sorcerer', 'wizard'],
        concentration: false,
        ritual: false,
        actionType: 'reaction',
        wikiPage: 'Shield (spell)',
      },
    ]);
  });

  it('drops NPC spells and spells without a class list', () => {
    const rows = [
      row({ name: 'Npc Thing', 'is npc': 1 }),
      row({ name: 'Item Thing', classes: [''] }),
      row({ name: 'Domain Thing', classes: ['Life Domain'] }),
    ];
    expect(toSpells(rows)).toEqual([]);
  });

  it('keeps class-less spells that class data names', () => {
    const rows = [
      row({ page: 'Staggering Smite', name: 'Staggering Smite', classes: [''] }),
      row({ name: 'Other', classes: [''] }),
    ];
    expect(toSpells(rows, new Set(['staggering-smite'])).map((s) => s.id)).toEqual([
      'staggering-smite',
    ]);
  });

  it('keys class-less spells by page title', () => {
    const rows = [row({ page: 'Enlarge (Duergar)', name: 'Enlarge', classes: [''] })];
    expect(toSpells(rows, new Set(['enlarge-duergar']))[0]).toMatchObject({
      id: 'enlarge-duergar',
      name: 'Enlarge',
      wikiPage: 'Enlarge (Duergar)',
    });
  });

  it('allows a missing school', () => {
    const rows = [row({ page: 'Enlarge (Duergar)', 'spell school': null, classes: [''] })];
    expect(toSpells(rows, new Set(['enlarge-duergar']))[0]?.school).toBeNull();
  });

  it('fails when a named spell is missing from the export', () => {
    expect(() => toSpells([row({})], new Set(['nonexistent']))).toThrow(/nonexistent/);
  });

  it('sorts by level, then name', () => {
    const rows = [
      row({ name: 'Bravo', 'spell level': 2 }),
      row({ name: 'Charlie', 'spell level': 0 }),
      row({ name: 'Alpha', 'spell level': 2 }),
    ];
    expect(toSpells(rows).map((s) => s.name)).toEqual(['Charlie', 'Alpha', 'Bravo']);
  });

  it('rejects two rows that map to the same id', () => {
    expect(() => toSpells([row({ page: 'A' }), row({ page: 'B' })])).toThrow(/"shield"/);
  });
});
