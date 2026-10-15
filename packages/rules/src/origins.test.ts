import { gameData } from '@bg3planner/gamedata';
import { describe, expect, it } from 'vitest';
import { validateBuild } from './choices';
import { deriveCharacter } from './derive';
import { hexknight, makeBuild } from './fixtures/builds';

const errors = (build: ReturnType<typeof makeBuild>) =>
  validateBuild(build, gameData)
    .filter((i) => i.severity === 'error')
    .map((i) => i.message);

/** Astarion with his fixed race, subrace and background, at level 1. */
const astarion = () =>
  makeBuild({
    originId: 'astarion',
    raceId: 'elf',
    subraceId: 'high-elf',
    backgroundId: 'charlatan',
    levels: [{ classId: 'fighter', answers: {} }],
  });

describe('origins', () => {
  it('accept their fixed race, subrace and background', () => {
    expect(errors(astarion())).toEqual([]);
  });

  it('reject a different race, subrace or background', () => {
    expect(
      errors({ ...astarion(), raceId: 'drow', subraceId: 'seldarine-drow', backgroundId: 'sage' }),
    ).toEqual([
      'Astarion is always a race: Elf',
      'Astarion is always a subrace: High Elf',
      'Astarion is always a background: Charlatan',
    ]);
  });

  it('keep Haunted One for The Dark Urge, who chooses their own race', () => {
    const durge = makeBuild({
      originId: 'dark-urge',
      backgroundId: 'haunted-one',
      raceId: 'dragonborn',
      subraceId: 'red-dragonborn',
    });
    expect(errors(durge)).toEqual([]);
    expect(errors({ ...durge, backgroundId: 'sage' })).toEqual([
      'The Dark Urge is always a background: Haunted One',
    ]);
    expect(errors(makeBuild({ backgroundId: 'haunted-one' }))).toEqual([
      'Only The Dark Urge can have the Haunted One background',
    ]);
  });

  it('reports unknown origins', () => {
    expect(errors(makeBuild({ originId: 'elminster' }))).toEqual(['Unknown origin "elminster"']);
  });

  it('appears on the sheet', () => {
    expect(deriveCharacter(astarion(), gameData).origin).toEqual({
      id: 'astarion',
      name: 'Astarion',
    });
    expect(deriveCharacter(makeBuild(), gameData).origin).toEqual({
      id: 'custom',
      name: 'Custom character',
    });
  });
});

describe('check bonuses', () => {
  const c = deriveCharacter(hexknight, gameData);

  it('add proficiency to proficient skills only', () => {
    // CHA 20 (+5), proficiency +4.
    expect(c.skillBonuses.intimidation).toBe(9); // Soldier
    expect(c.skillBonuses.persuasion).toBe(5);
    expect(c.skillBonuses.acrobatics).toBe(3 + 4); // DEX 17
    expect(c.skillBonuses.arcana).toBe(-1); // INT 8
  });

  it('double proficiency with expertise', () => {
    const gnome = deriveCharacter(
      makeBuild({
        raceId: 'gnome',
        subraceId: 'rock-gnome',
        levels: [{ classId: 'fighter', answers: {} }],
      }),
      gameData,
    );
    expect(gnome.skillBonuses.history).toBe(1 + 2 + 2); // INT 12, +2 proficiency twice
  });

  it('add proficiency to proficient saving throws', () => {
    expect(c.savingThrowBonuses).toEqual({
      strength: -1 + 4,
      dexterity: 3,
      constitution: 2 + 4,
      intelligence: -1,
      wisdom: 0,
      charisma: 5,
    });
  });
});
