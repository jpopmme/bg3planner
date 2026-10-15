import type { ClassDef, Feature, SubclassDef } from '../../schema';
import type { ClassBundle } from './bundle';

// Source: bg3.wiki "Cleric", "Classes" (multiclass proficiencies), "Channel Divinity Charge",
// "War Priest Charge", "Death Domain", "Knowledge Domain", "Life Domain", "Light Domain",
// "Nature Domain", "Tempest Domain", "Trickery Domain", "War Domain".

const clericList = { list: 'cleric' } as const;

export const cleric = {
  id: 'cleric',
  name: 'Cleric',
  hitPoints: { firstLevel: 8, perLevel: 5 },
  savingThrows: ['wisdom', 'charisma'],
  skillChoices: {
    count: 2,
    from: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
  },
  proficiencies: {
    armour: ['light', 'medium'],
    shields: true,
    weapons: ['simple'],
    weaponTypes: ['flails', 'morningstars'],
  },
  multiclassProficiencies: {
    armour: ['light', 'medium'],
    shields: true,
    weapons: [],
    weaponTypes: ['flails', 'morningstars'],
  },
  // bg3.wiki calls this likely a bug (no other class grants all its skills when multiclassing),
  // but it is what the game does.
  multiclassSkills: 2,
  subclassLevel: 1,
  spellcasting: {
    kind: 'full',
    ability: 'wisdom',
    spellList: 'cleric',
    // Every Cleric spell of a castable level can be prepared (Cleric level + Wisdom modifier).
    preparation: 'whole-list',
    cantripsKnown: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5],
    spellsKnown: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
      choices: [{ type: 'subclass' }, { type: 'cantrip', count: 3, from: clericList }],
    },
    // Channel Divinity charges come back on a short or long rest.
    { level: 2, features: ['turn-undead'], choices: [], resources: { 'channel-divinity': 1 } },
    { level: 3, features: [], choices: [] },
    {
      level: 4,
      features: [],
      choices: [{ type: 'feat' }, { type: 'cantrip', count: 1, from: clericList }],
    },
    { level: 5, features: ['destroy-undead'], choices: [] },
    { level: 6, features: [], choices: [], resources: { 'channel-divinity': 2 } },
    { level: 7, features: [], choices: [] },
    { level: 8, features: [], choices: [{ type: 'feat' }] },
    { level: 9, features: [], choices: [] },
    {
      level: 10,
      features: ['divine-intervention'],
      choices: [{ type: 'cantrip', count: 1, from: clericList }],
    },
    { level: 11, features: [], choices: [] },
    { level: 12, features: [], choices: [{ type: 'feat' }] },
  ],
} satisfies ClassDef;

// Every domain grants its domain spells (always prepared) at Cleric levels 1, 3, 5, 7 and 9, and a
// Channel Divinity action at level 2.

export const deathDomain = {
  id: 'death-domain',
  classId: 'cleric',
  name: 'Death Domain',
  addedIn: 'patch-8',
  levels: [
    {
      level: 1,
      features: ['reaper'],
      proficiencies: { weapons: ['martial'] },
      spells: ['false-life', 'ray-of-sickness'],
      choices: [
        {
          type: 'cantrip',
          count: 1,
          from: { spells: ['bone-chill', 'bursting-sinew', 'toll-the-dead'] },
          label: 'Death Domain cantrip',
        },
      ],
    },
    { level: 2, features: ['touch-of-death'], choices: [] },
    { level: 3, features: [], spells: ['blindness', 'ray-of-enfeeblement'], choices: [] },
    { level: 5, features: [], spells: ['animate-dead', 'vampiric-touch'], choices: [] },
    { level: 6, features: ['inescapable-destruction'], choices: [] },
    { level: 7, features: [], spells: ['blight', 'death-ward'], choices: [] },
    { level: 8, features: ['divine-strike-necrotic'], choices: [] },
    { level: 9, features: [], spells: ['cloudkill', 'contagion'], choices: [] },
  ],
} satisfies SubclassDef;

