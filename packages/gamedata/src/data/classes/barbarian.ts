import type { ClassDef, Feature, OptionGroup, SubclassDef } from '../../schema';
import type { ClassBundle } from './bundle';

// Source: bg3.wiki "Barbarian", "Berserker", "Giant (barbarian subclass)",
// "Wild Magic (barbarian subclass)", "Wildheart", "Classes" (multiclass proficiencies).

const barbarian = {
  id: 'barbarian',
  name: 'Barbarian',
  hitPoints: { firstLevel: 12, perLevel: 7 },
  savingThrows: ['strength', 'constitution'],
  skillChoices: {
    count: 2,
    from: ['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
  },
  proficiencies: { armour: ['light', 'medium'], shields: true, weapons: ['simple', 'martial'] },
  // BG3 grants no armour when Barbarian is a later class.
  multiclassProficiencies: { armour: [], shields: true, weapons: ['simple', 'martial'] },
  subclassLevel: 3,
  levels: [
    {
      level: 1,
      features: ['rage', 'unarmoured-defence-barbarian'],
      choices: [],
      resources: { 'rage-charges': 2 },
    },
    { level: 2, features: ['reckless-attack', 'danger-sense'], choices: [] },
    { level: 3, features: [], choices: [{ type: 'subclass' }], resources: { 'rage-charges': 3 } },
    { level: 4, features: [], choices: [{ type: 'feat' }] },
    { level: 5, features: ['extra-attack', 'fast-movement'], choices: [] },
    { level: 6, features: [], choices: [], resources: { 'rage-charges': 4 } },
    { level: 7, features: ['feral-instinct'], choices: [] },
    { level: 8, features: [], choices: [{ type: 'feat' }] },
    { level: 9, features: ['brutal-critical'], choices: [] },
    { level: 10, features: [], choices: [] },
    { level: 11, features: ['relentless-rage'], choices: [] },
    { level: 12, features: [], choices: [{ type: 'feat' }], resources: { 'rage-charges': 5 } },
  ],
} satisfies ClassDef;

const berserker = {
  id: 'berserker',
  classId: 'barbarian',
  name: 'Berserker',
  levels: [
    {
      level: 3,
      features: ['rage-becomes-frenzy', 'frenzy', 'frenzied-strike', 'enraged-throw'],
      choices: [],
    },
    { level: 6, features: ['mindless-rage'], choices: [] },
    { level: 10, features: ['intimidating-presence'], choices: [] },
  ],
} satisfies SubclassDef;

const giant = {
  id: 'giant',
  classId: 'barbarian',
  name: 'Giant',
  addedIn: 'patch-8',
  levels: [
    {
      level: 3,
      features: ['giants-rage', 'vapraks-greed'],
      spells: ['thaumaturgy'],
      choices: [],
    },
    { level: 5, features: ['boot-of-the-giants'], choices: [] },
    { level: 6, features: ['elemental-cleaver'], choices: [] },
    { level: 10, features: ['mighty-impel'], choices: [] },
  ],
} satisfies SubclassDef;

const wildMagic = {
  id: 'wild-magic-barbarian',
  classId: 'barbarian',
  name: 'Wild Magic',
  levels: [
    { level: 3, features: ['rage-wild-magic', 'magic-awareness'], choices: [] },
    {
      level: 6,
      features: [
        'bolstering-magic-boon',
        'bolstering-magic-level-1-spell-slot',
        'bolstering-magic-level-2-spell-slot',
      ],
      choices: [],
    },
    { level: 9, features: ['bolstering-magic-level-3-spell-slot'], choices: [] },
    { level: 10, features: ['unstable-backlash'], choices: [] },
  ],
} satisfies SubclassDef;

const wildheart = {
  id: 'wildheart',
  classId: 'barbarian',
  name: 'Wildheart',
  levels: [
    {
      level: 3,
      // The Bestial Heart can be swapped on any later Barbarian level.
      features: [],
      spells: ['speak-with-animals'],
      choices: [{ type: 'option', group: 'bestial-hearts', count: 1 }],
    },
    { level: 6, features: [], choices: [{ type: 'option', group: 'animal-aspects', count: 1 }] },
    {
      level: 8,
      // bg3.wiki: only Difficult Terrain is listed in game, but all three are granted.
      features: [
        'barbarian-lands-stride-difficult-terrain',
        'lands-stride-advantage', // shared with Circle of the Land
        'barbarian-lands-stride-plants',
      ],
      choices: [],
    },
    // A second Aspect of the Beast, kept alongside the first.
    { level: 10, features: [], choices: [{ type: 'option', group: 'animal-aspects', count: 1 }] },
  ],
} satisfies SubclassDef;

const features: Feature[] = [
  // Barbarian
  { id: 'rage', name: 'Rage', kind: 'action' },
  { id: 'reckless-attack', name: 'Reckless Attack', kind: 'action' },
  { id: 'danger-sense', name: 'Danger Sense', kind: 'passive' },
  { id: 'feral-instinct', name: 'Feral Instinct', kind: 'passive' },
  { id: 'brutal-critical', name: 'Brutal Critical', kind: 'passive' },
  { id: 'relentless-rage', name: 'Relentless Rage', kind: 'passive' },
  // Berserker
  { id: 'rage-becomes-frenzy', name: 'Rage Becomes Frenzy', kind: 'passive' },
  { id: 'frenzy', name: 'Frenzy', kind: 'action' },
  { id: 'frenzied-strike', name: 'Frenzied Strike', kind: 'action' },
  { id: 'enraged-throw', name: 'Enraged Throw', kind: 'action' },
  { id: 'mindless-rage', name: 'Mindless Rage', kind: 'passive' },
  { id: 'intimidating-presence', name: 'Intimidating Presence', kind: 'action' },
  // Giant
  { id: 'giants-rage', name: "Giant's Rage", kind: 'action' },
  { id: 'vapraks-greed', name: "Vaprak's Greed", kind: 'passive' },
  { id: 'boot-of-the-giants', name: 'Boot of the Giants', kind: 'action' },
  { id: 'elemental-cleaver', name: 'Elemental Cleaver', kind: 'action' },
  { id: 'mighty-impel', name: 'Mighty Impel', kind: 'action' },
  // Wild Magic
  { id: 'rage-wild-magic', name: 'Rage: Wild Magic', kind: 'action' },
  { id: 'magic-awareness', name: 'Magic Awareness', kind: 'action' },
  { id: 'bolstering-magic-boon', name: 'Bolstering Magic: Boon', kind: 'action' },
  {
    id: 'bolstering-magic-level-1-spell-slot',
    name: 'Bolstering Magic: Level 1 Spell Slot',
    kind: 'action',
  },
  {
    id: 'bolstering-magic-level-2-spell-slot',
    name: 'Bolstering Magic: Level 2 Spell Slot',
    kind: 'action',
  },
  {
    id: 'bolstering-magic-level-3-spell-slot',
    name: 'Bolstering Magic: Level 3 Spell Slot',
    kind: 'action',
  },
  { id: 'unstable-backlash', name: 'Unstable Backlash', kind: 'reaction' },
  // Wildheart
  { id: 'rage-bear-heart', name: 'Rage: Bear Heart', kind: 'action' },
  { id: 'unrelenting-ferocity', name: 'Unrelenting Ferocity', kind: 'action' },
  { id: 'rage-eagle-heart', name: 'Rage: Eagle Heart', kind: 'action' },
  { id: 'diving-strike', name: 'Diving Strike', kind: 'action' },
  { id: 'rage-elk-heart', name: 'Rage: Elk Heart', kind: 'action' },
  { id: 'primal-stampede', name: 'Primal Stampede', kind: 'action' },
  { id: 'rage-tiger-heart', name: 'Rage: Tiger Heart', kind: 'action' },
  { id: 'tigers-bloodlust', name: "Tiger's Bloodlust", kind: 'action' },
  { id: 'rage-wolf-heart', name: 'Rage: Wolf Heart', kind: 'action' },
  { id: 'inciting-howl', name: 'Inciting Howl', kind: 'action' },
  {
    id: 'barbarian-lands-stride-difficult-terrain',
    name: "Land's Stride: Difficult Terrain",
    kind: 'passive',
  },
  { id: 'barbarian-lands-stride-plants', name: "Land's Stride: Plants", kind: 'passive' },
];

const heart = (animal: string, actionId: string) => {
  const slug = animal.toLowerCase();
  return {
    id: `${slug}-heart`,
    name: `${animal} Heart`,
    grants: { features: [`rage-${slug}-heart`, actionId] },
  };
};

const aspect = (animal: string) => ({
  id: animal.toLowerCase().replace(/ /g, '-'),
  name: animal,
  wikiPage: `Aspect of the Beast: ${animal}`,
});

const optionGroups: OptionGroup[] = [
  {
    id: 'bestial-hearts',
    name: 'Bestial Heart',
    options: [
      heart('Bear', 'unrelenting-ferocity'),
      heart('Eagle', 'diving-strike'),
      heart('Elk', 'primal-stampede'),
      heart('Tiger', 'tigers-bloodlust'),
      heart('Wolf', 'inciting-howl'),
    ],
  },
  {
    id: 'animal-aspects',
    name: 'Aspect of the Beast',
    options: [
      aspect('Bear'),
      aspect('Chimpanzee'),
      aspect('Crocodile'),
      aspect('Eagle'),
      aspect('Elk'),
      aspect('Honey Badger'),
      aspect('Stallion'),
      { ...aspect('Tiger'), grants: { skills: ['survival'] } },
      aspect('Wolf'),
      aspect('Wolverine'),
    ],
  },
];

export const barbarianBundle: ClassBundle = {
  cls: barbarian,
  subclasses: [berserker, giant, wildMagic, wildheart],
  features,
  optionGroups,
};
