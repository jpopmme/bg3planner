import { gameData } from '@bg3planner/gamedata';
import type { Choice } from '@bg3planner/gamedata';

const byId = <T extends { id: string }>(items: T[]) => new Map(items.map((i) => [i.id, i]));
const spells = byId(gameData.spells);
const feats = byId(gameData.feats);
const subclasses = byId(gameData.subclasses);
const weaponTypes = byId(gameData.weaponTypes);
const groups = byId(gameData.optionGroups);

const SMALL_WORDS = new Set(['of', 'the', 'and']);

/** `sleight-of-hand` → `Sleight of Hand`. */
export function titleCase(id: string): string {
  return id
    .split('-')
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export interface DisplayName {
  name: string;
  /** Extra context shown beside the name, e.g. a spell's level and school. */
  detail?: string;
}

export function spellName(id: string): DisplayName {
  const spell = spells.get(id);
  if (!spell) return { name: titleCase(id) };
  const level = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
  return {
    name: spell.name,
    detail: spell.school ? `${level} ${spell.school}` : level,
  };
}

/** Display name for an id offered by a choice. */
export function optionName(choice: Choice, id: string): DisplayName {
  switch (choice.type) {
    case 'subclass':
      return { name: subclasses.get(id)?.name ?? titleCase(id) };
    case 'feat':
      return { name: feats.get(id)?.name ?? titleCase(id) };
    case 'option': {
      const option = groups.get(choice.group)?.options.find((o) => o.id === id);
      return {
        name: option?.name ?? titleCase(id),
        ...(option?.minClassLevel && option.minClassLevel > 2
          ? { detail: `Warlock ${option.minClassLevel}+` }
          : {}),
      };
    }
    case 'cantrip':
    case 'spell':
    case 'replace-spell':
      return spellName(id);
    case 'weapon-proficiency': {
      const weapon = weaponTypes.get(id);
      return weapon
        ? { name: weapon.name, detail: `${weapon.category} ${weapon.range}` }
        : { name: titleCase(id) };
    }
    case 'skill':
    case 'ability-increase':
      return { name: titleCase(id) };
  }
}

/** How many picks a list choice takes. */
export function pickCount(choice: Choice): number {
  return 'count' in choice ? choice.count : 1;
}
