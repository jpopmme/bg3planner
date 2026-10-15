import type { ClassDef, Feature, Option, OptionGroup, SubclassDef } from '../../schema';
import type { ClassBundle } from './bundle';

// Source: bg3.wiki "Druid", "Circle of the Land", "Circle of the Moon", "Circle of the Spores",
// "Circle of the Stars", "Wild Shape", "Combat Wild Shape", "Classes" (multiclass proficiencies).

const druidList = { list: 'druid' } as const;

export const druid = {
  id: 'druid',
  name: 'Druid',
  hitPoints: { firstLevel: 8, perLevel: 5 },
  savingThrows: ['intelligence', 'wisdom'],
  skillChoices: {
    count: 2,
    from: [
      'arcana',
      'animal-handling',
      'insight',
      'medicine',
      'nature',
      'perception',
      'religion',
      'survival',
    ],
  },
  // BG3 Druids are proficient with these weapon types only, not with all simple weapons.
  proficiencies: {
    armour: ['light', 'medium'],
    shields: true,
    weapons: [],
    weaponTypes: [
      'clubs',
      'daggers',
      'javelins',
      'maces',
      'quarterstaves',
      'scimitars',
      'sickles',
      'spears',
    ],
  },
  multiclassProficiencies: { armour: ['light', 'medium'], shields: true, weapons: [] },
  subclassLevel: 2,
  spellcasting: {
    kind: 'full',
    ability: 'wisdom',
    spellList: 'druid',
    preparation: 'whole-list',
    cantripsKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4],
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
    { level: 1, features: [], choices: [{ type: 'cantrip', count: 2, from: druidList }] },
    {
      level: 2,
      features: [
        'wild-shape',
        'wild-shape-badger',
        'wild-shape-cat',
        'wild-shape-spider',
        'wild-shape-wolf',
      ],
      resources: { 'wild-shape-charges': 2 },
      choices: [{ type: 'subclass' }],
    },
    { level: 3, features: [], choices: [] },
    {
      level: 4,
      // Wild Shape Improvement raises beast attack damage again at levels 8 and 12.
      features: ['wild-shape-improvement', 'wild-shape-deep-rothe'],
      choices: [{ type: 'feat' }, { type: 'cantrip', count: 1, from: druidList }],
    },
    { level: 5, features: ['wild-strike'], choices: [] },
    { level: 6, features: ['wild-shape-panther', 'wild-shape-owlbear'], choices: [] },
    { level: 7, features: [], choices: [] },
    { level: 8, features: [], choices: [{ type: 'feat' }] },
    { level: 9, features: [], choices: [] },
    {
      level: 10,
      features: ['wild-shape-dilophosaurus', 'improved-wild-strike'],
      choices: [{ type: 'cantrip', count: 1, from: druidList }],
    },
    { level: 11, features: [], choices: [] },
    { level: 12, features: [], choices: [{ type: 'feat' }] },
  ],
} satisfies ClassDef;

// ---------------------------------------------------------------------------
// Circle of the Land
// ---------------------------------------------------------------------------

// A land is chosen anew at Druid levels 3, 5, 7 and 9 (any land each time), and each choice
// gives that land's two circle spells of the newly unlocked spell level, always prepared.
type Land =
  'arctic' | 'coast' | 'desert' | 'forest' | 'grassland' | 'mountain' | 'swamp' | 'underdark';

const lands: { id: Land; name: string; wikiPage?: string }[] = [
  { id: 'arctic', name: 'Arctic' },
  { id: 'coast', name: 'Coast' },
  { id: 'desert', name: 'Desert' },
  { id: 'forest', name: 'Forest', wikiPage: 'Forest (passive feature)' },
  { id: 'grassland', name: 'Grassland' },
  { id: 'mountain', name: 'Mountain' },
  { id: 'swamp', name: 'Swamp' },
  { id: 'underdark', name: 'Underdark', wikiPage: 'Underdark (passive feature)' },
];

