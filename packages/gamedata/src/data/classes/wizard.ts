import type { ClassDef, Feature, SubclassDef } from '../../schema';
import type { ClassBundle } from './bundle';

// Source: bg3.wiki "Wizard", "Abjuration School", "Bladesinging", "Conjuration School",
// "Divination School", "Enchantment School", "Evocation School", "Illusion School",
// "Necromancy School", "Transmutation School", "Classes#Multiclassing" (Patch 8).

const wizardList = { list: 'wizard' } as const;
/** Spells learned into the spellbook on level-up (the "Spells Learned" column). */
const learn = (count: number, maxLevel: number) =>
  ({ type: 'spell', count, from: wizardList, maxLevel }) as const;
const cantrip = (count: number) => ({ type: 'cantrip', count, from: wizardList }) as const;

const wizard = {
  id: 'wizard',
  name: 'Wizard',
  hitPoints: { firstLevel: 6, perLevel: 4 },
  savingThrows: ['intelligence', 'wisdom'],
  skillChoices: {
    count: 2,
    from: ['arcana', 'history', 'investigation', 'insight', 'medicine', 'religion'],
  },
  proficiencies: {
    armour: [],
    shields: false,
    weapons: [],
    weaponTypes: ['daggers', 'quarterstaves', 'light-crossbows'],
  },
  // "No proficiencies are granted when multiclassing into Wizard."
  multiclassProficiencies: { armour: [], shields: false, weapons: [] },
  subclassLevel: 2,
  spellcasting: {
    kind: 'full',
    ability: 'intelligence',
    spellList: 'wizard',
    // Prepared spells per day are Wizard level + Intelligence modifier (minimum 1).
    preparation: 'spellbook',
    cantripsKnown: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5],
    // Spellbook size ("Spells Learned"), not counting spells transcribed from scrolls.
    spellsKnown: [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28],
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
      features: ['arcane-recovery'],
      resources: { 'arcane-recovery-charges': 1 },
      choices: [cantrip(3), learn(6, 1)],
    },
    { level: 2, features: [], choices: [{ type: 'subclass' }, learn(2, 1)] },
    {
      level: 3,
      features: [],
      resources: { 'arcane-recovery-charges': 2 },
      choices: [learn(2, 2)],
    },
    { level: 4, features: [], choices: [{ type: 'feat' }, cantrip(1), learn(2, 2)] },
    {
      level: 5,
      features: [],
      resources: { 'arcane-recovery-charges': 3 },
      choices: [learn(2, 3)],
    },
    { level: 6, features: [], choices: [learn(2, 3)] },
    {
      level: 7,
      features: [],
      resources: { 'arcane-recovery-charges': 4 },
      choices: [learn(2, 4)],
    },
    { level: 8, features: [], choices: [{ type: 'feat' }, learn(2, 4)] },
    {
      level: 9,
      features: [],
      resources: { 'arcane-recovery-charges': 5 },
      choices: [learn(2, 5)],
    },
    { level: 10, features: [], choices: [cantrip(1), learn(2, 5)] },
    {
      level: 11,
      features: [],
      resources: { 'arcane-recovery-charges': 6 },
      choices: [learn(2, 6)],
    },
    { level: 12, features: [], choices: [{ type: 'feat' }, learn(2, 6)] },
  ],
} satisfies ClassDef;

// Each school's Savant feature halves the gold cost of transcribing that school's scrolls.

const abjurationSchool = {
  id: 'abjuration-school',
  classId: 'wizard',
  name: 'Abjuration School',
  levels: [
    { level: 2, features: ['abjuration-savant', 'arcane-ward'], choices: [] },
    { level: 6, features: ['projected-ward'], choices: [] },
    { level: 10, features: ['improved-abjuration'], choices: [] },
  ],
} satisfies SubclassDef;

const bladesinging = {
  id: 'bladesinging',
  classId: 'wizard',
  name: 'Bladesinging',
  addedIn: 'patch-8',
  levels: [
    {
      level: 2,
      features: ['bladesong', 'training-in-war-and-song'],
      resources: { 'bladesong-power': 2 },
      // Training in War and Song (also when Wizard is a multiclass).
      skills: ['performance'],
      proficiencies: {
        armour: ['light'],
        weaponTypes: ['daggers', 'longswords', 'rapiers', 'scimitars', 'shortswords', 'sickles'],
      },
      choices: [],
    },
    { level: 5, features: [], resources: { 'bladesong-power': 3 }, choices: [] },
    { level: 6, features: ['extra-attack'], choices: [] },
    { level: 9, features: [], resources: { 'bladesong-power': 4 }, choices: [] },
    { level: 10, features: ['song-of-defence'], choices: [] },
  ],
} satisfies SubclassDef;

