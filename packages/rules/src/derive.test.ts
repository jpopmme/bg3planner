import { gameData } from '@bg3planner/gamedata';
import { describe, expect, it } from 'vitest';
import type { Build } from './build';
import { deriveCharacter } from './derive';
import { classLevels, makeBuild } from './fixtures/builds';

const derive = (build: Build) => deriveCharacter(build, gameData);

/** A fighter of the given race; level-1 answers include the human skill only for humans. */
const fighterOf = (raceId: string, subraceId?: string, levels = 1, answers = {}) =>
  makeBuild({
    raceId,
    ...(subraceId ? { subraceId } : {}),
    levels: classLevels('fighter', levels, {
      ...answers,
      1: { 'class-skills': ['acrobatics', 'perception'], 'class:0': ['defence'] },
    }),
  });

describe('deriveCharacter', () => {
  it('uses subrace speed and the best darkvision', () => {
    expect(derive(fighterOf('elf', 'wood-elf'))).toMatchObject({ speed: 10.5, darkvision: 12 });
    expect(derive(fighterOf('dwarf', 'duergar'))).toMatchObject({ speed: 7.5, darkvision: 24 });
    expect(derive(makeBuild())).toMatchObject({ speed: 9, darkvision: 0, size: 'medium' });
  });

  it('unlocks innate spells at their character level', () => {
    const innate = (levels: number) =>
      derive(fighterOf('dwarf', 'duergar', levels))
        .spells.filter((s) => s.kind === 'innate')
        .map((s) => s.id);
    expect(innate(2)).toEqual([]);
    expect(innate(3)).toEqual(['enlarge-duergar']);
    expect(innate(5)).toEqual(['enlarge-duergar', 'invisibility-duergar']);
  });

  it('casts racial spells with the race’s fixed ability', () => {
    const zariel = derive(fighterOf('tiefling', 'zariel-tiefling'));
    expect(zariel.spells).toEqual([
      expect.objectContaining({ id: 'thaumaturgy', kind: 'innate', ability: 'charisma' }),
    ]);
  });

  it('adds hit points from Dwarven Toughness and Tough', () => {
    // CON 13 + 1 racial = 14 → +2. Fighter 1: 10 + 2 = 12; levels 2–4: 6 + 2 each.
    const base = 12 + 3 * 8;
    expect(derive(fighterOf('dwarf', 'shield-dwarf', 4)).hitPoints).toBe(base);
    expect(derive(fighterOf('dwarf', 'gold-dwarf', 4)).hitPoints).toBe(base + 4);
    const tough = fighterOf('dwarf', 'shield-dwarf', 4, {
      3: { 'class:0': ['champion'] },
      4: { 'class:0': ['tough'] },
    });
    expect(derive(tough).hitPoints).toBe(base + 8);
  });

  it('adds Mobile’s speed bonus', () => {
    const mobile = fighterOf('dwarf', 'shield-dwarf', 4, {
      3: { 'class:0': ['champion'] },
      4: { 'class:0': ['mobile'] },
    });
    expect(derive(mobile).speed).toBe(10.5);
  });

  it('applies race proficiencies and expertise', () => {
    const gnome = derive(fighterOf('gnome', 'rock-gnome'));
    expect(gnome.expertise).toEqual(['history']);
    expect(gnome.skills).toContain('history');
    const githyanki = derive(fighterOf('githyanki'));
    expect(githyanki.weaponTypes).toEqual(['greatswords', 'longswords', 'shortswords']);
  });

  it('gives High Elves an Intelligence wizard cantrip', () => {
    const build = fighterOf('elf', 'high-elf');
    build.levels[0]!.answers['subrace:0'] = ['fire-bolt'];
    expect(derive(build).spells).toEqual([
      expect.objectContaining({ id: 'fire-bolt', kind: 'cantrip', ability: 'intelligence' }),
    ]);
  });

  it('applies Resilient’s ability point and saving throw', () => {
    const build = fighterOf('dwarf', 'shield-dwarf', 4, {
      3: { 'class:0': ['champion'] },
      4: { 'class:0': ['resilient'], 'feat:0': { wisdom: 1 } },
    });
    const character = derive(build);
    expect(character.abilityScores.wisdom).toBe(11);
    expect(character.savingThrows).toEqual(['strength', 'constitution', 'wisdom']);
  });

  it('stacks Martial Adept’s die on Battle Master superiority dice', () => {
    const battleMaster = fighterOf('dwarf', 'shield-dwarf', 4, {
      3: { 'class:0': ['battle-master'], 'subclass:0': ['rally', 'riposte', 'trip-attack'] },
      4: { 'class:0': ['martial-adept'], 'feat:0': ['pushing-attack', 'precision-attack'] },
    });
    const character = derive(battleMaster);
    expect(character.resources).toEqual({ 'superiority-dice': 5 });
    expect(character.options.manoeuvres).toEqual([
      'rally',
      'riposte',
      'trip-attack',
      'pushing-attack',
      'precision-attack',
    ]);
  });

  it('caps fixed feat increases at 20', () => {
    const build = makeBuild({
      raceId: 'half-orc',
      abilities: {
        ...makeBuild().abilities,
        base: {
          ...makeBuild().abilities.base,
          charisma: 15,
          intelligence: 8,
          wisdom: 8,
          strength: 13,
        },
        racialBonus: { charisma: 2, constitution: 1 },
      },
      levels: classLevels('fighter', 8, {
        1: { 'class-skills': ['acrobatics', 'perception'], 'class:0': ['defence'] },
        3: { 'class:0': ['champion'] },
        4: { 'class:0': ['ability-improvement'], 'feat:0': { charisma: 2 } },
        6: { 'class:0': ['ability-improvement'], 'feat:0': { charisma: 1, dexterity: 1 } },
        8: { 'class:0': ['actor'] },
      }),
    });
    const character = derive(build);
    expect(character.abilityScores.charisma).toBe(20);
    expect(character.expertise).toEqual(['deception', 'performance']);
  });

  it('skips unknown classes instead of failing', () => {
    const build = makeBuild();
    build.levels.push({ classId: 'necromancer', answers: {} });
    expect(derive(build).classes.map((c) => c.id)).toEqual(['fighter']);
  });
});