export const knowledgeDomain = {
  id: 'knowledge-domain',
  classId: 'cleric',
  name: 'Knowledge Domain',
  levels: [
    {
      level: 1,
      features: ['blessings-of-knowledge'],
      spells: ['command', 'sleep'],
      // Blessings of Knowledge: expertise in two of these, even without prior proficiency.
      choices: [
        {
          type: 'expertise',
          count: 2,
          from: ['arcana', 'history', 'nature', 'religion'],
          grantsProficiency: true,
        },
      ],
    },
    { level: 2, features: ['knowledge-of-the-ages'], choices: [] },
    { level: 3, features: [], spells: ['calm-emotions', 'hold-person'], choices: [] },
    { level: 5, features: [], spells: ['slow', 'speak-with-dead'], choices: [] },
    { level: 6, features: ['read-thoughts', 'speak-with-animals-cleric'], choices: [] },
    { level: 7, features: [], spells: ['confusion', 'otilukes-resilient-sphere'], choices: [] },
    { level: 8, features: ['potent-spellcasting'], choices: [] },
    { level: 9, features: [], spells: ['dominate-person', 'telekinesis'], choices: [] },
  ],
} satisfies SubclassDef;

export const lifeDomain = {
  id: 'life-domain',
  classId: 'cleric',
  name: 'Life Domain',
  levels: [
    {
      level: 1,
      features: ['disciple-of-life'],
      proficiencies: { armour: ['heavy'] },
      spells: ['bless', 'cure-wounds'],
      choices: [],
    },
    { level: 2, features: ['preserve-life'], choices: [] },
    { level: 3, features: [], spells: ['aid', 'lesser-restoration'], choices: [] },
    { level: 5, features: [], spells: ['revivify', 'beacon-of-hope'], choices: [] },
    { level: 6, features: ['blessed-healer'], choices: [] },
    { level: 7, features: [], spells: ['guardian-of-faith', 'death-ward'], choices: [] },
    { level: 8, features: ['divine-strike-radiant'], choices: [] },
    { level: 9, features: [], spells: ['greater-restoration', 'mass-cure-wounds'], choices: [] },
  ],
} satisfies SubclassDef;

export const lightDomain = {
  id: 'light-domain',
  classId: 'cleric',
  name: 'Light Domain',
  levels: [
    {
      level: 1,
      features: ['warding-flare'],
      // The Light cantrip is granted outright, on top of the cantrips known.
      spells: ['light', 'burning-hands', 'faerie-fire'],
      choices: [],
    },
    { level: 2, features: ['radiance-of-the-dawn'], choices: [] },
    { level: 3, features: [], spells: ['flaming-sphere', 'scorching-ray'], choices: [] },
    { level: 5, features: [], spells: ['daylight', 'fireball'], choices: [] },
    { level: 6, features: ['improved-warding-flare'], choices: [] },
    { level: 7, features: [], spells: ['guardian-of-faith', 'wall-of-fire'], choices: [] },
    { level: 8, features: ['potent-spellcasting'], choices: [] },
    { level: 9, features: [], spells: ['destructive-wave', 'flame-strike'], choices: [] },
  ],
} satisfies SubclassDef;

export const natureDomain = {
  id: 'nature-domain',
  classId: 'cleric',
  name: 'Nature Domain',
  levels: [
    {
      level: 1,
      features: ['acolyte-of-nature'],
      proficiencies: { armour: ['heavy'] },
      spells: ['speak-with-animals', 'animal-friendship'],
      // Acolyte of Nature: one Druid cantrip (bg3.wiki "Cleric" lists these four) and one skill.
      choices: [
        {
          type: 'cantrip',
          count: 1,
          from: { spells: ['poison-spray', 'produce-flame', 'shillelagh', 'thorn-whip'] },
          label: 'Acolyte of Nature',
        },
        { type: 'skill', count: 1, from: ['animal-handling', 'nature', 'survival'] },
      ],
    },
    { level: 2, features: ['charm-animals-and-plants'], choices: [] },
    { level: 3, features: [], spells: ['barkskin', 'spike-growth'], choices: [] },
    { level: 5, features: [], spells: ['plant-growth', 'sleet-storm'], choices: [] },
    { level: 6, features: ['dampen-elements'], choices: [] },
    { level: 7, features: [], spells: ['dominate-beast', 'grasping-vine'], choices: [] },
    { level: 8, features: ['divine-strike-elemental-fury'], choices: [] },
    { level: 9, features: [], spells: ['insect-plague', 'wall-of-stone'], choices: [] },
  ],
} satisfies SubclassDef;

