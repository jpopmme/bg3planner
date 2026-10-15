import type { ClassDef, Feature, SubclassDef } from '../../schema';
import type { ClassBundle } from './bundle';

/** Widens resource totals so levels with different resources share one type. */
const resources = (totals: Record<string, number>) => totals;

// Source: bg3.wiki "Paladin", "Classes" (multiclass proficiencies), "Lay on Hands Charge",
// "Channel Oath Charge", "Oath of Devotion", "Oath of the Ancients", "Oath of the Crown",
// "Oath of Vengeance", "Oathbreaker".

export const paladin = {
  id: 'paladin',
  name: 'Paladin',
  hitPoints: { firstLevel: 10, perLevel: 6 },
  savingThrows: ['wisdom', 'charisma'],
  skillChoices: {
    count: 2,
    from: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
  },
  proficiencies: {
    armour: ['light', 'medium', 'heavy'],
    shields: true,
    weapons: ['simple', 'martial'],
  },
  multiclassProficiencies: {
    armour: ['light', 'medium'],
    shields: true,
    weapons: ['simple', 'martial'],
  },
  subclassLevel: 1,
  spellcasting: {
    kind: 'half',
    ability: 'charisma',
    spellList: 'paladin',
    // Every Paladin spell of a castable level can be prepared (Paladin level + Charisma modifier).
    preparation: 'whole-list',
    cantripsKnown: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    spellsKnown: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    // Spellcasting starts at Paladin level 2: a level-1 Paladin has no slots, although half of
    // one level rounded up would give an effective spellcaster level of 1.
    slots: [
      [],
      [2],
      [3],
      [3],
      [4, 2],
      [4, 2],
      [4, 3],
      [4, 3],
      [4, 3, 2],
      [4, 3, 2],
      [4, 3, 3],
      [4, 3, 3],
    ],
  },
  levels: [
    {
      level: 1,
      features: ['divine-sense', 'lay-on-hands'],
      // Lay on Hands charges come back on a long rest; the single Channel Oath charge on a short
      // or long rest.
      resources: resources({ 'lay-on-hands-charges': 3, 'channel-oath': 1 }),
      choices: [{ type: 'subclass' }],
    },
    {
      level: 2,
      features: ['divine-smite'],
      choices: [
        {
          type: 'option',
          group: 'fighting-styles',
          count: 1,
          only: ['defence', 'duelling', 'great-weapon-fighting', 'protection'],
        },
      ],
    },
    { level: 3, features: ['divine-health'], choices: [] },
    {
      level: 4,
      features: [],
      resources: resources({ 'lay-on-hands-charges': 4 }),
      choices: [{ type: 'feat' }],
    },
    { level: 5, features: ['extra-attack'], choices: [] },
    { level: 6, features: ['aura-of-protection'], choices: [] },
    { level: 7, features: [], choices: [] },
    { level: 8, features: [], choices: [{ type: 'feat' }] },
    { level: 9, features: [], choices: [] },
    {
      level: 10,
      features: ['aura-of-courage'],
      resources: resources({ 'lay-on-hands-charges': 5 }),
      choices: [],
    },
    { level: 11, features: ['improved-divine-smite'], choices: [] },
    { level: 12, features: [], choices: [{ type: 'feat' }] },
  ],
} satisfies ClassDef;

// Every oath grants a Channel Oath action at Paladin level 1, two more at level 3, an aura or
// similar at level 7, and oath spells (always prepared) at levels 3, 5 and 9.

export const oathOfDevotion = {
  id: 'oath-of-devotion',
  classId: 'paladin',
  name: 'Oath of Devotion',
  levels: [
    { level: 1, features: ['oath-of-devotion-tenets', 'holy-rebuke'], choices: [] },
    {
      level: 3,
      features: ['sacred-weapon', 'turn-the-unholy'],
      spells: ['protection-from-evil-and-good', 'sanctuary'],
      choices: [],
    },
    { level: 5, features: [], spells: ['lesser-restoration', 'silence'], choices: [] },
    { level: 7, features: ['aura-of-devotion'], choices: [] },
    { level: 9, features: [], spells: ['remove-curse', 'beacon-of-hope'], choices: [] },
  ],
} satisfies SubclassDef;

export const oathOfTheAncients = {
  id: 'oath-of-the-ancients',
  classId: 'paladin',
  name: 'Oath of the Ancients',
  levels: [
    { level: 1, features: ['oath-of-the-ancients-tenets', 'healing-radiance'], choices: [] },
    {
      level: 3,
      features: ['natures-wrath', 'turn-the-faithless'],
      spells: ['speak-with-animals', 'ensnaring-strike'],
      choices: [],
    },
    { level: 5, features: [], spells: ['misty-step', 'moonbeam'], choices: [] },
    { level: 7, features: ['aura-of-warding'], choices: [] },
    { level: 9, features: [], spells: ['protection-from-energy', 'plant-growth'], choices: [] },
  ],
} satisfies SubclassDef;

export const oathOfTheCrown = {
  id: 'oath-of-the-crown',
  classId: 'paladin',
  name: 'Oath of the Crown',
  addedIn: 'patch-8',
  levels: [
    { level: 1, features: ['oath-of-the-crown-tenets', 'righteous-clarity'], choices: [] },
    {
      level: 3,
      features: ['champion-challenge', 'turn-the-tide'],
      spells: ['command', 'compelled-duel'],
      choices: [],
    },
    { level: 5, features: [], spells: ['warding-bond', 'spiritual-weapon'], choices: [] },
    { level: 7, features: ['divine-allegiance'], choices: [] },
    { level: 9, features: [], spells: ['spirit-guardians', 'crusaders-mantle'], choices: [] },
  ],
} satisfies SubclassDef;

