import type { ClassDef, Feature, OptionGroup, SubclassDef } from '../../schema';
import type { ClassBundle } from './bundle';

// Source: bg3.wiki "Ranger", "Favoured Enemy", "Natural Explorer", "Fighting style", "Beast Master",
// "Gloom Stalker", "Hunter", "Swarmkeeper", "Classes" (multiclass proficiencies).

const rangerList = { list: 'ranger' } as const;
const learn = (maxLevel: number) =>
  ({ type: 'spell', count: 1, from: rangerList, maxLevel }) as const;
// BG3 offers an optional spell replacement at every Ranger level from 3 on (not at level 2).
const replace = (maxLevel: number) =>
  ({ type: 'replace-spell', from: rangerList, maxLevel }) as const;
const favouredEnemy = { type: 'option', group: 'ranger-favoured-enemies', count: 1 } as const;
const naturalExplorer = { type: 'option', group: 'ranger-natural-explorers', count: 1 } as const;

export const ranger = {
  id: 'ranger',
  name: 'Ranger',
  hitPoints: { firstLevel: 10, perLevel: 6 },
  savingThrows: ['strength', 'dexterity'],
  skillChoices: {
    count: 3,
    from: [
      'animal-handling',
      'athletics',
      'insight',
      'investigation',
      'nature',
      'perception',
      'stealth',
      'survival',
    ],
  },
  proficiencies: {
    armour: ['light', 'medium'],
    shields: true,
    weapons: ['simple', 'martial'],
  },
  multiclassProficiencies: {
    armour: ['light', 'medium'],
    shields: true,
    weapons: ['simple', 'martial'],
  },
  multiclassSkills: 1,
  subclassLevel: 3,
  spellcasting: {
    kind: 'half',
    ability: 'wisdom',
    spellList: 'ranger',
    preparation: 'known',
    cantripsKnown: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    spellsKnown: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7],
    // No slots at Ranger level 1 in BG3, and a fourth 3rd-level slot at level 12 (unlike 5e).
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
      [4, 3, 4],
    ],
  },
  levels: [
    { level: 1, features: [], choices: [favouredEnemy, naturalExplorer] },
    {
      level: 2,
      features: [],
      choices: [
        {
          type: 'option',
          group: 'fighting-styles',
          count: 1,
          only: ['archery', 'defence', 'duelling', 'two-weapon-fighting'],
        },
        { type: 'spell', count: 2, from: rangerList, maxLevel: 1 },
      ],
    },
    { level: 3, features: [], choices: [{ type: 'subclass' }, learn(1), replace(1)] },
    { level: 4, features: [], choices: [{ type: 'feat' }, replace(1)] },
    { level: 5, features: ['extra-attack'], choices: [learn(2), replace(2)] },
    { level: 6, features: [], choices: [favouredEnemy, naturalExplorer, replace(2)] },
    { level: 7, features: [], choices: [learn(2), replace(2)] },
    {
      level: 8,
      // Land's Stride: Plants is hidden in game but granted (bg3.wiki).
      features: ['lands-stride-difficult-terrain-ranger', 'lands-stride-plants-ranger'],
      choices: [{ type: 'feat' }, replace(2)],
    },
    { level: 9, features: [], choices: [learn(3), replace(3)] },
    {
      level: 10,
      features: ['hide-in-plain-sight'],
      choices: [favouredEnemy, naturalExplorer, replace(3)],
    },
    { level: 11, features: [], choices: [learn(3), replace(3)] },
    { level: 12, features: [], choices: [{ type: 'feat' }, replace(3)] },
  ],
} satisfies ClassDef;

export const beastMaster = {
  id: 'beast-master',
  classId: 'ranger',
  name: 'Beast Master',
  levels: [
    // The companion (bear, boar, dire raven, wolf or wolf spider) is picked each time Ranger's
    // Companion is cast, not at level-up.
    { level: 3, features: ['rangers-companion'], choices: [] },
    { level: 5, features: ['companions-bond'], choices: [] },
    { level: 7, features: ['exceptional-training'], choices: [] },
    { level: 11, features: ['bestial-fury'], choices: [] },
  ],
} satisfies SubclassDef;

export const gloomStalker = {
  id: 'gloom-stalker',
  classId: 'ranger',
  name: 'Gloom Stalker',
  levels: [
    {
      level: 3,
      features: ['dread-ambusher', 'dread-ambusher-hide', 'umbral-shroud', 'superior-darkvision'],
      spells: ['disguise-self'],
      choices: [],
    },
    { level: 5, features: [], spells: ['misty-step'], choices: [] },
    { level: 7, features: ['iron-mind'], savingThrows: ['wisdom', 'intelligence'], choices: [] },
    { level: 9, features: [], spells: ['fear'], choices: [] },
    { level: 11, features: ['stalkers-flurry'], choices: [] },
  ],
} satisfies SubclassDef;

export const hunter = {
  id: 'hunter',
  classId: 'ranger',
  name: 'Hunter',
  levels: [
    { level: 3, features: [], choices: [{ type: 'option', group: 'hunters-prey', count: 1 }] },
    {
      level: 7,
      features: [],
      choices: [{ type: 'option', group: 'hunter-defensive-tactics', count: 1 }],
    },
    { level: 11, features: ['volley', 'whirlwind-attack'], choices: [] },
  ],
} satisfies SubclassDef;

