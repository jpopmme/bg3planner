import { GAME_DATA_VERSION } from '@bg3planner/gamedata';
import type { Build, LevelEntry } from '../build';

const fighter = (answers: LevelEntry['answers'] = {}): LevelEntry => ({
  classId: 'fighter',
  answers,
});

/**
 * 11 Eldritch Knight / 1 Hexblade, after the Gamestegy "Eldritch Hexknight" guide's ability
 * scores (STR 8, DEX 15+1, CON 14, INT 8, WIS 10, CHA 15+2). Spell picks are our own.
 */
export const hexknight: Build = {
  gameDataVersion: GAME_DATA_VERSION,
  raceId: 'half-orc',
  backgroundId: 'soldier',
  abilities: {
    base: {
      strength: 8,
      dexterity: 15,
      constitution: 14,
      intelligence: 8,
      wisdom: 10,
      charisma: 15,
    },
    racialBonus: { charisma: 2, dexterity: 1 },
  },
  levels: [
    fighter({ 'class-skills': ['acrobatics', 'perception'], 'class:0': ['defence'] }),
    fighter(),
    fighter({
      'class:0': ['eldritch-knight'],
      'subclass:0': ['booming-blade', 'friends'],
      'subclass:1': ['shield', 'magic-missile'],
      'subclass:2': ['longstrider'],
    }),
    fighter({
      'class:0': ['ability-improvement'],
      'feat:0': { charisma: 2 },
      'subclass:0': ['thunderwave'],
    }),
    fighter(),
    fighter({ 'class:0': ['ability-improvement'], 'feat:0': { charisma: 1, dexterity: 1 } }),
    fighter({
      'subclass:0': ['scorching-ray', 'shatter'],
      'subclass:1': { from: 'longstrider', to: 'burning-hands' },
    }),
    fighter({ 'class:0': ['war-caster'], 'subclass:0': ['misty-step'] }),
    {
      classId: 'warlock',
      answers: {
        'class:0': ['the-hexblade'],
        'class:1': ['eldritch-blast', 'minor-illusion'],
        'class:2': ['hex', 'wrathful-smite'],
      },
    },
    fighter(),
    fighter({ 'subclass:0': ['fire-bolt'], 'subclass:1': ['melfs-acid-arrow'] }),
    fighter({ 'subclass:0': ['gust-of-wind'] }),
  ],
};

/**
 * A complete level-1 Human Fighter (Soldier) with a legal 27-point spread. Tests override the
 * parts they are about.
 */
export function makeBuild(overrides: Partial<Build> = {}): Build {
  return {
    gameDataVersion: GAME_DATA_VERSION,
    raceId: 'human',
    backgroundId: 'soldier',
    abilities: {
      base: {
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: 8,
      },
      racialBonus: { strength: 2, constitution: 1 },
    },
    levels: [
      fighter({
        'class-skills': ['acrobatics', 'perception'],
        'class:0': ['defence'],
        'race:0': ['stealth'],
      }),
    ],
    ...overrides,
  };
}

/** `count` levels of a class; `answers[n]` holds the answers for its n-th class level. */
export function classLevels(
  classId: string,
  count: number,
  answers: Record<number, LevelEntry['answers']> = {},
): LevelEntry[] {
  return Array.from({ length: count }, (_, i) => ({ classId, answers: answers[i + 1] ?? {} }));
}
