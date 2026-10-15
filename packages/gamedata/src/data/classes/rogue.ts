import type { ClassDef, Feature, SpellSchool, SubclassDef } from '../../schema';
import type { ClassBundle } from './bundle';

// Source: bg3.wiki "Rogue", "Arcane Trickster", "Assassin", "Swashbuckler", "Thief".
//
// Not modelled (no field in the schema):
// - Sneak Attack damage (1d6 at level 1, +1d6 at levels 3, 5, 7, 9 and 11).

export const rogue = {
  id: 'rogue',
  name: 'Rogue',
  hitPoints: { firstLevel: 8, perLevel: 5 },
  savingThrows: ['dexterity', 'intelligence'],
  skillChoices: {
    count: 4,
    from: [
      'acrobatics',
      'athletics',
      'deception',
      'insight',
      'intimidation',
      'investigation',
      'perception',
      'performance',
      'persuasion',
      'sleight-of-hand',
      'stealth',
    ],
  },
  proficiencies: {
    armour: ['light'],
    shields: false,
    weapons: ['simple'],
    weaponTypes: ['hand-crossbows', 'longswords', 'rapiers', 'shortswords'],
  },
  multiclassProficiencies: { armour: ['light'], shields: false, weapons: [] },
  multiclassSkills: 1,
  subclassLevel: 3,
  levels: [
    {
      level: 1,
      features: ['sneak-attack-melee', 'sneak-attack-ranged'],
      choices: [{ type: 'expertise', count: 2 }],
    },
    {
      level: 2,
      features: ['cunning-action-dash', 'cunning-action-disengage', 'cunning-action-hide'],
      choices: [],
    },
    { level: 3, features: [], choices: [{ type: 'subclass' }] },
    { level: 4, features: [], choices: [{ type: 'feat' }] },
    { level: 5, features: ['uncanny-dodge'], choices: [] },
    { level: 6, features: [], choices: [{ type: 'expertise', count: 2 }] },
    { level: 7, features: ['evasion'], choices: [] },
    { level: 8, features: [], choices: [{ type: 'feat' }] },
    { level: 9, features: [], choices: [] },
    // BG3 gives Rogues an extra feat at level 10.
    { level: 10, features: [], choices: [{ type: 'feat' }] },
    { level: 11, features: ['reliable-talent'], choices: [] },
    { level: 12, features: [], choices: [{ type: 'feat' }] },
  ],
} satisfies ClassDef;

const enchantmentOrIllusion: SpellSchool[] = ['enchantment', 'illusion'];
const wizardList = { list: 'wizard' } as const;
const learn = (maxLevel: number) =>
  ({
    type: 'spell',
    count: 1,
    from: wizardList,
    maxLevel,
    schools: enchantmentOrIllusion,
  }) as const;
const learnAnySchool = (maxLevel: number) =>
  ({
    type: 'spell',
    count: 1,
    from: wizardList,
    maxLevel,
    label: 'Spell from any school',
  }) as const;
// Replacements come from the whole wizard list, up to the highest level the Arcane Trickster has
// slots for. bg3.wiki lists no replacement at Rogue levels 3, 10 and 11.
const replace = (maxLevel: number) =>
  ({ type: 'replace-spell', from: wizardList, maxLevel }) as const;

export const arcaneTrickster = {
  id: 'arcane-trickster',
  classId: 'rogue',
  name: 'Arcane Trickster',
  spellcasting: {
    kind: 'third',
    ability: 'intelligence',
    spellList: 'wizard',
    // Picks only: Mage Hand comes free on top (granted below as an always-prepared cantrip).
    cantripsKnown: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3],
    spellsKnown: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8],
    // From level 10 a single-class Arcane Trickster has six 1st-level and two 2nd-level slots
    // instead of the [4, 3] of a one-third caster (bg3.wiki "Arcane Trickster", Notes).
    slots: [[], [], [2], [3], [3], [3], [4, 2], [4, 2], [4, 2], [6, 2], [6, 2], [6, 2]],
  },
  levels: [
    {
      level: 3,
      features: ['mage-hand-legerdemain'],
      spells: ['mage-hand'],
      choices: [
        { type: 'cantrip', count: 2, from: wizardList },
        { type: 'spell', count: 2, from: wizardList, maxLevel: 1, schools: enchantmentOrIllusion },
        learnAnySchool(1),
      ],
    },
    { level: 4, features: [], choices: [learn(1), replace(1)] },
    { level: 5, features: [], choices: [replace(1)] },
    { level: 6, features: [], choices: [replace(1)] },
    { level: 7, features: [], choices: [learn(2), replace(2)] },
    { level: 8, features: [], choices: [learnAnySchool(2), replace(2)] },
    { level: 9, features: ['magical-ambush'], choices: [replace(2)] },
    {
      level: 10,
      features: [],
      choices: [{ type: 'cantrip', count: 1, from: wizardList }, learn(2)],
    },
    { level: 11, features: [], choices: [learn(2)] },
    { level: 12, features: [], choices: [replace(2)] },
  ],
} satisfies SubclassDef;