export const tempestDomain = {
  id: 'tempest-domain',
  classId: 'cleric',
  name: 'Tempest Domain',
  levels: [
    {
      level: 1,
      features: ['wrath-of-the-storm'],
      proficiencies: { armour: ['heavy'], weapons: ['martial'] },
      spells: ['thunderwave', 'fog-cloud'],
      choices: [],
    },
    { level: 2, features: ['destructive-wrath'], choices: [] },
    { level: 3, features: [], spells: ['gust-of-wind', 'shatter'], choices: [] },
    { level: 5, features: [], spells: ['call-lightning', 'sleet-storm'], choices: [] },
    { level: 6, features: ['thunderbolt-strike'], choices: [] },
    { level: 7, features: [], spells: ['freedom-of-movement', 'ice-storm'], choices: [] },
    { level: 8, features: ['divine-strike-thunder'], choices: [] },
    { level: 9, features: [], spells: ['destructive-wave', 'insect-plague'], choices: [] },
  ],
} satisfies SubclassDef;

export const trickeryDomain = {
  id: 'trickery-domain',
  classId: 'cleric',
  name: 'Trickery Domain',
  levels: [
    {
      level: 1,
      features: ['blessing-of-the-trickster'],
      spells: ['charm-person', 'disguise-self'],
      choices: [],
    },
    { level: 2, features: ['invoke-duplicity'], choices: [] },
    { level: 3, features: [], spells: ['mirror-image', 'pass-without-trace'], choices: [] },
    { level: 5, features: [], spells: ['bestow-curse', 'fear'], choices: [] },
    { level: 6, features: ['channel-divinity-cloak-of-shadows'], choices: [] },
    { level: 7, features: [], spells: ['dimension-door', 'polymorph'], choices: [] },
    { level: 8, features: ['divine-strike-poison'], choices: [] },
    { level: 9, features: [], spells: ['dominate-person', 'seeming'], choices: [] },
  ],
} satisfies SubclassDef;

export const warDomain = {
  id: 'war-domain',
  classId: 'cleric',
  name: 'War Domain',
  levels: [
    {
      level: 1,
      features: ['war-priest'],
      proficiencies: { armour: ['heavy'], weapons: ['martial'] },
      // War Priest charges: bonus-action weapon attacks, back on a long rest.
      resources: { 'war-priest-charges': 3 },
      spells: ['divine-favour', 'shield-of-faith'],
      choices: [],
    },
    { level: 2, features: ['guided-strike'], choices: [] },
    { level: 3, features: [], spells: ['magic-weapon', 'spiritual-weapon'], choices: [] },
    {
      level: 5,
      features: [],
      resources: { 'war-priest-charges': 4 },
      spells: ['spirit-guardians', 'crusaders-mantle'],
      choices: [],
    },
    { level: 6, features: ['war-gods-blessing'], choices: [] },
    { level: 7, features: [], spells: ['freedom-of-movement', 'stoneskin'], choices: [] },
    {
      level: 8,
      features: ['divine-strike-weapon'],
      resources: { 'war-priest-charges': 5 },
      choices: [],
    },
    { level: 9, features: [], spells: ['flame-strike', 'hold-monster'], choices: [] },
    { level: 11, features: [], resources: { 'war-priest-charges': 6 }, choices: [] },
  ],
} satisfies SubclassDef;

export const clericSubclasses = [
  deathDomain,
  knowledgeDomain,
  lifeDomain,
  lightDomain,
  natureDomain,
  tempestDomain,
  trickeryDomain,
  warDomain,
];

/**
 * Names follow bg3.wiki. Features the wiki files as passives but that are used as reactions in
 * game (Warding Flare, Destructive Wrath, Dampen Elements, Wrath of the Storm) are `reaction`.
 */
