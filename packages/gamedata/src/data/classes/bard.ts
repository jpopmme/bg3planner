import type { ClassDef, Feature, SubclassDef } from '../../schema';
import type { ClassBundle } from './bundle';

// Source: bg3.wiki "Bard", "College of Glamour", "College of Lore", "College of Swords",
// "College of Valour", "Magical Secrets", "Blade Flourish", "Classes" (multiclass proficiencies).
//
// Not modelled (no field in the schema):
// - musical instrument proficiency;
// - Bardic Inspiration die size (d6, d8 at level 5, d10 at level 10) and the targets and temporary
//   hit points of Mantle of Inspiration growing at Bard levels 6 and 10.

const bardList = { list: 'bard' } as const;
const learn = (maxLevel: number) =>
  ({ type: 'spell', count: 1, from: bardList, maxLevel }) as const;
// From level 2 on, one known spell can be swapped for another Bard spell on every level up.
const replace = (maxLevel: number) =>
  ({ type: 'replace-spell', from: bardList, maxLevel }) as const;

/** The game's fixed Magical Secrets list, cantrips included (bg3.wiki "Magical Secrets"). */
export const magicalSecretsSpells = [
  // Cantrips
  'bone-chill',
  'eldritch-blast',
  'fire-bolt',
  'ray-of-frost',
  'sacred-flame',
  // 1st level
  'armour-of-agathys',
  'bless',
  'chromatic-orb',
  'command',
  'entangle',
  'false-life',
  'guiding-bolt',
  'hellish-rebuke',
  'hex',
  'hunters-mark',
  'ice-knife',
  'magic-missile',
  'sanctuary',
  'thunderous-smite',
  // 2nd level
  'arcane-lock',
  'blur',
  'darkness',
  'darkvision',
  'misty-step',
  'pass-without-trace',
  'ray-of-enfeeblement',
  'scorching-ray',
  'spike-growth',
  'spiritual-weapon',
  'web',
  // 3rd level
  'animate-dead',
  'call-lightning',
  'counterspell',
  'crusaders-mantle',
  'daylight',
  'fireball',
  'gaseous-form',
  'grant-flight',
  'haste',
  'hunger-of-hadar',
  'lightning-bolt',
  'mass-healing-word',
  'remove-curse',
  'revivify',
  'sleet-storm',
  'slow',
  'spirit-guardians',
  'vampiric-touch',
  'warden-of-vitality',
  // 4th level
  'banishment',
  'blight',
  'death-ward',
  'dominate-beast',
  'fire-shield',
  'guardian-of-faith',
  'ice-storm',
  'wall-of-fire',
  // 5th level
  'banishing-smite',
  'cone-of-cold',
  'conjure-elemental',
  'contagion',
  'wall-of-stone',
];

/** Two spells (or cantrips) from the list, learned on top of the Bard's spells known. */
const magicalSecrets = (maxLevel: number) =>
  ({
    type: 'spell',
    count: 2,
    from: { spells: magicalSecretsSpells },
    minLevel: 0,
    maxLevel,
    label: 'Magical Secrets',
    extra: true,
  }) as const;

