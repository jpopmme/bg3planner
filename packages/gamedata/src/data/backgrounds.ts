import type { Background } from '../schema';

// Source: bg3.wiki "Backgrounds".

export const backgrounds = [
  { id: 'acolyte', name: 'Acolyte', skills: ['insight', 'religion'] },
  { id: 'charlatan', name: 'Charlatan', skills: ['deception', 'sleight-of-hand'] },
  { id: 'criminal', name: 'Criminal', skills: ['deception', 'stealth'] },
  { id: 'entertainer', name: 'Entertainer', skills: ['acrobatics', 'performance'] },
  { id: 'folk-hero', name: 'Folk Hero', skills: ['animal-handling', 'survival'] },
  { id: 'guild-artisan', name: 'Guild Artisan', skills: ['insight', 'persuasion'] },
  {
    id: 'haunted-one',
    name: 'Haunted One',
    skills: ['medicine', 'intimidation'],
    darkUrgeOnly: true,
  },
  { id: 'noble', name: 'Noble', skills: ['history', 'persuasion'] },
  { id: 'outlander', name: 'Outlander', skills: ['athletics', 'survival'] },
  { id: 'sage', name: 'Sage', skills: ['arcana', 'history'] },
  { id: 'soldier', name: 'Soldier', skills: ['athletics', 'intimidation'] },
  { id: 'urchin', name: 'Urchin', skills: ['sleight-of-hand', 'stealth'] },
] satisfies Background[];
