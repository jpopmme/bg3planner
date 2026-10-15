import type { ClassDef, Feature, OptionGroup, SubclassDef } from '../../schema';
import type { ClassBundle } from './bundle';

// Source: bg3.wiki "Monk", "Way of the Drunken Master", "Way of the Four Elements",
// "Way of the Open Hand", "Way of Shadow", "Elemental Disciplines", "Classes" (multiclass
// proficiencies).

const monk = {
  id: 'monk',
  name: 'Monk',
  hitPoints: { firstLevel: 8, perLevel: 5 },
  savingThrows: ['strength', 'dexterity'],
  skillChoices: {
    count: 2,
    from: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
  },
  proficiencies: { armour: [], shields: false, weapons: ['simple'], weaponTypes: ['shortswords'] },
  multiclassProficiencies: {
    armour: [],
    shields: false,
    weapons: ['simple'],
    weaponTypes: ['shortswords'],
  },
  subclassLevel: 3,
  // Martial Arts dice (1d4, 1d6 at 3, 1d8 at 9) and Unarmoured Movement speed (+3 m, +4.5 m at 6,
  // +6 m at 10) scale with Monk level without new features.
  levels: [
    {
      level: 1,
      features: [
        'unarmoured-defence-monk',
        'martial-arts-dextrous-attacks',
        'martial-arts-deft-strikes',
        'martial-arts-bonus-unarmed-strike',
        'flurry-of-blows',
      ],
      choices: [],
      resources: { 'ki-points': 2 },
    },
    {
      level: 2,
      features: [
        'unarmoured-movement',
        'patient-defence',
        'step-of-the-wind-dash',
        'step-of-the-wind-disengage',
      ],
      choices: [],
      resources: { 'ki-points': 3 },
    },
    {
      level: 3,
      features: ['deflect-missiles'],
      choices: [{ type: 'subclass' }],
      resources: { 'ki-points': 4 },
    },
    {
      level: 4,
      features: ['slow-fall'],
      choices: [{ type: 'feat' }],
      resources: { 'ki-points': 5 },
    },
    {
      level: 5,
      features: ['extra-attack', 'stunning-strike-melee', 'stunning-strike-unarmed'],
      choices: [],
      resources: { 'ki-points': 6 },
    },
    {
      level: 6,
      features: ['ki-empowered-strikes'],
      choices: [],
      resources: { 'ki-points': 7 },
    },
    {
      level: 7,
      features: ['evasion', 'stillness-of-mind'],
      choices: [],
      resources: { 'ki-points': 8 },
    },
    { level: 8, features: [], choices: [{ type: 'feat' }], resources: { 'ki-points': 9 } },
    {
      level: 9,
      features: ['advanced-unarmoured-movement'],
      choices: [],
      resources: { 'ki-points': 10 },
    },
    {
      level: 10,
      features: ['purity-of-body'],
      choices: [],
      resources: { 'ki-points': 11 },
    },
    { level: 11, features: [], choices: [], resources: { 'ki-points': 12 } },
    { level: 12, features: [], choices: [{ type: 'feat' }], resources: { 'ki-points': 13 } },
  ],
} satisfies ClassDef;

const wayOfTheDrunkenMaster = {
  id: 'way-of-the-drunken-master',
  classId: 'monk',
  name: 'Way of the Drunken Master',
  addedIn: 'patch-8',
  levels: [
    {
      level: 3,
      // Drunken Technique replaces Flurry of Blows.
      features: ['cheeky-tipple', 'drunken-performance', 'drunken-technique'],
      // Drunken Performance.
      skills: ['performance'],
      choices: [],
    },
    {
      level: 4,
      features: ['intoxicating-strike', 'intoxicating-strike-bonus-action', 'life-of-the-party'],
      choices: [],
    },
    { level: 6, features: ['leap-to-your-feet', 'redirect-attack'], choices: [] },
    { level: 9, features: ['sobering-realisation'], choices: [] },
    { level: 11, features: ['drunkards-luck'], choices: [] },
  ],
} satisfies SubclassDef;

// The disciplines are ki-powered class actions, not spells (bg3.wiki "Elemental Disciplines"),
// so they are an option group rather than a spell list.
const disciplines = (count: number) =>
  ({ type: 'option', group: 'elemental-disciplines', count }) as const;