const conjurationSchool = {
  id: 'conjuration-school',
  classId: 'wizard',
  name: 'Conjuration School',
  levels: [
    { level: 2, features: ['conjuration-savant', 'minor-conjuration-create-water'], choices: [] },
    { level: 6, features: ['benign-transposition-teleport'], choices: [] },
    { level: 10, features: ['focused-conjuration'], choices: [] },
  ],
} satisfies SubclassDef;

const divinationSchool = {
  id: 'divination-school',
  classId: 'wizard',
  name: 'Divination School',
  levels: [
    { level: 2, features: ['divination-savant', 'portent'], choices: [] },
    { level: 6, features: ['expert-divination'], choices: [] },
    { level: 10, features: ['third-eye-darkvision', 'third-eye-see-invisibility'], choices: [] },
  ],
} satisfies SubclassDef;

const enchantmentSchool = {
  id: 'enchantment-school',
  classId: 'wizard',
  name: 'Enchantment School',
  levels: [
    { level: 2, features: ['enchantment-savant', 'hypnotic-gaze'], choices: [] },
    { level: 6, features: ['instinctive-charm'], choices: [] },
    { level: 10, features: ['split-enchantment'], choices: [] },
  ],
} satisfies SubclassDef;

const evocationSchool = {
  id: 'evocation-school',
  classId: 'wizard',
  name: 'Evocation School',
  levels: [
    { level: 2, features: ['evocation-savant', 'sculpt-spells'], choices: [] },
    { level: 6, features: ['potent-cantrip'], choices: [] },
    { level: 10, features: ['empowered-evocation'], choices: [] },
  ],
} satisfies SubclassDef;

const illusionSchool = {
  id: 'illusion-school',
  classId: 'wizard',
  name: 'Illusion School',
  levels: [
    { level: 2, features: ['illusion-savant', 'improved-minor-illusion'], choices: [] },
    { level: 6, features: ['illusion-see-invisibility'], choices: [] },
    { level: 10, features: ['illusory-self'], choices: [] },
  ],
} satisfies SubclassDef;

const necromancySchool = {
  id: 'necromancy-school',
  classId: 'wizard',
  name: 'Necromancy School',
  levels: [
    { level: 2, features: ['necromancy-savant', 'grim-harvest'], choices: [] },
    {
      level: 6,
      features: [
        'undead-thralls-animate-dead',
        'undead-thralls-additional-undead',
        'undead-thralls-better-summons',
      ],
      // Undead Thralls: Animate Dead grants the spell.
      spells: ['animate-dead'],
      choices: [],
    },
    { level: 10, features: ['inured-to-undeath'], choices: [] },
  ],
} satisfies SubclassDef;

const transmutationSchool = {
  id: 'transmutation-school',
  classId: 'wizard',
  name: 'Transmutation School',
  levels: [
    { level: 2, features: ['transmutation-savant', 'experimental-alchemy'], choices: [] },
    { level: 6, features: ['transmuters-stone'], choices: [] },
    { level: 10, features: ['shapechanger'], choices: [] },
  ],
} satisfies SubclassDef;