export const clericFeatures = [
  // Cleric
  { id: 'turn-undead', name: 'Turn Undead', kind: 'action' },
  { id: 'destroy-undead', name: 'Destroy Undead', kind: 'passive' },
  // Sub-actions: Sunder the Heretical, Arm Thy Servant, Opulent Revival, Golden Generosity.
  { id: 'divine-intervention', name: 'Divine Intervention', kind: 'action' },
  // Shared by Knowledge and Light
  { id: 'potent-spellcasting', name: 'Potent Spellcasting', kind: 'passive' },
  // Death Domain
  { id: 'reaper', name: 'Reaper', kind: 'passive' },
  {
    id: 'touch-of-death',
    name: 'Touch of Death',
    kind: 'reaction',
    wikiPage: 'Channel Divinity: Touch of Death',
  },
  { id: 'inescapable-destruction', name: 'Inescapable Destruction', kind: 'passive' },
  { id: 'divine-strike-necrotic', name: 'Divine Strike: Necrotic', kind: 'action' },
  // Knowledge Domain
  { id: 'blessings-of-knowledge', name: 'Blessings of Knowledge', kind: 'passive' },
  { id: 'knowledge-of-the-ages', name: 'Knowledge of the Ages', kind: 'action' },
  { id: 'read-thoughts', name: 'Read Thoughts', kind: 'action' },
  {
    id: 'speak-with-animals-cleric',
    name: 'Speak with Animals',
    kind: 'action',
    wikiPage: 'Speak with Animals (Cleric)',
  },
  // Life Domain
  { id: 'disciple-of-life', name: 'Disciple of Life', kind: 'passive' },
  { id: 'preserve-life', name: 'Preserve Life', kind: 'action' },
  { id: 'blessed-healer', name: 'Blessed Healer', kind: 'passive' },
  { id: 'divine-strike-radiant', name: 'Divine Strike: Radiant', kind: 'action' },
  // Light Domain
  { id: 'warding-flare', name: 'Warding Flare', kind: 'reaction' },
  { id: 'radiance-of-the-dawn', name: 'Radiance of the Dawn', kind: 'action' },
  { id: 'improved-warding-flare', name: 'Improved Warding Flare', kind: 'passive' },
  // Nature Domain
  { id: 'acolyte-of-nature', name: 'Acolyte of Nature', kind: 'passive' },
  { id: 'charm-animals-and-plants', name: 'Charm Animals and Plants', kind: 'action' },
  { id: 'dampen-elements', name: 'Dampen Elements', kind: 'reaction' },
  { id: 'divine-strike-elemental-fury', name: 'Divine Strike: Elemental Fury', kind: 'action' },
  // Tempest Domain (Wrath of the Storm has Lightning and Thunder reactions)
  { id: 'wrath-of-the-storm', name: 'Wrath of the Storm', kind: 'reaction' },
  { id: 'destructive-wrath', name: 'Destructive Wrath', kind: 'reaction' },
  { id: 'thunderbolt-strike', name: 'Thunderbolt Strike', kind: 'passive' },
  { id: 'divine-strike-thunder', name: 'Divine Strike: Thunder', kind: 'action' },
  // Trickery Domain
  { id: 'blessing-of-the-trickster', name: 'Blessing of the Trickster', kind: 'action' },
  { id: 'invoke-duplicity', name: 'Invoke Duplicity', kind: 'action' },
  {
    id: 'channel-divinity-cloak-of-shadows',
    name: 'Cloak of Shadows',
    kind: 'action',
    wikiPage: 'Channel Divinity: Cloak of Shadows',
  },
  { id: 'divine-strike-poison', name: 'Divine Strike: Poison', kind: 'action' },
  // War Domain
  { id: 'war-priest', name: 'War Priest', kind: 'passive' },
  { id: 'guided-strike', name: 'Guided Strike', kind: 'reaction' },
  {
    id: 'war-gods-blessing',
    name: "War God's Blessing",
    kind: 'reaction',
    wikiPage: "Channel Divinity: War God's Blessing",
  },
  { id: 'divine-strike-weapon', name: 'Divine Strike: Weapon', kind: 'action' },
] satisfies Feature[];

export const clericBundle: ClassBundle = {
  cls: cleric,
  subclasses: clericSubclasses,
  features: clericFeatures,
  optionGroups: [],
};