const wayOfTheFourElements = {
  id: 'way-of-the-four-elements',
  classId: 'monk',
  name: 'Way of the Four Elements',
  levels: [
    { level: 3, features: ['harmony-of-fire-and-water'], choices: [disciplines(3)] },
    { level: 6, features: [], choices: [disciplines(1)] },
    { level: 9, features: ['improved-elemental-casting'], choices: [disciplines(1)] },
    { level: 11, features: [], choices: [disciplines(1)] },
  ],
} satisfies SubclassDef;

const wayOfTheOpenHand = {
  id: 'way-of-the-open-hand',
  classId: 'monk',
  name: 'Way of the Open Hand',
  levels: [
    {
      level: 3,
      features: ['flurry-of-blows-topple', 'flurry-of-blows-stagger', 'flurry-of-blows-push'],
      choices: [],
    },
    {
      level: 6,
      // Toggled passives; only one can be active at a time.
      features: [
        'manifestation-of-body',
        'manifestation-of-mind',
        'manifestation-of-soul',
        'wholeness-of-body',
      ],
      choices: [],
    },
    {
      level: 9,
      features: ['ki-resonation-punch', 'ki-resonation-punch-bonus-action', 'ki-resonation-blast'],
      choices: [],
    },
    { level: 11, features: ['tranquillity'], choices: [] },
  ],
} satisfies SubclassDef;

const wayOfShadow = {
  id: 'way-of-shadow',
  classId: 'monk',
  name: 'Way of Shadow',
  levels: [
    {
      level: 3,
      spells: ['minor-illusion'],
      features: [
        'shadow-arts-hide',
        'shadow-arts-pass-without-trace',
        'shadow-arts-darkness',
        'shadow-arts-darkvision',
        'shadow-arts-silence',
      ],
      choices: [],
    },
    { level: 5, features: ['cloak-of-shadows'], choices: [] },
    { level: 6, features: ['shadow-step'], choices: [] },
    { level: 11, features: ['shadow-strike', 'shadow-strike-unarmed'], choices: [] },
  ],
} satisfies SubclassDef;

