import { ABILITIES } from '@bg3planner/shared';
import type { Ability } from '@bg3planner/shared';
import type { Feat } from '../schema';

// Source: bg3.wiki "Feats". bg3.wiki does not say which feats can be retaken; in game only
// Ability Improvement can be, so it alone is marked repeatable.

const plusOne = (...from: Ability[]) =>
  ({ type: 'ability-increase', points: 1, maxPerAbility: 1, from }) as const;

const magicInitiate = (className: string, list: string, ability: Ability): Feat => ({
  id: `magic-initiate-${list}`,
  name: `Magic Initiate: ${className}`,
  spellcastingAbility: ability,
  choices: [
    { type: 'cantrip', count: 2, from: { list } },
    // Castable once per long rest without a spell slot.
    { type: 'spell', count: 1, from: { list }, maxLevel: 1 },
  ],
});

export const feats = [
  {
    id: 'ability-improvement',
    name: 'Ability Improvement',
    repeatable: true,
    choices: [{ type: 'ability-increase', points: 2, maxPerAbility: 2, from: [...ABILITIES] }],
  },
  {
    id: 'actor',
    name: 'Actor',
    abilityIncrease: { charisma: 1 },
    expertise: ['deception', 'performance'],
  },
  { id: 'alert', name: 'Alert' },
  { id: 'athlete', name: 'Athlete', choices: [plusOne('strength', 'dexterity')] },
  { id: 'charger', name: 'Charger' },
  { id: 'crossbow-expert', name: 'Crossbow Expert' },
  {
    id: 'defensive-duellist',
    name: 'Defensive Duellist',
    requires: { abilities: { dexterity: 13 } },
  },
  { id: 'dual-wielder', name: 'Dual Wielder' },
  { id: 'dungeon-delver', name: 'Dungeon Delver' },
  { id: 'durable', name: 'Durable', abilityIncrease: { constitution: 1 } },
  {
    id: 'elemental-adept',
    name: 'Elemental Adept',
    choices: [{ type: 'option', group: 'elemental-adept-elements', count: 1 }],
  },
  { id: 'great-weapon-master', name: 'Great Weapon Master' },
  {
    id: 'heavily-armoured',
    name: 'Heavily Armoured',
    requires: { armour: 'medium' },
    abilityIncrease: { strength: 1 },
    armour: ['heavy'],
  },
  {
    id: 'heavy-armour-master',
    name: 'Heavy Armour Master',
    requires: { armour: 'heavy' },
    abilityIncrease: { strength: 1 },
  },
  {
    id: 'lightly-armoured',
    name: 'Lightly Armoured',
    armour: ['light'],
    choices: [plusOne('strength', 'dexterity')],
  },
  { id: 'lucky', name: 'Lucky' },
  { id: 'mage-slayer', name: 'Mage Slayer' },
  magicInitiate('Bard', 'bard', 'charisma'),
  magicInitiate('Cleric', 'cleric', 'wisdom'),
  magicInitiate('Druid', 'druid', 'wisdom'),
  magicInitiate('Sorcerer', 'sorcerer', 'charisma'),
  magicInitiate('Warlock', 'warlock', 'charisma'),
  magicInitiate('Wizard', 'wizard', 'intelligence'),
  {
    id: 'martial-adept',
    name: 'Martial Adept',
    resources: { 'superiority-dice': 1 },
    choices: [{ type: 'option', group: 'manoeuvres', count: 2 }],
  },
  { id: 'medium-armour-master', name: 'Medium Armour Master', requires: { armour: 'medium' } },
  { id: 'mobile', name: 'Mobile' },
  {
    id: 'moderately-armoured',
    name: 'Moderately Armoured',
    requires: { armour: 'light' },
    armour: ['medium'],
    shields: true,
    choices: [plusOne('strength', 'dexterity')],
  },
  // Also grants musical instrument proficiency, which the planner does not track.
  { id: 'performer', name: 'Performer', abilityIncrease: { charisma: 1 } },
  { id: 'polearm-master', name: 'Polearm Master' },
  {
    id: 'resilient',
    name: 'Resilient',
    choices: [{ ...plusOne(...ABILITIES), savingThrowProficiency: true }],
  },
  {
    id: 'ritual-caster',
    name: 'Ritual Caster',
    choices: [
      {
        type: 'spell',
        count: 2,
        from: {
          spells: [
            'speak-with-dead',
            'find-familiar',
            'longstrider',
            'enhance-leap',
            'disguise-self',
            'speak-with-animals',
          ],
        },
        maxLevel: 3,
      },
    ],
  },
  { id: 'savage-attacker', name: 'Savage Attacker' },
  { id: 'sentinel', name: 'Sentinel' },
  { id: 'sharpshooter', name: 'Sharpshooter' },
  { id: 'shield-master', name: 'Shield Master' },
  { id: 'skilled', name: 'Skilled', choices: [{ type: 'skill', count: 3 }] },
  {
    id: 'spell-sniper',
    name: 'Spell Sniper',
    choices: [
      {
        type: 'cantrip',
        count: 1,
        from: {
          spells: [
            'bone-chill',
            'eldritch-blast',
            'fire-bolt',
            'ray-of-frost',
            'shocking-grasp',
            'thorn-whip',
          ],
        },
      },
    ],
  },
  { id: 'tavern-brawler', name: 'Tavern Brawler', choices: [plusOne('strength', 'constitution')] },
  { id: 'tough', name: 'Tough' },
  { id: 'war-caster', name: 'War Caster' },
  {
    id: 'weapon-master',
    name: 'Weapon Master',
    choices: [plusOne('strength', 'dexterity'), { type: 'weapon-proficiency', count: 4 }],
  },
] satisfies Feat[];
