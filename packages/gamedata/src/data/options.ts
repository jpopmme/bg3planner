import type { OptionGroup } from '../schema';

/** Pick lists referenced by `{ type: 'option' }` choices. Each option can be picked once. */
export const optionGroups = [
  {
    id: 'fighting-styles',
    name: 'Fighting Style',
    options: [
      { id: 'archery', name: 'Archery' },
      { id: 'defence', name: 'Defence' },
      { id: 'duelling', name: 'Duelling' },
      { id: 'great-weapon-fighting', name: 'Great Weapon Fighting' },
      { id: 'protection', name: 'Protection' },
      { id: 'two-weapon-fighting', name: 'Two-Weapon Fighting' },
    ],
  },
  {
    id: 'manoeuvres',
    name: 'Manoeuvre',
    // Most manoeuvres appear in game as separate melee and ranged actions; learning one grants both.
    options: [
      { id: 'commanders-strike', name: "Commander's Strike" },
      { id: 'disarming-attack', name: 'Disarming Attack' },
      { id: 'distracting-strike', name: 'Distracting Strike' },
      { id: 'evasive-footwork', name: 'Evasive Footwork' },
      { id: 'feinting-attack', name: 'Feinting Attack' },
      { id: 'goading-attack', name: 'Goading Attack' },
      { id: 'manoeuvring-attack', name: 'Manoeuvring Attack' },
      { id: 'menacing-attack', name: 'Menacing Attack' },
      { id: 'precision-attack', name: 'Precision Attack' },
      { id: 'pushing-attack', name: 'Pushing Attack' },
      { id: 'rally', name: 'Rally' },
      { id: 'riposte', name: 'Riposte' },
      { id: 'sweeping-attack', name: 'Sweeping Attack' },
      { id: 'trip-attack', name: 'Trip Attack' },
    ],
  },
  {
    id: 'arcane-shots',
    name: 'Arcane Shot',
    options: [
      { id: 'banishing-arrow', name: 'Banishing Arrow' },
      { id: 'beguiling-arrow', name: 'Beguiling Arrow' },
      { id: 'bursting-arrow', name: 'Bursting Arrow' },
      { id: 'enfeebling-arrow', name: 'Enfeebling Arrow' },
      { id: 'grasping-arrow', name: 'Grasping Arrow' },
      { id: 'piercing-arrow', name: 'Piercing Arrow' },
      { id: 'seeking-arrow', name: 'Seeking Arrow' },
      { id: 'shadow-arrow', name: 'Shadow Arrow' },
    ],
  },
  {
    id: 'elemental-adept-elements',
    name: 'Elemental Adept element',
    options: [
      { id: 'acid', name: 'Acid' },
      { id: 'cold', name: 'Cold' },
      { id: 'fire', name: 'Fire' },
      { id: 'lightning', name: 'Lightning' },
      { id: 'thunder', name: 'Thunder' },
    ],
  },
  {
    id: 'pact-boons',
    name: 'Pact Boon',
    options: [
      { id: 'pact-of-the-blade', name: 'Pact of the Blade' },
      { id: 'pact-of-the-chain', name: 'Pact of the Chain' },
      { id: 'pact-of-the-tome', name: 'Pact of the Tome' },
    ],
  },
  {
    id: 'eldritch-invocations',
    name: 'Eldritch Invocation',
    // BG3 gates invocations by Warlock level only: no pact boon or cantrip prerequisites.
    options: [
      { id: 'agonising-blast', name: 'Agonising Blast', minClassLevel: 2 },
      { id: 'armour-of-shadows', name: 'Armour of Shadows', minClassLevel: 2 },
      { id: 'beast-speech', name: 'Beast Speech', minClassLevel: 2 },
      { id: 'beguiling-influence', name: 'Beguiling Influence', minClassLevel: 2 },
      { id: 'devils-sight', name: "Devil's Sight", minClassLevel: 2 },
      { id: 'fiendish-vigour', name: 'Fiendish Vigour', minClassLevel: 2 },
      { id: 'mask-of-many-faces', name: 'Mask of Many Faces', minClassLevel: 2 },
      { id: 'one-with-shadows', name: 'One with Shadows', minClassLevel: 2 },
      { id: 'repelling-blast', name: 'Repelling Blast', minClassLevel: 2 },
      { id: 'thief-of-five-fates', name: 'Thief of Five Fates', minClassLevel: 2 },
      { id: 'mire-the-mind', name: 'Mire the Mind', minClassLevel: 5 },
      { id: 'sign-of-ill-omen', name: 'Sign of Ill Omen', minClassLevel: 5 },
      { id: 'book-of-ancient-secrets', name: 'Book of Ancient Secrets', minClassLevel: 7 },
      { id: 'dreadful-word', name: 'Dreadful Word', minClassLevel: 7 },
      { id: 'sculptor-of-flesh', name: 'Sculptor of Flesh', minClassLevel: 7 },
      { id: 'minions-of-chaos', name: 'Minions of Chaos', minClassLevel: 9 },
      { id: 'otherworldly-leap', name: 'Otherworldly Leap', minClassLevel: 9 },
      { id: 'whispers-of-the-grave', name: 'Whispers of the Grave', minClassLevel: 9 },
      { id: 'lifedrinker', name: 'Lifedrinker', minClassLevel: 12 },
    ],
  },
] satisfies OptionGroup[];