export const swarmkeeper = {
  id: 'swarmkeeper',
  classId: 'ranger',
  name: 'Swarmkeeper',
  addedIn: 'patch-8',
  levels: [
    {
      level: 3,
      features: ['preys-scent-swarmkeeper'],
      spells: ['mage-hand', 'faerie-fire'],
      // The swarm can be changed at every later level-up in game.
      choices: [{ type: 'option', group: 'gathered-swarms', count: 1 }],
    },
    { level: 5, features: [], spells: ['web'], choices: [] },
    {
      level: 7,
      features: ['writhing-tide'],
      resources: { 'writhing-currents': 3 },
      choices: [],
    },
    {
      level: 9,
      features: [],
      spells: ['gaseous-form'],
      resources: { 'writhing-currents': 4 },
      choices: [],
    },
    { level: 11, features: ['mighty-swarm'], choices: [] },
  ],
} satisfies SubclassDef;

export const rangerSubclasses = [beastMaster, gloomStalker, hunter, swarmkeeper];

export const rangerFeatures = [
  // Ranger
  {
    id: 'lands-stride-difficult-terrain-ranger',
    name: "Land's Stride: Difficult Terrain",
    kind: 'passive',
  },
  { id: 'lands-stride-plants-ranger', name: "Land's Stride: Plants", kind: 'passive' },
  { id: 'hide-in-plain-sight', name: 'Hide in Plain Sight', kind: 'action' },
  // Beast Master
  { id: 'rangers-companion', name: "Ranger's Companion", kind: 'action' },
  { id: 'companions-bond', name: "Companion's Bond", kind: 'passive' },
  { id: 'exceptional-training', name: 'Exceptional Training', kind: 'passive' },
  { id: 'bestial-fury', name: 'Bestial Fury', kind: 'passive' },
  // Gloom Stalker
  { id: 'dread-ambusher', name: 'Dread Ambusher', kind: 'passive' },
  { id: 'dread-ambusher-hide', name: 'Dread Ambusher: Hide', kind: 'action' },
  { id: 'umbral-shroud', name: 'Umbral Shroud', kind: 'action' },
  { id: 'iron-mind', name: 'Iron Mind', kind: 'passive' },
  { id: 'stalkers-flurry', name: "Stalker's Flurry", kind: 'passive' },
  // Hunter
  { id: 'volley', name: 'Volley', kind: 'action' },
  { id: 'whirlwind-attack', name: 'Whirlwind Attack', kind: 'action' },
  // Swarmkeeper
  {
    id: 'preys-scent-swarmkeeper',
    name: "Prey's Scent",
    kind: 'passive',
    wikiPage: "Prey's Scent (Swarmkeeper)",
  },
  { id: 'writhing-tide', name: 'Writhing Tide', kind: 'action' },
  { id: 'mighty-swarm', name: 'Mighty Swarm', kind: 'passive' },
] satisfies Feature[];

export const rangerOptionGroups = [
  {
    id: 'ranger-favoured-enemies',
    name: 'Favoured Enemy',
    // Extra effects not modelled: Bounty Hunter's Ensnaring Strike save disadvantage. Keeper of
    // the Veil's Protection from Evil and Good is cast once per long rest without a slot.
    options: [
      { id: 'bounty-hunter', name: 'Bounty Hunter', grants: { skills: ['investigation'] } },
      {
        id: 'keeper-of-the-veil',
        name: 'Keeper of the Veil',
        grants: { skills: ['arcana'], spells: ['protection-from-evil-and-good'] },
      },
      {
        id: 'mage-breaker',
        name: 'Mage Breaker',
        grants: { skills: ['arcana'], spells: ['true-strike'] },
      },
      {
        id: 'ranger-knight',
        name: 'Ranger Knight',
        grants: { skills: ['history'], armour: ['heavy'] },
      },
      {
        id: 'sanctified-stalker',
        name: 'Sanctified Stalker',
        grants: { skills: ['religion'], spells: ['sacred-flame'] },
      },
    ],
  },
  {
    id: 'ranger-natural-explorers',
    name: 'Natural Explorer',
    // Wasteland Wanderer's damage resistances are not modelled. Beast Tamer's Find Familiar is
    // cast once per short rest without a slot.
    options: [
      { id: 'beast-tamer', name: 'Beast Tamer', grants: { spells: ['find-familiar'] } },
      { id: 'urban-tracker', name: 'Urban Tracker', grants: { skills: ['sleight-of-hand'] } },
      { id: 'wasteland-wanderer-cold', name: 'Wasteland Wanderer: Cold' },
      { id: 'wasteland-wanderer-fire', name: 'Wasteland Wanderer: Fire' },
      { id: 'wasteland-wanderer-poison', name: 'Wasteland Wanderer: Poison' },
    ],
  },
  {
    id: 'hunters-prey',
    name: "Hunter's Prey",
    options: [
      { id: 'colossus-slayer', name: 'Colossus Slayer' },
      { id: 'giant-killer', name: 'Giant Killer' },
      { id: 'horde-breaker', name: 'Horde Breaker' },
    ],
  },
  {
    id: 'hunter-defensive-tactics',
    name: 'Defensive Tactics',
    options: [
      { id: 'escape-the-horde', name: 'Escape the Horde' },
      { id: 'multiattack-defence', name: 'Multiattack Defence' },
      { id: 'steel-will', name: 'Steel Will' },
    ],
  },
  {
    id: 'gathered-swarms',
    name: 'Gathered Swarm',
    options: [
      { id: 'cloud-of-jellyfish', name: 'Cloud of Jellyfish' },
      { id: 'flurry-of-moths', name: 'Flurry of Moths' },
      { id: 'legion-of-bees', name: 'Legion of Bees' },
    ],
  },
] satisfies OptionGroup[];

export const rangerBundle: ClassBundle = {
  cls: ranger,
  subclasses: rangerSubclasses,
  features: rangerFeatures,
  optionGroups: rangerOptionGroups,
};
