import type { ClassDef, SubclassDef } from '../../schema';

// Source: bg3.wiki "Warlock", "The Archfey", "The Fiend", "The Great Old One", "The Hexblade".

const warlockList = { list: 'warlock' } as const;
const learn = (maxLevel: number) =>
  ({ type: 'spell', count: 1, from: warlockList, maxLevel }) as const;
const replace = (maxLevel: number) =>
  ({ type: 'replace-spell', from: warlockList, maxLevel }) as const;
const invocations = (count: number) =>
  ({ type: 'option', group: 'eldritch-invocations', count }) as const;

export const warlock = {
  id: 'warlock',
  name: 'Warlock',
  hitPoints: { firstLevel: 8, perLevel: 5 },
  savingThrows: ['wisdom', 'charisma'],
  skillChoices: {
    count: 2,
    from: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
  },
  proficiencies: { armour: ['light'], shields: false, weapons: ['simple'] },
  multiclassProficiencies: { armour: ['light'], shields: false, weapons: ['simple'] },
  subclassLevel: 1,
  spellcasting: {
    kind: 'pact',
    ability: 'charisma',
    spellList: 'warlock',
    cantripsKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4],
    spellsKnown: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    pactSlots: [
      { count: 1, level: 1 },
      { count: 2, level: 1 },
      { count: 2, level: 2 },
      { count: 2, level: 2 },
      { count: 2, level: 3 },
      { count: 2, level: 3 },
      { count: 2, level: 4 },
      { count: 2, level: 4 },
      { count: 2, level: 5 },
      { count: 2, level: 5 },
      { count: 3, level: 5 },
      { count: 3, level: 5 },
    ],
  },
  levels: [
    {
      level: 1,
      features: [],
      choices: [
        { type: 'subclass' },
        { type: 'cantrip', count: 2, from: warlockList },
        { type: 'spell', count: 2, from: warlockList, maxLevel: 1 },
      ],
    },
    { level: 2, features: [], choices: [invocations(2), learn(1), replace(1)] },
    {
      level: 3,
      features: [],
      choices: [{ type: 'option', group: 'pact-boons', count: 1 }, learn(2), replace(2)],
    },
    {
      level: 4,
      features: [],
      choices: [
        { type: 'feat' },
        { type: 'cantrip', count: 1, from: warlockList },
        learn(2),
        replace(2),
      ],
    },
    { level: 5, features: ['deepened-pact'], choices: [invocations(1), learn(3), replace(3)] },
    { level: 6, features: [], choices: [learn(3), replace(3)] },
    { level: 7, features: [], choices: [invocations(1), learn(4), replace(4)] },
    { level: 8, features: [], choices: [{ type: 'feat' }, learn(4), replace(4)] },
    { level: 9, features: [], choices: [invocations(1), learn(5), replace(5)] },
    {
      level: 10,
      features: [],
      choices: [{ type: 'cantrip', count: 1, from: warlockList }, learn(5), replace(5)],
    },
    {
      level: 11,
      features: [],
      choices: [
        learn(5),
        replace(5),
        {
          type: 'spell',
          count: 1,
          from: warlockList,
          minLevel: 6,
          maxLevel: 6,
          label: 'Mystic Arcanum',
          extra: true,
        },
      ],
    },
    {
      level: 12,
      features: [],
      choices: [{ type: 'feat' }, invocations(1), learn(5), replace(5)],
    },
  ],
} satisfies ClassDef;

export const theArchfey = {
  id: 'the-archfey',
  classId: 'warlock',
  name: 'The Archfey',
  expandedSpells: [
    { classLevel: 1, spells: ['faerie-fire', 'sleep'] },
    { classLevel: 3, spells: ['calm-emotions', 'phantasmal-force'] },
    { classLevel: 5, spells: ['blink', 'plant-growth'] },
    { classLevel: 7, spells: ['dominate-beast', 'greater-invisibility'] },
    { classLevel: 9, spells: ['dominate-person', 'seeming'] },
  ],
  levels: [
    { level: 1, features: ['fey-presence'], choices: [] },
    { level: 6, features: ['misty-escape'], choices: [] },
    { level: 10, features: ['beguiling-defences'], choices: [] },
  ],
} satisfies SubclassDef;

export const theFiend = {
  id: 'the-fiend',
  classId: 'warlock',
  name: 'The Fiend',
  expandedSpells: [
    { classLevel: 1, spells: ['burning-hands', 'command'] },
    { classLevel: 3, spells: ['blindness', 'scorching-ray'] },
    { classLevel: 5, spells: ['fireball', 'stinking-cloud'] },
    { classLevel: 7, spells: ['wall-of-fire', 'fire-shield'] },
    { classLevel: 9, spells: ['cone-of-cold', 'flame-strike'] },
  ],
  levels: [
    { level: 1, features: ['dark-ones-blessing'], choices: [] },
    { level: 6, features: ['dark-ones-own-luck'], choices: [] },
    { level: 10, features: ['fiendish-resilience'], choices: [] },
  ],
} satisfies SubclassDef;

export const theGreatOldOne = {
  id: 'the-great-old-one',
  classId: 'warlock',
  name: 'The Great Old One',
  expandedSpells: [
    { classLevel: 1, spells: ['dissonant-whispers', 'tashas-hideous-laughter'] },
    { classLevel: 3, spells: ['detect-thoughts', 'phantasmal-force'] },
    { classLevel: 5, spells: ['bestow-curse', 'slow'] },
    { classLevel: 7, spells: ['dominate-beast', 'evards-black-tentacles'] },
    { classLevel: 9, spells: ['dominate-person', 'telekinesis'] },
  ],
  levels: [
    { level: 1, features: ['mortal-reminder'], choices: [] },
    { level: 6, features: ['entropic-ward'], choices: [] },
    {
      level: 10,
      features: ['thought-shield-psychic-resistance', 'thought-shield-psychic-reflection'],
      choices: [],
    },
  ],
} satisfies SubclassDef;

export const theHexblade = {
  id: 'the-hexblade',
  classId: 'warlock',
  name: 'The Hexblade',
  addedIn: 'patch-8',
  expandedSpells: [
    { classLevel: 1, spells: ['shield', 'wrathful-smite'] },
    { classLevel: 3, spells: ['blur', 'branding-smite'] },
    { classLevel: 5, spells: ['blink', 'elemental-weapon'] },
    // The last two are The Archfey's; bg3.wiki lists this as a bug, but it is what the game grants.
    {
      classLevel: 7,
      spells: ['phantasmal-killer', 'staggering-smite', 'dominate-beast', 'greater-invisibility'],
    },
    { classLevel: 9, spells: ['banishing-smite', 'cone-of-cold'] },
  ],
  levels: [
    { level: 1, features: ['hex-warrior', 'bind-hexed-weapon', 'hexblades-curse'], choices: [] },
    { level: 6, features: ['accursed-spectre'], choices: [] },
    { level: 10, features: ['armour-of-hexes'], choices: [] },
  ],
} satisfies SubclassDef;

export const warlockSubclasses = [theArchfey, theFiend, theGreatOldOne, theHexblade];
