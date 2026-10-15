import type { ClassDef, Feature, Option, OptionGroup, SubclassDef } from '../../schema';
import type { ClassBundle } from './bundle';

// Source: bg3.wiki "Sorcerer", "Metamagic", "Draconic Bloodline", "Shadow Magic",
// "Storm Sorcery", "Wild Magic (sorcerer subclass)", "Classes#Multiclassing" (Patch 8).

const sorcererList = { list: 'sorcerer' } as const;
const learn = (maxLevel: number) =>
  ({ type: 'spell', count: 1, from: sorcererList, maxLevel }) as const;
/** From level 2 on, every Sorcerer level may swap one known spell (bg3.wiki "Sorcerer"). */
const replace = (maxLevel: number) =>
  ({ type: 'replace-spell', from: sorcererList, maxLevel }) as const;
const cantrip = (count: number) => ({ type: 'cantrip', count, from: sorcererList }) as const;
const metamagic = (count: number) =>
  ({ type: 'option', group: 'sorcerer-metamagic', count }) as const;
const sorceryPoints = (total: number) => ({ 'sorcery-points': total });
const ancestry = (id: string, colour: string, element: string, spell: string): Option => ({
  id,
  name: `${colour} (${element})`,
  wikiPage: `Draconic Ancestry: ${colour} (${element})`,
  grants: { spells: [spell] },
});

const sorcerer = {
  id: 'sorcerer',
  name: 'Sorcerer',
  hitPoints: { firstLevel: 6, perLevel: 4 },
  savingThrows: ['constitution', 'charisma'],
  skillChoices: {
    count: 2,
    from: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
  },
  proficiencies: {
    armour: [],
    shields: false,
    weapons: [],
    weaponTypes: ['daggers', 'quarterstaves', 'light-crossbows'],
  },
  // "No additional proficiencies are granted when multiclassing into Sorcerer."
  multiclassProficiencies: { armour: [], shields: false, weapons: [] },
  subclassLevel: 1,
  spellcasting: {
    kind: 'full',
    ability: 'charisma',
    spellList: 'sorcerer',
    preparation: 'known',
    cantripsKnown: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6],
    spellsKnown: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
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
      features: [],
      choices: [
        { type: 'subclass' },
        cantrip(4),
        { type: 'spell', count: 2, from: sorcererList, maxLevel: 1 },
      ],
    },
    {
      level: 2,
      features: ['create-spell-slot', 'create-sorcery-points'],
      resources: sorceryPoints(2),
      choices: [metamagic(2), learn(1), replace(1)],
    },
    {
      level: 3,
      features: [],
      resources: sorceryPoints(3),
      choices: [metamagic(1), learn(2), replace(2)],
    },
    {
      level: 4,
      features: [],
      resources: sorceryPoints(4),
      choices: [{ type: 'feat' }, cantrip(1), learn(2), replace(2)],
    },
    { level: 5, features: [], resources: sorceryPoints(5), choices: [learn(3), replace(3)] },
    { level: 6, features: [], resources: sorceryPoints(6), choices: [learn(3), replace(3)] },
    { level: 7, features: [], resources: sorceryPoints(7), choices: [learn(4), replace(4)] },
    {
      level: 8,
      features: [],
      resources: sorceryPoints(8),
      choices: [{ type: 'feat' }, learn(4), replace(4)],
    },
    { level: 9, features: [], resources: sorceryPoints(9), choices: [learn(5), replace(5)] },
    {
      level: 10,
      features: [],
      resources: sorceryPoints(10),
      choices: [metamagic(1), cantrip(1), learn(5), replace(5)],
    },
    { level: 11, features: [], resources: sorceryPoints(11), choices: [learn(6), replace(6)] },
    {
      level: 12,
      features: [],
      resources: sorceryPoints(12),
      choices: [{ type: 'feat' }, learn(6), replace(6)],
    },
  ],
} satisfies ClassDef;

const draconicBloodline = {
  id: 'draconic-bloodline',
  classId: 'sorcerer',
  name: 'Draconic Bloodline',
  levels: [
    {
      level: 1,
      // The rules engine gives Draconic Resilience its +1 HP per Sorcerer level and 13 + Dex AC.
      features: ['draconic-resilience'],
      choices: [{ type: 'option', group: 'sorcerer-draconic-ancestry', count: 1 }],
    },
    {
      level: 6,
      features: ['elemental-affinity-damage', 'elemental-affinity-resistance'],
      choices: [],
    },
    { level: 11, features: ['draconic-bloodline-fly'], choices: [] },
  ],
} satisfies SubclassDef;

const shadowMagic = {
  id: 'shadow-magic',
  classId: 'sorcerer',
  name: 'Shadow Magic',
  addedIn: 'patch-8',
  levels: [
    { level: 1, features: ['eyes-of-the-dark', 'strength-of-the-grave'], choices: [] },
    // "Gain 2 free spells": Darkness, and a version cast with Sorcery Points that the caster sees through.
    { level: 3, features: [], spells: ['darkness', 'eyes-of-the-dark-darkness'], choices: [] },
    { level: 6, features: ['hound-of-ill-omen'], choices: [] },
    { level: 11, features: ['shadow-walk'], choices: [] },
  ],
} satisfies SubclassDef;

const stormSorcery = {
  id: 'storm-sorcery',
  classId: 'sorcerer',
  name: 'Storm Sorcery',
  levels: [
    { level: 1, features: ['tempestuous-magic'], choices: [] },
    {
      level: 6,
      features: [
        'heart-of-the-storm-lightning',
        'heart-of-the-storm-thunder',
        'heart-of-the-storm-resistance',
      ],
      // Storm Spells.
      spells: [
        'thunderwave',
        'create-or-destroy-water',
        'gust-of-wind',
        'sleet-storm',
        'call-lightning',
      ],
      choices: [],
    },
    { level: 11, features: ['storms-fury'], choices: [] },
  ],
} satisfies SubclassDef;

