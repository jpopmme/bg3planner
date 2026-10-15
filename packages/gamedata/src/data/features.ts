import type { Feature } from '../schema';

/** Features granted automatically by Fighter, Warlock and their subclasses. Names follow bg3.wiki. */
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
] satisfies Feature[];
