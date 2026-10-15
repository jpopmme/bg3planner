import type { Race } from '../schema';

// Source: bg3.wiki "Races" and the page for each race. Every race also gets a free +2/+1 ability
// bonus at character creation; that is a creation rule, not race data.
//
// Darkvision is a feature: where a subrace has Superior Darkvision it supersedes the race's
// Darkvision. Innate spells are cast without spell slots (most once per long rest).

const wizardCantrip = { type: 'cantrip', count: 1, from: { list: 'wizard' } } as const;

const drowMagic = [
  { characterLevel: 1, spell: 'dancing-lights' },
  { characterLevel: 3, spell: 'drow-magic-faerie-fire' },
  { characterLevel: 5, spell: 'darkness' },
];

const civilMilitia = {
  features: ['civil-militia'],
  weaponTypes: ['spears', 'pikes', 'halberds', 'glaives'],
  armour: ['light'],
  shields: true,
} satisfies Partial<Race>;

const dragonborn = (colour: string, ancestry: string, breath: string) => ({
  id: `${colour.toLowerCase()}-dragonborn`,
  name: `${colour} Dragonborn`,
  features: [`draconic-ancestry-${ancestry}`, breath],
});

export const races = [
  {
    id: 'human',
    name: 'Human',
    size: 'medium',
    speed: 9,
    ...civilMilitia,
    features: ['civil-militia', 'human-versatility'],
    choices: [{ type: 'skill', count: 1 }],
    subraces: [],
  },
  {
    id: 'elf',
    name: 'Elf',
    size: 'medium',
    speed: 9,
    features: ['elven-weapon-training', 'darkvision', 'fey-ancestry'],
    weaponTypes: ['shortswords', 'longswords', 'shortbows', 'longbows'],
    skills: ['perception'],
    subraces: [
      {
        id: 'high-elf',
        name: 'High Elf',
        spellcastingAbility: 'intelligence',
        choices: [wizardCantrip],
      },
      { id: 'wood-elf', name: 'Wood Elf', speed: 10.5, skills: ['stealth'] },
    ],
  },
  {
    id: 'drow',
    name: 'Drow',
    size: 'medium',
    speed: 9,
    features: ['drow-weapon-training', 'superior-darkvision', 'fey-ancestry'],
    weaponTypes: ['rapiers', 'shortswords', 'hand-crossbows'],
    skills: ['perception'],
    innateSpells: drowMagic,
    spellcastingAbility: 'charisma',
    // The subraces differ only in dialogue and cleric deities.
    subraces: [
      { id: 'lolth-sworn-drow', name: 'Lolth-Sworn Drow' },
      { id: 'seldarine-drow', name: 'Seldarine Drow' },
    ],
  },
  {
    id: 'half-elf',
    name: 'Half-Elf',
    size: 'medium',
    speed: 9,
    ...civilMilitia,
    features: ['civil-militia', 'darkvision', 'fey-ancestry'],
    subraces: [
      {
        id: 'high-half-elf',
        name: 'High Half-Elf',
        spellcastingAbility: 'intelligence',
        choices: [wizardCantrip],
      },
      { id: 'wood-half-elf', name: 'Wood Half-Elf', speed: 10.5, skills: ['stealth'] },
      {
        id: 'drow-half-elf',
        name: 'Drow Half-Elf',
        innateSpells: drowMagic,
        spellcastingAbility: 'charisma',
      },
    ],
  },
  {
    id: 'half-orc',
    name: 'Half-Orc',
    size: 'medium',
    speed: 9,
    features: ['darkvision', 'relentless-endurance', 'savage-attacks'],
    skills: ['intimidation'],
    subraces: [],
  },
  {
    id: 'halfling',
    name: 'Halfling',
    size: 'small',
    speed: 7.5,
    features: ['halfling-luck', 'brave'],
    subraces: [
      { id: 'lightfoot-halfling', name: 'Lightfoot Halfling', features: ['naturally-stealthy'] },
      {
        id: 'strongheart-halfling',
        name: 'Strongheart Halfling',
        features: ['strongheart-resilience'],
      },
    ],
  },
  {
    id: 'dwarf',
    name: 'Dwarf',
    size: 'medium',
    speed: 7.5,
    features: ['dwarven-combat-training', 'darkvision', 'dwarven-resilience'],
    weaponTypes: ['battleaxes', 'handaxes', 'light-hammers', 'warhammers'],
    subraces: [
      { id: 'gold-dwarf', name: 'Gold Dwarf', features: ['dwarven-toughness'] },
      {
        id: 'shield-dwarf',
        name: 'Shield Dwarf',
        features: ['dwarven-armour-training'],
        armour: ['light', 'medium'],
      },
      {
        id: 'duergar',
        name: 'Duergar',
        features: ['superior-darkvision', 'duergar-resilience'],
        innateSpells: [
          { characterLevel: 3, spell: 'enlarge-duergar' },
          { characterLevel: 5, spell: 'invisibility-duergar' },
        ],
      },
    ],
  },
  {
    id: 'gnome',
    name: 'Gnome',
    size: 'small',
    speed: 7.5,
    features: ['gnome-cunning', 'shortened-stride'],
    subraces: [
      {
        id: 'rock-gnome',
        name: 'Rock Gnome',
        features: ['darkvision', 'artificers-lore'],
        expertise: ['history'],
      },
      {
        id: 'forest-gnome',
        name: 'Forest Gnome',
        features: ['darkvision'],
        innateSpells: [{ characterLevel: 1, spell: 'speak-with-animals' }],
      },
      {
        id: 'deep-gnome',
        name: 'Deep Gnome',
        features: ['superior-darkvision', 'stone-camouflage'],
      },
    ],
  },
  {
    id: 'tiefling',
    name: 'Tiefling',
    size: 'medium',
    speed: 9,
    features: ['darkvision', 'hellish-resistance'],
    subraces: [
      {
        id: 'asmodeus-tiefling',
        name: 'Asmodeus Tiefling',
        // Charisma, except Produce Flame, which uses the character's spellcasting ability.
        spellcastingAbility: 'charisma',
        innateSpells: [
          { characterLevel: 1, spell: 'produce-flame' },
          { characterLevel: 3, spell: 'infernal-legacy-hellish-rebuke' },
          { characterLevel: 5, spell: 'darkness' },
        ],
      },
      {
        id: 'mephistopheles-tiefling',
        name: 'Mephistopheles Tiefling',
        spellcastingAbility: 'charisma',
        innateSpells: [
          { characterLevel: 1, spell: 'mage-hand' },
          { characterLevel: 3, spell: 'legacy-of-cania-burning-hands' },
          { characterLevel: 5, spell: 'legacy-of-cania-flame-blade' },
        ],
      },
      {
        id: 'zariel-tiefling',
        name: 'Zariel Tiefling',
        spellcastingAbility: 'charisma',
        innateSpells: [
          { characterLevel: 1, spell: 'thaumaturgy' },
          { characterLevel: 3, spell: 'legacy-of-avernus-searing-smite' },
          { characterLevel: 5, spell: 'legacy-of-avernus-branding-smite' },
        ],
      },
    ],
  },
  {
    id: 'githyanki',
    name: 'Githyanki',
    size: 'medium',
    speed: 9,
    features: ['astral-knowledge', 'martial-prodigy'],
    weaponTypes: ['shortswords', 'longswords', 'greatswords'],
    armour: ['light', 'medium'],
    innateSpells: [
      { characterLevel: 1, spell: 'githyanki-psionics-mage-hand' },
      { characterLevel: 3, spell: 'githyanki-psionics-jump' },
      { characterLevel: 5, spell: 'misty-step' },
    ],
    subraces: [],
  },
  {
    id: 'dragonborn',
    name: 'Dragonborn',
    size: 'medium',
    speed: 9,
    subraces: [
      dragonborn('Black', 'acid', 'acid-breath'),
      dragonborn('Blue', 'lightning', 'lightning-breath'),
      dragonborn('Brass', 'fire', 'fire-breath-line'),
      dragonborn('Bronze', 'lightning', 'lightning-breath'),
      dragonborn('Copper', 'acid', 'acid-breath'),
      dragonborn('Gold', 'fire', 'fire-breath-cone'),
      dragonborn('Green', 'poison', 'poison-breath'),
      dragonborn('Red', 'fire', 'fire-breath-cone'),
      dragonborn('Silver', 'cold', 'frost-breath'),
      dragonborn('White', 'cold', 'frost-breath'),
    ],
  },
] satisfies Race[];