/** Circle spells by the Druid level that grants them, then by land. */
const landCircleSpells: Record<3 | 5 | 7 | 9, Record<Land, [string, string]>> = {
  3: {
    arctic: ['hold-person', 'spike-growth'],
    coast: ['mirror-image', 'misty-step'],
    desert: ['blur', 'silence'],
    forest: ['barkskin', 'hold-person'],
    grassland: ['invisibility', 'pass-without-trace'],
    mountain: ['mirror-image', 'spike-growth'],
    swamp: ['melfs-acid-arrow', 'darkness'],
    underdark: ['web', 'misty-step'],
  },
  5: {
    arctic: ['sleet-storm', 'haste'],
    coast: ['sleet-storm', 'call-lightning'],
    desert: ['protection-from-energy', 'hypnotic-pattern'],
    forest: ['call-lightning', 'plant-growth'],
    grassland: ['daylight', 'haste'],
    mountain: ['lightning-bolt', 'grant-flight'],
    swamp: ['stinking-cloud', 'vampiric-touch'],
    underdark: ['gaseous-form', 'stinking-cloud'],
  },
  7: {
    arctic: ['conjure-minor-elemental', 'ice-storm'],
    coast: ['freedom-of-movement', 'confusion'],
    desert: ['blight', 'wall-of-fire'],
    forest: ['conjure-minor-elemental', 'grasping-vine'],
    grassland: ['freedom-of-movement', 'polymorph'],
    mountain: ['stoneskin', 'dominate-beast'],
    swamp: ['blight', 'grasping-vine'],
    underdark: ['greater-invisibility', 'dominate-beast'],
  },
  9: {
    arctic: ['cone-of-cold', 'contagion'],
    coast: ['conjure-elemental', 'greater-restoration'],
    desert: ['wall-of-stone', 'insect-plague'],
    forest: ['mass-cure-wounds', 'contagion'],
    grassland: ['greater-restoration', 'insect-plague'],
    mountain: ['wall-of-stone', 'conjure-elemental'],
    swamp: ['insect-plague', 'cloudkill'],
    underdark: ['contagion', 'cloudkill'],
  },
};

const ordinal = { 3: '2nd', 5: '3rd', 7: '4th', 9: '5th' } as const;

const landCircleSpellGroups: OptionGroup[] = ([3, 5, 7, 9] as const).map((level) => ({
  id: `land-circle-spells-${level}`,
  name: `Circle of the Land: ${ordinal[level]}-level circle spells`,
  options: lands.map(({ id, name, wikiPage }): Option => ({
    id,
    name,
    ...(wikiPage ? { wikiPage } : {}),
    grants: { spells: [...landCircleSpells[level][id]] },
  })),
}));

const landSpells = (level: 3 | 5 | 7 | 9) =>
  ({ type: 'option', group: `land-circle-spells-${level}`, count: 1 }) as const;

export const circleOfTheLand = {
  id: 'circle-of-the-land',
  classId: 'druid',
  name: 'Circle of the Land',
  levels: [
    {
      level: 2,
      features: ['natural-recovery'],
      resources: { 'natural-recovery-charges': 1 },
      choices: [{ type: 'cantrip', count: 1, from: druidList, label: 'Bonus cantrip' }],
    },
    {
      level: 3,
      features: [],
      resources: { 'natural-recovery-charges': 2 },
      choices: [landSpells(3)],
    },
    {
      level: 5,
      features: [],
      resources: { 'natural-recovery-charges': 3 },
      choices: [landSpells(5)],
    },
    {
      level: 6,
      // Land's Stride: Advantage and Plants are hidden in game but granted (bg3.wiki).
      features: [
        'lands-stride-difficult-terrain-druid',
        'lands-stride-advantage',
        'lands-stride-plants-druid',
      ],
      choices: [],
    },
    {
      level: 7,
      features: [],
      resources: { 'natural-recovery-charges': 4 },
      choices: [landSpells(7)],
    },
    {
      level: 9,
      features: [],
      resources: { 'natural-recovery-charges': 5 },
      choices: [landSpells(9)],
    },
    { level: 10, features: ['natures-ward'], choices: [] },
    { level: 11, features: [], resources: { 'natural-recovery-charges': 6 }, choices: [] },
  ],
} satisfies SubclassDef;