const wildMagicSorcerer = {
  id: 'wild-magic-sorcerer',
  classId: 'sorcerer',
  name: 'Wild Magic',
  levels: [
    { level: 1, features: ['wild-magic-sorcerer-surge', 'tides-of-chaos'], choices: [] },
    { level: 6, features: ['bend-luck'], choices: [] },
    { level: 11, features: ['controlled-chaos'], choices: [] },
  ],
} satisfies SubclassDef;

const features = [
  // Sorcerer
  { id: 'create-spell-slot', name: 'Create Spell Slot', kind: 'action' },
  { id: 'create-sorcery-points', name: 'Create Sorcery Points', kind: 'action' },
  // Draconic Bloodline
  { id: 'elemental-affinity-damage', name: 'Elemental Affinity: Damage', kind: 'passive' },
  { id: 'elemental-affinity-resistance', name: 'Elemental Affinity: Resistance', kind: 'reaction' },
  { id: 'draconic-bloodline-fly', name: 'Fly', kind: 'action', wikiPage: 'Fly (class action)' },
  // Shadow Magic
  { id: 'eyes-of-the-dark', name: 'Eyes of the Dark', kind: 'passive' },
  { id: 'strength-of-the-grave', name: 'Strength of the Grave', kind: 'passive' },
  { id: 'hound-of-ill-omen', name: 'Hound of Ill Omen', kind: 'action' },
  { id: 'shadow-walk', name: 'Shadow Walk', kind: 'action' },
  // Storm Sorcery
  { id: 'tempestuous-magic', name: 'Tempestuous Magic', kind: 'passive' },
  {
    id: 'heart-of-the-storm-lightning',
    name: 'Heart of the Storm: Lightning',
    kind: 'reaction',
    wikiPage: 'Heart of the Storm',
  },
  {
    id: 'heart-of-the-storm-thunder',
    name: 'Heart of the Storm: Thunder',
    kind: 'reaction',
    wikiPage: 'Heart of the Storm',
  },
  { id: 'heart-of-the-storm-resistance', name: 'Heart of the Storm: Resistance', kind: 'passive' },
  {
    id: 'storms-fury',
    name: "Storm's Fury",
    kind: 'reaction',
    wikiPage: "Storm's Fury (passive feature)",
  },
  // Wild Magic
  {
    id: 'wild-magic-sorcerer-surge',
    name: 'Wild Magic',
    kind: 'passive',
    wikiPage: 'Wild Magic (passive feature)',
  },
  { id: 'tides-of-chaos', name: 'Tides of Chaos', kind: 'reaction' },
  { id: 'bend-luck', name: 'Bend Luck', kind: 'reaction', wikiPage: 'Bend Luck (passive feature)' },
  { id: 'controlled-chaos', name: 'Controlled Chaos', kind: 'reaction' },
] satisfies Feature[];

const optionGroups = [
  {
    id: 'sorcerer-metamagic',
    name: 'Metamagic',
    options: [
      {
        id: 'careful-spell',
        name: 'Careful Spell',
        minClassLevel: 2,
        wikiPage: 'Metamagic: Careful Spell',
      },
      {
        id: 'distant-spell',
        name: 'Distant Spell',
        minClassLevel: 2,
        wikiPage: 'Metamagic: Distant Spell',
      },
      {
        id: 'extended-spell',
        name: 'Extended Spell',
        minClassLevel: 2,
        wikiPage: 'Metamagic: Extended Spell',
      },
      {
        id: 'twinned-spell',
        name: 'Twinned Spell',
        minClassLevel: 2,
        wikiPage: 'Metamagic: Twinned Spell',
      },
      {
        id: 'heightened-spell',
        name: 'Heightened Spell',
        minClassLevel: 3,
        wikiPage: 'Metamagic: Heightened Spell',
      },
      {
        id: 'quickened-spell',
        name: 'Quickened Spell',
        minClassLevel: 3,
        wikiPage: 'Metamagic: Quickened Spell',
      },
      {
        id: 'subtle-spell',
        name: 'Subtle Spell',
        minClassLevel: 3,
        wikiPage: 'Metamagic: Subtle Spell',
      },
    ],
  },
  {
    id: 'sorcerer-draconic-ancestry',
    name: 'Draconic Ancestry',
    // The ancestry sets the damage type of Elemental Affinity and grants one spell (bg3.wiki
    // "Draconic Bloodline"); Grease, Armour of Agathys and Tasha's Hideous Laughter are not
    // otherwise on the Sorcerer list.
    options: [
      ancestry('red', 'Red', 'Fire', 'burning-hands'),
      ancestry('black', 'Black', 'Acid', 'grease'),
      ancestry('blue', 'Blue', 'Lightning', 'witch-bolt'),
      ancestry('white', 'White', 'Cold', 'armour-of-agathys'),
      ancestry('green', 'Green', 'Poison', 'ray-of-sickness'),
      ancestry('gold', 'Gold', 'Fire', 'disguise-self'),
      ancestry('silver', 'Silver', 'Cold', 'feather-fall'),
      ancestry('bronze', 'Bronze', 'Lightning', 'fog-cloud'),
      ancestry('copper', 'Copper', 'Acid', 'tashas-hideous-laughter'),
      ancestry('brass', 'Brass', 'Fire', 'sleep'),
    ],
  },
] satisfies OptionGroup[];

export const sorcererBundle: ClassBundle = {
  cls: sorcerer,
  subclasses: [draconicBloodline, shadowMagic, stormSorcery, wildMagicSorcerer],
  features,
  optionGroups,
};
