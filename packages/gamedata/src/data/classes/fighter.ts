import type { ClassDef, SpellSchool, SubclassDef } from '../../schema';

// Source: bg3.wiki "Fighter", "Arcane Archer", "Battle Master", "Champion", "Eldritch Knight".

export const fighter = {
  id: 'fighter',
  name: 'Fighter',
  hitPoints: { firstLevel: 10, perLevel: 6 },
  savingThrows: ['strength', 'constitution'],
  skillChoices: {
    count: 2,
    from: [
      'acrobatics',
      'animal-handling',
      'athletics',
      'history',
      'insight',
      'intimidation',
      'perception',
      'survival',
    ],
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
  subclassLevel: 3,
  levels: [
    {
      level: 1,
      features: ['second-wind'],
      choices: [{ type: 'option', group: 'fighting-styles', count: 1 }],
    },
    { level: 2, features: ['action-surge'], choices: [] },
    { level: 3, features: [], choices: [{ type: 'subclass' }] },
    { level: 4, features: [], choices: [{ type: 'feat' }] },
    { level: 5, features: ['extra-attack'], choices: [] },
    { level: 6, features: [], choices: [{ type: 'feat' }] },
    { level: 7, features: [], choices: [] },
    { level: 8, features: [], choices: [{ type: 'feat' }] },
    { level: 9, features: ['indomitable'], choices: [] },
    { level: 10, features: [], choices: [] },
    { level: 11, features: ['improved-extra-attack'], choices: [] },
    { level: 12, features: [], choices: [{ type: 'feat' }] },
  ],
} satisfies ClassDef;

export const arcaneArcher = {
  id: 'arcane-archer',
  classId: 'fighter',
  name: 'Arcane Archer',
  addedIn: 'patch-8',
  levels: [
    {
      level: 3,
      features: [],
      skills: ['arcana', 'nature'],
      resources: { 'arcane-arrows': 4 },
      choices: [
        { type: 'cantrip', count: 1, from: { spells: ['guidance', 'light', 'true-strike'] } },
        { type: 'option', group: 'arcane-shots', count: 3 },
      ],
    },
    {
      level: 7,
      features: ['curving-shot', 'magic-arrow'],
      resources: { 'arcane-arrows': 7 },
      choices: [{ type: 'option', group: 'arcane-shots', count: 1 }],
    },
    {
      level: 10,
      features: [],
      resources: { 'arcane-arrows': 10 },
      choices: [{ type: 'option', group: 'arcane-shots', count: 1 }],
    },
  ],
} satisfies SubclassDef;

export const battleMaster = {
  id: 'battle-master',
  classId: 'fighter',
  name: 'Battle Master',
  levels: [
    {
      level: 3,
      features: [],
      resources: { 'superiority-dice': 4 },
      choices: [{ type: 'option', group: 'manoeuvres', count: 3 }],
    },
    {
      level: 7,
      features: [],
      resources: { 'superiority-dice': 5 },
      choices: [{ type: 'option', group: 'manoeuvres', count: 2 }],
    },
    {
      level: 10,
      features: ['improved-combat-superiority'],
      choices: [{ type: 'option', group: 'manoeuvres', count: 2 }],
    },
  ],
} satisfies SubclassDef;

export const champion = {
  id: 'champion',
  classId: 'fighter',
  name: 'Champion',
  levels: [
    { level: 3, features: ['improved-critical-hit'], choices: [] },
    {
      level: 7,
      features: ['remarkable-athlete-jump', 'remarkable-athlete-proficiency'],
      choices: [],
    },
    // A second fighting style; the one picked at Fighter level 1 cannot be picked again.
    { level: 10, features: [], choices: [{ type: 'option', group: 'fighting-styles', count: 1 }] },
  ],
} satisfies SubclassDef;

const abjurationOrEvocation: SpellSchool[] = ['abjuration', 'evocation'];
const wizardList = { list: 'wizard' } as const;

// Eldritch Knights pick Abjuration/Evocation wizard spells, plus one spell of any school at
// Fighter levels 3 and 8. Replacements may come from the whole wizard list, but in BG3 they are
// capped at 1st-level spells until Fighter level 8.
const replace = (maxLevel: number) =>
  ({ type: 'replace-spell', from: wizardList, maxLevel }) as const;

export const eldritchKnight = {
  id: 'eldritch-knight',
  classId: 'fighter',
  name: 'Eldritch Knight',
  spellcasting: {
    kind: 'third',
    ability: 'intelligence',
    spellList: 'wizard',
    cantripsKnown: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3],
    spellsKnown: [0, 0, 3, 4, 4, 4, 6, 7, 7, 8, 9, 9],
    slots: [[], [], [2], [3], [3], [3], [4, 2], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3]],
  },
  levels: [
    {
      level: 3,
      features: ['weapon-bond'],
      choices: [
        { type: 'cantrip', count: 2, from: wizardList },
        { type: 'spell', count: 2, from: wizardList, maxLevel: 1, schools: abjurationOrEvocation },
        { type: 'spell', count: 1, from: wizardList, maxLevel: 1, label: 'Any school' },
      ],
    },
    {
      level: 4,
      features: [],
      choices: [
        { type: 'spell', count: 1, from: wizardList, maxLevel: 1, schools: abjurationOrEvocation },
        replace(1),
      ],
    },
    { level: 5, features: [], choices: [replace(1)] },
    { level: 6, features: [], choices: [replace(1)] },
    {
      level: 7,
      features: ['war-magic'],
      choices: [
        { type: 'spell', count: 2, from: wizardList, maxLevel: 2, schools: abjurationOrEvocation },
        replace(1),
      ],
    },
    {
      level: 8,
      features: [],
      choices: [
        { type: 'spell', count: 1, from: wizardList, maxLevel: 2, label: 'Any school' },
        replace(2),
      ],
    },
    { level: 9, features: [], choices: [replace(2)] },
    {
      level: 10,
      features: ['eldritch-strike'],
      choices: [
        { type: 'cantrip', count: 1, from: wizardList },
        { type: 'spell', count: 1, from: wizardList, maxLevel: 2, schools: abjurationOrEvocation },
        replace(2),
      ],
    },
    {
      level: 11,
      features: [],
      choices: [
        { type: 'spell', count: 1, from: wizardList, maxLevel: 2, schools: abjurationOrEvocation },
        replace(2),
      ],
    },
    { level: 12, features: [], choices: [replace(2)] },
  ],
} satisfies SubclassDef;

export const fighterSubclasses = [arcaneArcher, battleMaster, champion, eldritchKnight];