const features: Feature[] = [
  // Monk
  { id: 'martial-arts-dextrous-attacks', name: 'Martial Arts: Dextrous Attacks', kind: 'passive' },
  { id: 'martial-arts-deft-strikes', name: 'Martial Arts: Deft Strikes', kind: 'passive' },
  {
    id: 'martial-arts-bonus-unarmed-strike',
    name: 'Martial Arts: Bonus Unarmed Strike',
    kind: 'passive',
  },
  { id: 'flurry-of-blows', name: 'Flurry of Blows', kind: 'action' },
  { id: 'patient-defence', name: 'Patient Defence', kind: 'action' },
  { id: 'step-of-the-wind-dash', name: 'Step of the Wind: Dash', kind: 'action' },
  { id: 'step-of-the-wind-disengage', name: 'Step of the Wind: Disengage', kind: 'action' },
  { id: 'deflect-missiles', name: 'Deflect Missiles', kind: 'reaction' },
  // A toggleable passive that spends the reaction when falling (bg3.wiki "Slow Fall").
  { id: 'slow-fall', name: 'Slow Fall', kind: 'reaction' },
  { id: 'stunning-strike-melee', name: 'Stunning Strike (Melee)', kind: 'action' },
  { id: 'stunning-strike-unarmed', name: 'Stunning Strike (Unarmed)', kind: 'action' },
  { id: 'ki-empowered-strikes', name: 'Ki-Empowered Strikes', kind: 'passive' },
  {
    id: 'stillness-of-mind',
    name: 'Stillness of Mind',
    kind: 'passive',
    wikiPage: 'Stillness of Mind (passive feature)',
  },
  { id: 'advanced-unarmoured-movement', name: 'Advanced Unarmoured Movement', kind: 'passive' },
  { id: 'purity-of-body', name: 'Purity of Body', kind: 'passive' },
  // Way of the Drunken Master
  { id: 'cheeky-tipple', name: 'Cheeky Tipple', kind: 'passive' },
  { id: 'drunken-performance', name: 'Drunken Performance', kind: 'passive' },
  { id: 'drunken-technique', name: 'Drunken Technique', kind: 'action' },
  { id: 'intoxicating-strike', name: 'Intoxicating Strike', kind: 'action' },
  {
    id: 'intoxicating-strike-bonus-action',
    name: 'Intoxicating Strike (Bonus Action)',
    kind: 'action',
  },
  { id: 'life-of-the-party', name: 'Life of the Party', kind: 'passive' },
  { id: 'leap-to-your-feet', name: 'Leap to Your Feet', kind: 'passive' },
  { id: 'redirect-attack', name: 'Redirect Attack', kind: 'reaction' },
  { id: 'sobering-realisation', name: 'Sobering Realisation', kind: 'action' },
  { id: 'drunkards-luck', name: "Drunkard's Luck", kind: 'reaction' },
  // Way of the Four Elements
  { id: 'harmony-of-fire-and-water', name: 'Harmony of Fire and Water', kind: 'action' },
  { id: 'improved-elemental-casting', name: 'Improved Elemental Casting', kind: 'passive' },
  // Way of the Open Hand
  { id: 'flurry-of-blows-topple', name: 'Flurry of Blows: Topple', kind: 'action' },
  { id: 'flurry-of-blows-stagger', name: 'Flurry of Blows: Stagger', kind: 'action' },
  { id: 'flurry-of-blows-push', name: 'Flurry of Blows: Push', kind: 'action' },
  { id: 'manifestation-of-body', name: 'Manifestation of Body', kind: 'passive' },
  { id: 'manifestation-of-mind', name: 'Manifestation of Mind', kind: 'passive' },
  { id: 'manifestation-of-soul', name: 'Manifestation of Soul', kind: 'passive' },
  { id: 'wholeness-of-body', name: 'Wholeness of Body', kind: 'action' },
  { id: 'ki-resonation-punch', name: 'Ki Resonation: Punch', kind: 'action' },
  {
    id: 'ki-resonation-punch-bonus-action',
    name: 'Ki Resonation: Punch (Bonus Action)',
    kind: 'action',
  },
  { id: 'ki-resonation-blast', name: 'Ki Resonation: Blast', kind: 'action' },
  { id: 'tranquillity', name: 'Tranquillity', kind: 'passive' },
  // Way of Shadow
  { id: 'shadow-arts-hide', name: 'Shadow Arts: Hide', kind: 'action' },
  { id: 'shadow-arts-pass-without-trace', name: 'Shadow Arts: Pass Without Trace', kind: 'action' },
  { id: 'shadow-arts-darkness', name: 'Shadow Arts: Darkness', kind: 'action' },
  { id: 'shadow-arts-darkvision', name: 'Shadow Arts: Darkvision', kind: 'action' },
  { id: 'shadow-arts-silence', name: 'Shadow Arts: Silence', kind: 'action' },
  { id: 'cloak-of-shadows', name: 'Cloak of Shadows', kind: 'action' },
  { id: 'shadow-step', name: 'Shadow Step', kind: 'action' },
  { id: 'shadow-strike', name: 'Shadow Strike', kind: 'action' },
  { id: 'shadow-strike-unarmed', name: 'Shadow Strike: Unarmed', kind: 'action' },
];

const discipline = (name: string, minClassLevel?: number) => ({
  id: name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
  name,
  ...(minClassLevel ? { minClassLevel } : {}),
});

const optionGroups: OptionGroup[] = [
  {
    id: 'elemental-disciplines',
    name: 'Elemental Disciplines',
    options: [
      discipline('Blade of Rime'),
      discipline('Chill of the Mountain'),
      discipline('Fangs of the Fire Snake'),
      discipline('Fist of Four Thunders'),
      discipline('Fist of Unbroken Air'),
      discipline('Rush of the Gale Spirits'),
      discipline('Shaping of the Ice'),
      discipline('Sphere of Elemental Balance'),
      discipline('Sweeping Cinder Strike'),
      discipline('Touch of the Storm'),
      discipline('Water Whip'),
      discipline('Clench of the North Wind', 6),
      discipline('Embrace of the Inferno', 6),
      discipline('Gong of the Summit', 6),
      discipline('Flames of the Phoenix', 11),
      discipline('Mist Stance', 11),
      discipline('Ride the Wind', 11),
    ],
  },
];

export const monkBundle: ClassBundle = {
  cls: monk,
  subclasses: [wayOfTheDrunkenMaster, wayOfTheFourElements, wayOfTheOpenHand, wayOfShadow],
  features,
  optionGroups,
};