const features = [
  // Wizard
  { id: 'arcane-recovery', name: 'Arcane Recovery', kind: 'action' },
  // Abjuration School
  {
    id: 'abjuration-savant',
    name: 'Abjuration Savant',
    kind: 'passive',
    description: 'Halves the cost to learn Abjuration spells from scrolls.',
  },
  { id: 'arcane-ward', name: 'Arcane Ward', kind: 'passive' },
  { id: 'projected-ward', name: 'Projected Ward', kind: 'reaction' },
  { id: 'improved-abjuration', name: 'Improved Abjuration', kind: 'passive' },
  // Bladesinging
  { id: 'bladesong', name: 'Bladesong', kind: 'action' },
  { id: 'training-in-war-and-song', name: 'Training in War and Song', kind: 'passive' },
  { id: 'song-of-defence', name: 'Song of Defence', kind: 'reaction' },
  // Conjuration School
  {
    id: 'conjuration-savant',
    name: 'Conjuration Savant',
    kind: 'passive',
    description: 'Halves the cost to learn Conjuration spells from scrolls.',
  },
  {
    id: 'minor-conjuration-create-water',
    name: 'Minor Conjuration: Create Water',
    kind: 'action',
  },
  {
    id: 'benign-transposition-teleport',
    name: 'Benign Transposition: Teleport',
    kind: 'action',
  },
  { id: 'focused-conjuration', name: 'Focused Conjuration', kind: 'passive' },
  // Divination School
  {
    id: 'divination-savant',
    name: 'Divination Savant',
    kind: 'passive',
    description: 'Halves the cost to learn Divination spells from scrolls.',
  },
  { id: 'portent', name: 'Portent', kind: 'passive' },
  { id: 'expert-divination', name: 'Expert Divination', kind: 'passive' },
  { id: 'third-eye-darkvision', name: 'Third Eye: Darkvision', kind: 'action' },
  { id: 'third-eye-see-invisibility', name: 'Third Eye: See Invisibility', kind: 'action' },
  // Enchantment School
  {
    id: 'enchantment-savant',
    name: 'Enchantment Savant',
    kind: 'passive',
    description: 'Halves the cost to learn Enchantment spells from scrolls.',
  },
  { id: 'hypnotic-gaze', name: 'Hypnotic Gaze', kind: 'action' },
  { id: 'instinctive-charm', name: 'Instinctive Charm', kind: 'reaction' },
  { id: 'split-enchantment', name: 'Split Enchantment', kind: 'passive' },
  // Evocation School
  {
    id: 'evocation-savant',
    name: 'Evocation Savant',
    kind: 'passive',
    description: 'Halves the cost to learn Evocation spells from scrolls.',
  },
  { id: 'sculpt-spells', name: 'Sculpt Spells', kind: 'passive' },
  { id: 'potent-cantrip', name: 'Potent Cantrip', kind: 'passive' },
  { id: 'empowered-evocation', name: 'Empowered Evocation', kind: 'passive' },
  // Illusion School
  {
    id: 'illusion-savant',
    name: 'Illusion Savant',
    kind: 'passive',
    description: 'Halves the cost to learn Illusion spells from scrolls.',
  },
  {
    id: 'improved-minor-illusion',
    name: 'Improved Minor Illusion',
    kind: 'passive',
    wikiPage: 'Improved Minor Illusion (passive feature)',
  },
  {
    id: 'illusion-see-invisibility',
    name: 'See Invisibility',
    kind: 'action',
    wikiPage: 'See Invisibility (class action)',
  },
  { id: 'illusory-self', name: 'Illusory Self', kind: 'reaction' },
  // Necromancy School
  {
    id: 'necromancy-savant',
    name: 'Necromancy Savant',
    kind: 'passive',
    description: 'Halves the cost to learn Necromancy spells from scrolls.',
  },
  { id: 'grim-harvest', name: 'Grim Harvest', kind: 'passive' },
  { id: 'undead-thralls-animate-dead', name: 'Undead Thralls: Animate Dead', kind: 'passive' },
  {
    id: 'undead-thralls-additional-undead',
    name: 'Undead Thralls: Additional Undead',
    kind: 'passive',
  },
  {
    id: 'undead-thralls-better-summons',
    name: 'Undead Thralls: Better Summons',
    kind: 'passive',
  },
  { id: 'inured-to-undeath', name: 'Inured to Undeath', kind: 'passive' },
  // Transmutation School
  {
    id: 'transmutation-savant',
    name: 'Transmutation Savant',
    kind: 'passive',
    description: 'Halves the cost to learn Transmutation spells from scrolls.',
  },
  { id: 'experimental-alchemy', name: 'Experimental Alchemy', kind: 'passive' },
  { id: 'transmuters-stone', name: "Transmuter's Stone", kind: 'action' },
  { id: 'shapechanger', name: 'Shapechanger', kind: 'action' },
] satisfies Feature[];

export const wizardBundle: ClassBundle = {
  cls: wizard,
  subclasses: [
    abjurationSchool,
    bladesinging,
    conjurationSchool,
    divinationSchool,
    enchantmentSchool,
    evocationSchool,
    illusionSchool,
    necromancySchool,
    transmutationSchool,
  ],
  features,
  optionGroups: [],
};