export const assassin = {
  id: 'assassin',
  classId: 'rogue',
  name: 'Assassin',
  levels: [
    {
      level: 3,
      features: ['assassins-alacrity', 'assassinate-ambush', 'assassinate-initiative'],
      choices: [],
    },
    { level: 9, features: ['infiltration-expertise'], choices: [] },
  ],
} satisfies SubclassDef;

export const swashbuckler = {
  id: 'swashbuckler',
  classId: 'rogue',
  name: 'Swashbuckler',
  addedIn: 'patch-8',
  levels: [
    {
      level: 3,
      // Rakish Sneak Attack replaces the normal Sneak Attack actions.
      features: [
        'fancy-footwork',
        'rakish-audacity',
        'rakish-sneak-attack-melee',
        'rakish-sneak-attack-ranged',
      ],
      choices: [],
    },
    {
      level: 4,
      features: [
        'dirty-trick-flick-o-the-wrist',
        'dirty-trick-sand-toss',
        'dirty-trick-vicious-mockery',
      ],
      choices: [],
    },
    { level: 9, features: ['panache'], choices: [] },
  ],
} satisfies SubclassDef;

export const thief = {
  id: 'thief',
  classId: 'rogue',
  name: 'Thief',
  levels: [
    { level: 3, features: ['fast-hands', 'second-story-work-falling'], choices: [] },
    { level: 9, features: ['supreme-sneak'], choices: [] },
  ],
} satisfies SubclassDef;

const rogueFeatures = [
  // Rogue
  { id: 'sneak-attack-melee', name: 'Sneak Attack (Melee)', kind: 'action' },
  { id: 'sneak-attack-ranged', name: 'Sneak Attack (Ranged)', kind: 'action' },
  { id: 'cunning-action-dash', name: 'Cunning Action: Dash', kind: 'action' },
  { id: 'cunning-action-disengage', name: 'Cunning Action: Disengage', kind: 'action' },
  { id: 'cunning-action-hide', name: 'Cunning Action: Hide', kind: 'action' },
  { id: 'uncanny-dodge', name: 'Uncanny Dodge', kind: 'reaction' },
  { id: 'reliable-talent', name: 'Reliable Talent', kind: 'passive' },
  // Arcane Trickster
  { id: 'mage-hand-legerdemain', name: 'Mage Hand Legerdemain', kind: 'passive' },
  { id: 'magical-ambush', name: 'Magical Ambush', kind: 'passive' },
  // Assassin
  { id: 'assassins-alacrity', name: "Assassin's Alacrity", kind: 'passive' },
  { id: 'assassinate-ambush', name: 'Assassinate: Ambush', kind: 'passive' },
  { id: 'assassinate-initiative', name: 'Assassinate: Initiative', kind: 'passive' },
  { id: 'infiltration-expertise', name: 'Infiltration Expertise', kind: 'action' },
  // Swashbuckler
  { id: 'fancy-footwork', name: 'Fancy Footwork', kind: 'passive' },
  { id: 'rakish-audacity', name: 'Rakish Audacity', kind: 'passive' },
  { id: 'rakish-sneak-attack-melee', name: 'Rakish Sneak Attack (Melee)', kind: 'action' },
  { id: 'rakish-sneak-attack-ranged', name: 'Rakish Sneak Attack (Ranged)', kind: 'action' },
  {
    id: 'dirty-trick-flick-o-the-wrist',
    name: "Dirty Trick: Flick o' the Wrist",
    kind: 'action',
  },
  { id: 'dirty-trick-sand-toss', name: 'Dirty Trick: Sand Toss', kind: 'action' },
  { id: 'dirty-trick-vicious-mockery', name: 'Dirty Trick: Vicious Mockery', kind: 'action' },
  { id: 'panache', name: 'Panache', kind: 'action' },
  // Thief
  { id: 'fast-hands', name: 'Fast Hands', kind: 'passive' },
  { id: 'second-story-work-falling', name: 'Second-Story Work: Falling', kind: 'passive' },
  { id: 'supreme-sneak', name: 'Supreme Sneak', kind: 'action' },
] satisfies Feature[];

export const rogueBundle: ClassBundle = {
  cls: rogue,
  subclasses: [arcaneTrickster, assassin, swashbuckler, thief],
  features: rogueFeatures,
  optionGroups: [],
};