export const oathOfVengeance = {
  id: 'oath-of-vengeance',
  classId: 'paladin',
  name: 'Oath of Vengeance',
  levels: [
    { level: 1, features: ['oath-of-vengeance-tenets', 'inquisitors-might'], choices: [] },
    {
      level: 3,
      features: ['abjure-enemy', 'vow-of-enmity'],
      spells: ['bane', 'hunters-mark'],
      choices: [],
    },
    { level: 5, features: [], spells: ['hold-person', 'misty-step'], choices: [] },
    { level: 7, features: ['relentless-avenger'], choices: [] },
    { level: 9, features: [], spells: ['haste', 'protection-from-energy'], choices: [] },
  ],
} satisfies SubclassDef;

// Not offered at character creation: a Paladin who breaks their oath can take it from the
// Oathbreaker Knight in camp. It has no tenets.
export const oathbreaker = {
  id: 'oathbreaker',
  classId: 'paladin',
  name: 'Oathbreaker',
  levels: [
    { level: 1, features: ['spiteful-suffering'], choices: [] },
    {
      level: 3,
      features: ['control-undead', 'dreadful-aspect'],
      spells: ['hellish-rebuke', 'inflict-wounds'],
      choices: [],
    },
    { level: 5, features: [], spells: ['crown-of-madness', 'darkness'], choices: [] },
    { level: 7, features: ['aura-of-hate'], choices: [] },
    { level: 9, features: [], spells: ['bestow-curse', 'animate-dead'], choices: [] },
  ],
} satisfies SubclassDef;

export const paladinSubclasses = [
  oathOfDevotion,
  oathOfTheAncients,
  oathOfTheCrown,
  oathOfVengeance,
  oathbreaker,
];

/** Names follow bg3.wiki. The auras are toggled from the hotbar in BG3, so they are actions. */
export const paladinFeatures = [
  // Paladin
  { id: 'divine-sense', name: 'Divine Sense', kind: 'action' },
  { id: 'lay-on-hands', name: 'Lay on Hands', kind: 'action' },
  { id: 'divine-smite', name: 'Divine Smite', kind: 'action' },
  { id: 'divine-health', name: 'Divine Health', kind: 'passive' },
  { id: 'aura-of-protection', name: 'Aura of Protection', kind: 'action' },
  { id: 'aura-of-courage', name: 'Aura of Courage', kind: 'action' },
  { id: 'improved-divine-smite', name: 'Improved Divine Smite', kind: 'passive' },
  // Oath of Devotion
  { id: 'oath-of-devotion-tenets', name: 'Oath of Devotion Tenets', kind: 'passive' },
  { id: 'holy-rebuke', name: 'Holy Rebuke', kind: 'action' },
  { id: 'sacred-weapon', name: 'Sacred Weapon', kind: 'action' },
  { id: 'turn-the-unholy', name: 'Turn the Unholy', kind: 'action' },
  { id: 'aura-of-devotion', name: 'Aura of Devotion', kind: 'action' },
  // Oath of the Ancients
  { id: 'oath-of-the-ancients-tenets', name: 'Oath of the Ancients Tenets', kind: 'passive' },
  { id: 'healing-radiance', name: 'Healing Radiance', kind: 'action' },
  { id: 'natures-wrath', name: "Nature's Wrath", kind: 'action' },
  { id: 'turn-the-faithless', name: 'Turn the Faithless', kind: 'action' },
  { id: 'aura-of-warding', name: 'Aura of Warding', kind: 'action' },
  // Oath of the Crown
  { id: 'oath-of-the-crown-tenets', name: 'Oath of the Crown Tenets', kind: 'passive' },
  { id: 'righteous-clarity', name: 'Righteous Clarity', kind: 'action' },
  { id: 'champion-challenge', name: 'Champion Challenge', kind: 'action' },
  { id: 'turn-the-tide', name: 'Turn the Tide', kind: 'action' },
  { id: 'divine-allegiance', name: 'Divine Allegiance', kind: 'reaction' },
  // Oath of Vengeance
  { id: 'oath-of-vengeance-tenets', name: 'Oath of Vengeance Tenets', kind: 'passive' },
  { id: 'inquisitors-might', name: "Inquisitor's Might", kind: 'action' },
  { id: 'abjure-enemy', name: 'Abjure Enemy', kind: 'action' },
  { id: 'vow-of-enmity', name: 'Vow of Enmity', kind: 'action' },
  { id: 'relentless-avenger', name: 'Relentless Avenger', kind: 'passive' },
  // Oathbreaker
  { id: 'spiteful-suffering', name: 'Spiteful Suffering', kind: 'action' },
  { id: 'control-undead', name: 'Control Undead', kind: 'action' },
  { id: 'dreadful-aspect', name: 'Dreadful Aspect', kind: 'action' },
  { id: 'aura-of-hate', name: 'Aura of Hate', kind: 'action' },
] satisfies Feature[];

export const paladinBundle: ClassBundle = {
  cls: paladin,
  subclasses: paladinSubclasses,
  features: paladinFeatures,
  optionGroups: [],
};
