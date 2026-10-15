import type { Feature } from '../schema';

/** Features granted automatically by classes, subclasses and races. Names follow bg3.wiki. */
export const features = [
  // Fighter
  { id: 'second-wind', name: 'Second Wind', kind: 'action' },
  { id: 'action-surge', name: 'Action Surge', kind: 'action' },
  { id: 'extra-attack', name: 'Extra Attack', kind: 'passive' },
  { id: 'indomitable', name: 'Indomitable', kind: 'reaction' },
  { id: 'improved-extra-attack', name: 'Improved Extra Attack', kind: 'passive' },
  // Arcane Archer
  { id: 'curving-shot', name: 'Curving Shot', kind: 'reaction' },
  { id: 'magic-arrow', name: 'Magic Arrow', kind: 'passive' },
  // Battle Master
  { id: 'improved-combat-superiority', name: 'Improved Combat Superiority', kind: 'passive' },
  // Champion
  { id: 'improved-critical-hit', name: 'Improved Critical Hit', kind: 'passive' },
  { id: 'remarkable-athlete-jump', name: 'Remarkable Athlete: Jump', kind: 'passive' },
  {
    id: 'remarkable-athlete-proficiency',
    name: 'Remarkable Athlete: Proficiency',
    kind: 'passive',
  },
  // Eldritch Knight
  { id: 'weapon-bond', name: 'Weapon Bond', kind: 'action' },
  { id: 'war-magic', name: 'War Magic', kind: 'passive' },
  { id: 'eldritch-strike', name: 'Eldritch Strike', kind: 'passive' },
  // Warlock
  { id: 'deepened-pact', name: 'Deepened Pact', kind: 'passive' },
  // The Archfey
  { id: 'fey-presence', name: 'Fey Presence', kind: 'action' },
  { id: 'misty-escape', name: 'Misty Escape', kind: 'reaction' },
  { id: 'beguiling-defences', name: 'Beguiling Defences', kind: 'passive' },
  // The Fiend
  { id: 'dark-ones-blessing', name: "Dark One's Blessing", kind: 'passive' },
  { id: 'dark-ones-own-luck', name: "Dark One's Own Luck", kind: 'passive' },
  { id: 'fiendish-resilience', name: 'Fiendish Resilience', kind: 'action' },
  // The Great Old One
  { id: 'mortal-reminder', name: 'Mortal Reminder', kind: 'passive' },
  { id: 'entropic-ward', name: 'Entropic Ward', kind: 'reaction' },
  {
    id: 'thought-shield-psychic-resistance',
    name: 'Thought Shield: Psychic Resistance',
    kind: 'passive',
  },
  {
    id: 'thought-shield-psychic-reflection',
    name: 'Thought Shield: Psychic Reflection',
    kind: 'passive',
  },
  // The Hexblade
  { id: 'hex-warrior', name: 'Hex Warrior', kind: 'passive' },
  { id: 'bind-hexed-weapon', name: 'Bind Hexed Weapon', kind: 'action' },
  { id: 'hexblades-curse', name: "Hexblade's Curse", kind: 'action' },
  { id: 'accursed-spectre', name: 'Accursed Spectre', kind: 'reaction' },
  { id: 'armour-of-hexes', name: 'Armour of Hexes', kind: 'reaction' },
  // Shared by several classes; derive.ts gives some of these their effect, keyed by id.
  { id: 'evasion', name: 'Evasion', kind: 'passive' },
  {
    id: 'unarmoured-defence-barbarian',
    name: 'Unarmoured Defence',
    kind: 'passive',
    wikiPage: 'Unarmoured Defence (Barbarian)',
  },
  {
    id: 'unarmoured-defence-monk',
    name: 'Unarmoured Defence',
    kind: 'passive',
    wikiPage: 'Unarmoured Defence (Monk)',
  },
  { id: 'fast-movement', name: 'Fast Movement', kind: 'passive' },
  { id: 'unarmoured-movement', name: 'Unarmoured Movement', kind: 'passive' },
  { id: 'draconic-resilience', name: 'Draconic Resilience', kind: 'passive' },
  { id: 'jack-of-all-trades', name: 'Jack of All Trades', kind: 'passive' },
  // Races: senses and weapon training
  { id: 'darkvision', name: 'Darkvision', kind: 'passive' },
  { id: 'superior-darkvision', name: 'Superior Darkvision', kind: 'passive' },
  { id: 'civil-militia', name: 'Civil Militia', kind: 'passive' },
  { id: 'elven-weapon-training', name: 'Elven Weapon Training', kind: 'passive' },
  { id: 'drow-weapon-training', name: 'Drow Weapon Training', kind: 'passive' },
  { id: 'dwarven-combat-training', name: 'Dwarven Combat Training', kind: 'passive' },
  { id: 'dwarven-armour-training', name: 'Dwarven Armour Training', kind: 'passive' },
  { id: 'martial-prodigy', name: 'Martial Prodigy', kind: 'passive' },
  // Races: other traits
  { id: 'human-versatility', name: 'Human Versatility', kind: 'passive' },
  { id: 'fey-ancestry', name: 'Fey Ancestry', kind: 'passive' },
  { id: 'relentless-endurance', name: 'Relentless Endurance', kind: 'passive' },
  { id: 'savage-attacks', name: 'Savage Attacks', kind: 'passive' },
  { id: 'halfling-luck', name: 'Halfling Luck', kind: 'passive' },
  { id: 'brave', name: 'Brave', kind: 'passive' },
  { id: 'naturally-stealthy', name: 'Naturally Stealthy', kind: 'passive' },
  { id: 'strongheart-resilience', name: 'Strongheart Resilience', kind: 'passive' },
  { id: 'dwarven-resilience', name: 'Dwarven Resilience', kind: 'passive' },
  { id: 'dwarven-toughness', name: 'Dwarven Toughness', kind: 'passive' },
  { id: 'duergar-resilience', name: 'Duergar Resilience', kind: 'passive' },
  { id: 'gnome-cunning', name: 'Gnome Cunning', kind: 'passive' },
  { id: 'shortened-stride', name: 'Shortened Stride', kind: 'passive' },
  { id: 'artificers-lore', name: "Artificer's Lore", kind: 'passive' },
  { id: 'stone-camouflage', name: 'Stone Camouflage', kind: 'passive' },
  { id: 'hellish-resistance', name: 'Hellish Resistance', kind: 'passive' },
  { id: 'astral-knowledge', name: 'Astral Knowledge', kind: 'action' },
  // Dragonborn ancestries and breath weapons
  { id: 'draconic-ancestry-acid', name: 'Draconic Ancestry (Acid)', kind: 'passive' },
  { id: 'draconic-ancestry-cold', name: 'Draconic Ancestry (Cold)', kind: 'passive' },
  { id: 'draconic-ancestry-fire', name: 'Draconic Ancestry (Fire)', kind: 'passive' },
  { id: 'draconic-ancestry-lightning', name: 'Draconic Ancestry (Lightning)', kind: 'passive' },
  { id: 'draconic-ancestry-poison', name: 'Draconic Ancestry (Poison)', kind: 'passive' },
  { id: 'acid-breath', name: 'Acid Breath', kind: 'action' },
  { id: 'fire-breath-cone', name: 'Fire Breath (Cone)', kind: 'action' },
  { id: 'fire-breath-line', name: 'Fire Breath (Line)', kind: 'action' },
  { id: 'frost-breath', name: 'Frost Breath', kind: 'action' },
  { id: 'lightning-breath', name: 'Lightning Breath', kind: 'action' },
  { id: 'poison-breath', name: 'Poison Breath', kind: 'action' },
] satisfies Feature[];
