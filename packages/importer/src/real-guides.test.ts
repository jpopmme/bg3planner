import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gameData } from '@bg3planner/gamedata';
import { deriveCharacter } from '@bg3planner/rules';
import { describe, expect, it } from 'vitest';
import { importGamestegyGuide } from './index';

// Real guide pages are Gamestegy's content, so they stay out of the repository: save them under
// fixtures/private/ to run these checks. CI runs the synthetic guides in gamestegy.test.ts.
const fixture = (name: string) =>
  fileURLToPath(new URL(`../fixtures/private/${name}.html`, import.meta.url));
const load = (name: string) => importGamestegyGuide(readFileSync(fixture(name), 'utf8'), gameData);

describe.skipIf(!existsSync(fixture('eldritch-hexknight')))('Eldritch Hexknight guide', () => {
  const result = load('eldritch-hexknight');
  const { build } = result;
  const character = deriveCharacter(build, gameData);

  it('imports race, background and abilities', () => {
    expect(build).toMatchObject({ raceId: 'half-orc', backgroundId: 'noble' });
    expect(build.abilities).toEqual({
      base: {
        strength: 8,
        dexterity: 15,
        constitution: 14,
        intelligence: 8,
        wisdom: 10,
        charisma: 15,
      },
      racialBonus: { dexterity: 1, charisma: 2 },
    });
  });

  it('imports twelve levels as 11 Eldritch Knight / 1 Hexblade', () => {
    expect(build.levels).toHaveLength(12);
    expect(character.classes.map((c) => [c.subclass?.id, c.level])).toEqual([
      ['eldritch-knight', 11],
      ['the-hexblade', 1],
    ]);
    expect(character.spellSlots).toEqual({ slots: [4, 3], pact: { count: 1, level: 1 } });
  });

  it('imports feats and spells', () => {
    expect(character.feats.map((f) => [f.id, f.characterLevel])).toEqual([
      ['savage-attacker', 4],
      ['ability-improvement', 6],
      ['actor', 8],
    ]);
    expect(character.abilityScores.charisma).toBe(20); // 17, +2 at level 6, +1 from Actor
    expect(character.spells.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        'shield',
        'longstrider',
        'darkness',
        'shadow-blade',
        'booming-blade',
      ]),
    );
  });

  it('lists what the guide leaves open', () => {
    const messages = result.notes.map((n) => `${n.level ?? '-'}: ${n.message}`);
    expect(messages).toContain('8: Replace a spell you rarely use with Misty Step.');
    expect(messages).toContain('4: The guide leaves spells open here.');
    expect(result.issues.every((i) => i.severity === 'warning')).toBe(true);
  });
});

describe.skipIf(!existsSync(fixture('hexblade-warlock')))('Hexblade Warlock guide', () => {
  const result = load('hexblade-warlock');
  const character = deriveCharacter(result.build, gameData);

  it('imports every level, invocation, replacement and the arcanum', () => {
    expect(character.classes).toEqual([
      expect.objectContaining({
        id: 'warlock',
        level: 12,
        subclass: expect.objectContaining({ id: 'the-hexblade' }),
      }),
    ]);
    expect(character.options['eldritch-invocations']).toEqual([
      'agonising-blast',
      'devils-sight',
      'repelling-blast',
      'fiendish-vigour',
      'beguiling-influence',
      'lifedrinker',
    ]);
    expect(character.spells.some((s) => s.id === 'create-undead' && s.kind === 'extra')).toBe(true);
    expect(character.spells.some((s) => s.id === 'hellish-rebuke')).toBe(false); // replaced
    expect(result.issues.map((i) => i.message)).toEqual(['Warlock – Cantrips: choose 1']);
  });
});

describe.skipIf(!existsSync(fixture('two-handed-eldritch-knight')))(
  'Two-handed Eldritch Knight guide',
  () => {
    const result = load('two-handed-eldritch-knight');

    it('uses the first of two ability setups', () => {
      expect(result.build.abilities.racialBonus).toEqual({ strength: 2, intelligence: 1 });
    });

    it('falls back to the next suggested feat when the first is taken', () => {
      expect(result.build.levels[7]!.answers).toMatchObject({
        'class:0': ['athlete'],
        'feat:0': { strength: 1 },
      });
    });
  },
);
