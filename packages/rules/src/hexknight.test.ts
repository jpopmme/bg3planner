import { gameData } from '@bg3planner/gamedata';
import { describe, expect, it } from 'vitest';
import { deriveCharacter } from './derive';
import { validateBuild } from './choices';
import { hexknight } from './fixtures/builds';

// Golden build: every expected value below was worked out by hand from the game rules.
describe('11 Eldritch Knight / 1 Hexblade', () => {
  const character = deriveCharacter(hexknight, gameData);

  it('is a complete, valid build', () => {
    expect(validateBuild(hexknight, gameData)).toEqual([]);
  });

  it('has the right classes and subclasses', () => {
    expect(character.classes).toEqual([
      {
        id: 'fighter',
        name: 'Fighter',
        level: 11,
        subclass: { id: 'eldritch-knight', name: 'Eldritch Knight' },
      },
      {
        id: 'warlock',
        name: 'Warlock',
        level: 1,
        subclass: { id: 'the-hexblade', name: 'The Hexblade' },
      },
    ]);
  });

  it('keeps Eldritch Knight slots on its own table and pact slots apart', () => {
    // Only one Spellcasting class, so EK 11 uses its own table; Pact Magic never combines.
    expect(character.spellSlots).toEqual({ slots: [4, 3], pact: { count: 1, level: 1 } });
  });

  it('computes ability scores, hit points and proficiency', () => {
    expect(character.abilityScores).toEqual({
      strength: 8,
      dexterity: 17, // 15 + 1 racial + 1 Ability Improvement
      constitution: 14,
      intelligence: 8,
      wisdom: 10,
      charisma: 20, // 15 + 2 racial + 2 + 1, capped at 20
    });
    // Fighter 1: 10 + 2; ten more Fighter levels: 6 + 2 each; Warlock (not first): 5 + 2.
    expect(character.hitPoints).toBe(12 + 10 * 8 + 7);
    expect(character.proficiencyBonus).toBe(4);
  });

  it('takes saving throws from the starting class only', () => {
    expect(character.savingThrows).toEqual(['strength', 'constitution']);
  });

  it('casts warlock spells with Charisma and Eldritch Knight spells with Intelligence', () => {
    expect(character.casters).toEqual([
      {
        classId: 'fighter',
        ability: 'intelligence',
        saveDc: 11,
        attackBonus: 3,
        preparation: 'known',
        maxSpellLevel: 2,
      },
      {
        classId: 'warlock',
        ability: 'charisma',
        saveDc: 17,
        attackBonus: 9,
        preparation: 'known',
        maxSpellLevel: 1,
      },
    ]);
  });

  it('has the class, subclass and race features', () => {
    expect(character.features.map((f) => f.id).sort()).toEqual(
      [
        'action-surge',
        'bind-hexed-weapon',
        'darkvision',
        'eldritch-strike',
        'extra-attack',
        'hex-warrior',
        'hexblades-curse',
        'improved-extra-attack',
        'indomitable',
        'relentless-endurance',
        'savage-attacks',
        'second-wind',
        'war-magic',
        'weapon-bond',
      ].sort(),
    );
  });

  it('knows the spells picked, with the level-7 replacement applied', () => {
    const known = (kind: string, source: string) =>
      character.spells.filter((s) => s.kind === kind && s.source.id === source).map((s) => s.id);
    expect(known('cantrip', 'eldritch-knight')).toEqual(['booming-blade', 'friends', 'fire-bolt']);
    expect(known('spell', 'eldritch-knight')).toEqual([
      'shield',
      'magic-missile',
      'burning-hands', // replaced Longstrider at Fighter level 7
      'thunderwave',
      'scorching-ray',
      'shatter',
      'misty-step',
      'melfs-acid-arrow',
      'gust-of-wind',
    ]);
    expect(known('spell', 'warlock')).toEqual(['hex', 'wrathful-smite']);
  });

  it('records feats with the level they were taken at', () => {
    expect(character.feats.map((f) => [f.id, f.characterLevel])).toEqual([
      ['ability-improvement', 4],
      ['ability-improvement', 6],
      ['war-caster', 8],
    ]);
  });
});
