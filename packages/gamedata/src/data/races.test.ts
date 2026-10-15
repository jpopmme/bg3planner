import { describe, expect, it } from 'vitest';
import type { Race } from '../schema';
import { races as raceData } from './races';

/** Read through the schema type so optional fields can be accessed uniformly. */
const races: Race[] = raceData;

const byId = (id: string) => {
  const race = races.find((r) => r.id === id);
  if (!race) throw new Error(`no race ${id}`);
  return race;
};

describe('races', () => {
  it('has the 11 playable races and their subraces (bg3.wiki "Races")', () => {
    expect(Object.fromEntries(races.map((r) => [r.name, r.subraces.length]))).toEqual({
      Human: 0,
      Elf: 2,
      Drow: 2,
      'Half-Elf': 3,
      'Half-Orc': 0,
      Halfling: 2,
      Dwarf: 3,
      Gnome: 3,
      Tiefling: 3,
      Githyanki: 0,
      Dragonborn: 10,
    });
  });

  it('gives slow races 7.5 m and wood elves 10.5 m', () => {
    const speeds = races.flatMap((race) =>
      race.subraces.length === 0
        ? [[race.name, race.speed]]
        : race.subraces.map((sub) => [sub.name, sub.speed ?? race.speed]),
    );
    const notNine = Object.fromEntries(speeds.filter(([, speed]) => speed !== 9));
    expect(notNine).toEqual({
      'Wood Elf': 10.5,
      'Wood Half-Elf': 10.5,
      'Lightfoot Halfling': 7.5,
      'Strongheart Halfling': 7.5,
      'Gold Dwarf': 7.5,
      'Shield Dwarf': 7.5,
      Duergar: 7.5,
      'Rock Gnome': 7.5,
      'Forest Gnome': 7.5,
      'Deep Gnome': 7.5,
    });
  });

  it('gives darkvision to all but Humans, Halflings, Githyanki and Dragonborn', () => {
    const withoutDarkvision = races.flatMap((race) => {
      const variants =
        race.subraces.length > 0 ? race.subraces : [{ name: race.name, features: [] }];
      return variants
        .filter((sub) => {
          const features = [...(race.features ?? []), ...(sub.features ?? [])];
          return !features.includes('darkvision') && !features.includes('superior-darkvision');
        })
        .map((sub) => sub.name);
    });
    expect(withoutDarkvision).toEqual([
      'Human',
      'Lightfoot Halfling',
      'Strongheart Halfling',
      'Githyanki',
      ...byId('dragonborn').subraces.map((sub) => sub.name),
    ]);
  });

  it('grants innate spells at character levels 1, 3 and 5', () => {
    const levels = races
      .flatMap((race) => [race, ...race.subraces])
      .flatMap((r) => r.innateSpells ?? [])
      .map((s) => s.characterLevel);
    expect(new Set(levels)).toEqual(new Set([1, 3, 5]));
  });
});