// ---------------------------------------------------------------------------
// Other circles
// ---------------------------------------------------------------------------

export const circleOfTheMoon = {
  id: 'circle-of-the-moon',
  classId: 'druid',
  name: 'Circle of the Moon',
  levels: [
    {
      level: 2,
      // Combat Wild Shape is the bonus-action Wild Shape with every base form plus the Moon's own.
      features: ['lunar-mend', 'combat-wild-shape', 'wild-shape-bear'],
      choices: [],
    },
    { level: 4, features: ['wild-shape-dire-raven'], choices: [] },
    { level: 6, features: ['primal-strike'], choices: [] },
    { level: 8, features: ['wild-shape-sabre-toothed-tiger'], choices: [] },
    {
      level: 10,
      features: [
        'wild-shape-air-myrmidon',
        'wild-shape-earth-myrmidon',
        'wild-shape-fire-myrmidon',
        'wild-shape-water-myrmidon',
      ],
      choices: [],
    },
  ],
} satisfies SubclassDef;

export const circleOfTheSpores = {
  id: 'circle-of-the-spores',
  classId: 'druid',
  name: 'Circle of the Spores',
  levels: [
    {
      level: 2,
      features: ['halo-of-spores', 'symbiotic-entity'],
      spells: ['bone-chill'],
      choices: [],
    },
    { level: 3, features: [], spells: ['blindness', 'detect-thoughts'], choices: [] },
    { level: 5, features: [], spells: ['animate-dead', 'gaseous-form'], choices: [] },
    {
      level: 6,
      features: ['fungal-infestation'],
      resources: { 'fungal-infestation-charges': 4 },
      choices: [],
    },
    { level: 7, features: [], spells: ['blight', 'confusion'], choices: [] },
    { level: 9, features: [], spells: ['cloudkill', 'contagion'], choices: [] },
    { level: 10, features: ['spreading-spores'], choices: [] },
  ],
} satisfies SubclassDef;

export const circleOfTheStars = {
  id: 'circle-of-the-stars',
  classId: 'druid',
  name: 'Circle of the Stars',
  addedIn: 'patch-8',
  levels: [
    {
      level: 2,
      features: ['starry-form', 'starry-form-archer', 'starry-form-chalice', 'starry-form-dragon'],
      // Star Map: Guiding Bolt casts Guiding Bolt with a Star Map charge instead of a slot.
      spells: ['guidance', 'guiding-bolt', 'star-map-guiding-bolt'],
      resources: { 'star-maps': 2 },
      choices: [],
    },
    { level: 5, features: [], resources: { 'star-maps': 3 }, choices: [] },
    { level: 6, features: ['cosmic-omen'], resources: { 'cosmic-omens': 3 }, choices: [] },
    { level: 9, features: [], resources: { 'star-maps': 4, 'cosmic-omens': 4 }, choices: [] },
    { level: 10, features: ['twinkling-constellations'], choices: [] },
  ],
} satisfies SubclassDef;

export const druidSubclasses = [
  circleOfTheLand,
  circleOfTheMoon,
  circleOfTheSpores,
  circleOfTheStars,
];

