import type { Ability } from './abilities';

/** BG3 skills and the ability each one uses. */
export const SKILL_ABILITIES = {
  athletics: 'strength',
  acrobatics: 'dexterity',
  'sleight-of-hand': 'dexterity',
  stealth: 'dexterity',
  arcana: 'intelligence',
  history: 'intelligence',
  investigation: 'intelligence',
  nature: 'intelligence',
  religion: 'intelligence',
  'animal-handling': 'wisdom',
  insight: 'wisdom',
  medicine: 'wisdom',
  perception: 'wisdom',
  survival: 'wisdom',
  deception: 'charisma',
  intimidation: 'charisma',
  performance: 'charisma',
  persuasion: 'charisma',
} as const satisfies Record<string, Ability>;

export type Skill = keyof typeof SKILL_ABILITIES;

export const SKILLS = Object.keys(SKILL_ABILITIES) as Skill[];