export const bard = {
  id: 'bard',
  name: 'Bard',
  hitPoints: { firstLevel: 8, perLevel: 5 },
  savingThrows: ['dexterity', 'charisma'],
  skillChoices: {
    count: 3,
    from: [
      'athletics',
      'acrobatics',
      'sleight-of-hand',
      'stealth',
      'arcana',
      'history',
      'investigation',
      'nature',
      'religion',
      'animal-handling',
      'insight',
      'medicine',
      'perception',
      'survival',
      'deception',
      'intimidation',
      'performance',
      'persuasion',
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
  spellcasting: {
    kind: 'full',
    ability: 'charisma',
    spellList: 'bard',
    preparation: 'known',
    cantripsKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4],
    spellsKnown: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    slots: [
      [2],
      [3],
      [4, 2],
      [4, 3],
      [4, 3, 2],
      [4, 3, 3],
      [4, 3, 3, 1],
      [4, 3, 3, 2],
      [4, 3, 3, 3, 1],
      [4, 3, 3, 3, 2],
      [4, 3, 3, 3, 2, 1],
      [4, 3, 3, 3, 2, 1],
    ],
  },
  levels: [
    {
      level: 1,
      features: ['bardic-inspiration'],
      resources: { 'bardic-inspiration': 3 },
      choices: [
        { type: 'cantrip', count: 2, from: bardList },
        { type: 'spell', count: 4, from: bardList, maxLevel: 1 },
      ],
    },
    {
      level: 2,
      features: ['song-of-rest', 'jack-of-all-trades'],
      choices: [learn(1), replace(1)],
    },
    {
      level: 3,
      features: [],
      choices: [{ type: 'subclass' }, { type: 'expertise', count: 2 }, learn(2), replace(2)],
    },
    {
      level: 4,
      features: [],
      choices: [
        { type: 'feat' },
        { type: 'cantrip', count: 1, from: bardList },
        learn(2),
        replace(2),
      ],
    },
    {
      level: 5,
      // Font of Inspiration: Bardic Inspiration also recharges on a short rest.
      features: ['improved-bardic-inspiration-d8', 'font-of-inspiration'],
      resources: { 'bardic-inspiration': 4 },
      choices: [learn(3), replace(3)],
    },
    { level: 6, features: ['countercharm'], choices: [learn(3), replace(3)] },
    { level: 7, features: [], choices: [learn(4), replace(4)] },
    {
      level: 8,
      features: [],
      resources: { 'bardic-inspiration': 5 },
      choices: [{ type: 'feat' }, learn(4), replace(4)],
    },
    { level: 9, features: [], choices: [learn(5), replace(5)] },
    {
      level: 10,
      features: ['improved-bardic-inspiration-d10'],
      choices: [
        { type: 'expertise', count: 2 },
        magicalSecrets(5),
        { type: 'cantrip', count: 1, from: bardList },
        learn(5),
        replace(5),
      ],
    },
    { level: 11, features: [], choices: [learn(6), replace(6)] },
    { level: 12, features: [], choices: [{ type: 'feat' }, learn(6), replace(6)] },
  ],
} satisfies ClassDef;

export const collegeOfGlamour = {
  id: 'college-of-glamour',
  classId: 'bard',
  name: 'College of Glamour',
  addedIn: 'patch-8',
  levels: [
    { level: 3, features: ['mantle-of-inspiration'], choices: [] },
    { level: 6, features: ['mantle-of-majesty-command'], choices: [] },
  ],
} satisfies SubclassDef;

export const collegeOfLore = {
  id: 'college-of-lore',
  classId: 'bard',
  name: 'College of Lore',
  levels: [
    { level: 3, features: ['cutting-words'], choices: [{ type: 'skill', count: 3 }] },
    // Limited to spells of level 3 or lower.
    { level: 6, features: [], choices: [magicalSecrets(3)] },
  ],
} satisfies SubclassDef;

export const collegeOfSwords = {
  id: 'college-of-swords',
  classId: 'bard',
  name: 'College of Swords',
  levels: [
    {
      level: 3,
      // Blade Flourish: each flourish comes as a melee and a ranged action.
      features: [
        'defensive-flourish-melee',
        'defensive-flourish-ranged',
        'slashing-flourish-melee',
        'slashing-flourish-ranged',
        'mobile-flourish-melee',
        'mobile-flourish-ranged',
      ],
      proficiencies: { armour: ['medium'], weaponTypes: ['scimitars'] },
      choices: [
        {
          type: 'option',
          group: 'fighting-styles',
          count: 1,
          only: ['duelling', 'two-weapon-fighting'],
        },
      ],
    },
    { level: 6, features: ['extra-attack'], choices: [] },
  ],
} satisfies SubclassDef;

export const collegeOfValour = {
  id: 'college-of-valour',
  classId: 'bard',
  name: 'College of Valour',
  levels: [
    {
      level: 3,
      features: ['combat-inspiration'],
      proficiencies: { armour: ['medium'], shields: true, weapons: ['martial'] },
      choices: [],
    },
    { level: 6, features: ['extra-attack'], choices: [] },
  ],
} satisfies SubclassDef;

const bardFeatures = [
  // Bard
  {
    id: 'bardic-inspiration',
    name: 'Bardic Inspiration',
    kind: 'action',
    wikiPage: 'Bardic Inspiration (class action)',
  },
  { id: 'song-of-rest', name: 'Song of Rest', kind: 'action' },
  {
    id: 'improved-bardic-inspiration-d8',
    name: 'Improved Bardic Inspiration',
    kind: 'passive',
    wikiPage: 'Improved Bardic Inspiration (passive feature)',
  },
  {
    id: 'improved-bardic-inspiration-d10',
    name: 'Improved Bardic Inspiration',
    kind: 'passive',
    wikiPage: 'Improved Bardic Inspiration (passive feature)',
  },
  { id: 'font-of-inspiration', name: 'Font of Inspiration', kind: 'passive' },
  { id: 'countercharm', name: 'Countercharm', kind: 'action' },
  // College of Glamour
  { id: 'mantle-of-inspiration', name: 'Mantle of Inspiration', kind: 'action' },
  { id: 'mantle-of-majesty-command', name: 'Mantle of Majesty: Command', kind: 'action' },
  // College of Lore
  { id: 'cutting-words', name: 'Cutting Words', kind: 'reaction' },
  // College of Swords
  { id: 'defensive-flourish-melee', name: 'Defensive Flourish (Melee)', kind: 'action' },
  { id: 'defensive-flourish-ranged', name: 'Defensive Flourish (Ranged)', kind: 'action' },
  { id: 'slashing-flourish-melee', name: 'Slashing Flourish (Melee)', kind: 'action' },
  { id: 'slashing-flourish-ranged', name: 'Slashing Flourish (Ranged)', kind: 'action' },
  { id: 'mobile-flourish-melee', name: 'Mobile Flourish (Melee)', kind: 'action' },
  { id: 'mobile-flourish-ranged', name: 'Mobile Flourish (Ranged)', kind: 'action' },
  // College of Valour
  { id: 'combat-inspiration', name: 'Combat Inspiration', kind: 'action' },
] satisfies Feature[];

export const bardBundle: ClassBundle = {
  cls: bard,
  subclasses: [collegeOfGlamour, collegeOfLore, collegeOfSwords, collegeOfValour],
  features: bardFeatures,
  optionGroups: [],
};