export const druidFeatures = [
  // Druid
  { id: 'wild-shape', name: 'Wild Shape', kind: 'action' },
  { id: 'wild-shape-badger', name: 'Wild Shape: Badger', kind: 'action' },
  { id: 'wild-shape-cat', name: 'Wild Shape: Cat', kind: 'action' },
  { id: 'wild-shape-spider', name: 'Wild Shape: Spider', kind: 'action' },
  { id: 'wild-shape-wolf', name: 'Wild Shape: Wolf', kind: 'action' },
  { id: 'wild-shape-deep-rothe', name: 'Wild Shape: Deep Rothé', kind: 'action' },
  { id: 'wild-shape-panther', name: 'Wild Shape: Panther', kind: 'action' },
  { id: 'wild-shape-owlbear', name: 'Wild Shape: Owlbear', kind: 'action' },
  { id: 'wild-shape-dilophosaurus', name: 'Wild Shape: Dilophosaurus', kind: 'action' },
  // A section of the "Wild Shape" page; the "Wild Shape Improvement" title redirects there.
  {
    id: 'wild-shape-improvement',
    name: 'Wild Shape Improvement',
    kind: 'passive',
    description:
      'Beast form attacks deal an extra 1d4 or 1d6 damage, depending on the form and attack. The die grows one size at level 8 and again at level 12.',
  },
  { id: 'wild-strike', name: 'Wild Strike', kind: 'passive' },
  { id: 'improved-wild-strike', name: 'Improved Wild Strike', kind: 'passive' },
  // Circle of the Land
  { id: 'natural-recovery', name: 'Natural Recovery', kind: 'action' },
  {
    id: 'lands-stride-difficult-terrain-druid',
    name: "Land's Stride: Difficult Terrain",
    kind: 'passive',
  },
  { id: 'lands-stride-advantage', name: "Land's Stride: Advantage", kind: 'passive' },
  { id: 'lands-stride-plants-druid', name: "Land's Stride: Plants", kind: 'passive' },
  { id: 'natures-ward', name: "Nature's Ward", kind: 'passive' },
  // Circle of the Moon
  { id: 'lunar-mend', name: 'Lunar Mend', kind: 'action' },
  { id: 'combat-wild-shape', name: 'Combat Wild Shape', kind: 'action' },
  { id: 'wild-shape-bear', name: 'Wild Shape: Bear', kind: 'action' },
  { id: 'wild-shape-dire-raven', name: 'Wild Shape: Dire Raven', kind: 'action' },
  { id: 'primal-strike', name: 'Primal Strike', kind: 'passive' },
  {
    id: 'wild-shape-sabre-toothed-tiger',
    name: 'Wild Shape: Sabre-Toothed Tiger',
    kind: 'action',
  },
  { id: 'wild-shape-air-myrmidon', name: 'Wild Shape: Air Myrmidon', kind: 'action' },
  { id: 'wild-shape-earth-myrmidon', name: 'Wild Shape: Earth Myrmidon', kind: 'action' },
  { id: 'wild-shape-fire-myrmidon', name: 'Wild Shape: Fire Myrmidon', kind: 'action' },
  { id: 'wild-shape-water-myrmidon', name: 'Wild Shape: Water Myrmidon', kind: 'action' },
  // Circle of the Spores
  { id: 'halo-of-spores', name: 'Halo of Spores', kind: 'reaction' },
  { id: 'symbiotic-entity', name: 'Symbiotic Entity', kind: 'action' },
  { id: 'fungal-infestation', name: 'Fungal Infestation', kind: 'reaction' },
  { id: 'spreading-spores', name: 'Spreading Spores', kind: 'action' },
  // Circle of the Stars
  { id: 'starry-form', name: 'Starry Form', kind: 'passive' },
  { id: 'starry-form-archer', name: 'Starry Form: Archer', kind: 'action' },
  { id: 'starry-form-chalice', name: 'Starry Form: Chalice', kind: 'action' },
  { id: 'starry-form-dragon', name: 'Starry Form: Dragon', kind: 'action' },
  // Each long rest rolls Weal or Woe, which decides the Cosmic Omen reactions available.
  { id: 'cosmic-omen', name: 'Cosmic Omen', kind: 'passive' },
  { id: 'twinkling-constellations', name: 'Twinkling Constellations', kind: 'passive' },
] satisfies Feature[];

export const druidBundle: ClassBundle = {
  cls: druid,
  subclasses: druidSubclasses,
  features: druidFeatures,
  optionGroups: landCircleSpellGroups,
};
