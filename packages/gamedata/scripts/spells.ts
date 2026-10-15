import { slugify } from '@bg3planner/shared';
import { type Spell, spellSchoolSchema } from '../src/schema';

/** Fields requested from bg3.wiki's `spells` Cargo table. Keys are what Special:CargoExport returns. */
export const CARGO_FIELDS = [
  '_pageName=page',
  'name',
  'spell_level',
  'spell_school',
  'is_npc',
  'is_concentration',
  'is_ritual',
  'classes',
  'action_type',
] as const;

export interface CargoSpellRow {
  page: string;
  name: string;
  'spell level': number | string;
  'spell school': string;
  'is npc': number | null;
  'is concentration': number | null;
  'is ritual': number | null;
  classes: string[] | null;
  'action type': string | null;
}

/** Wiki class names → our class ids. Subclass-only entries (e.g. "Life Domain") are dropped. */
const CLASS_IDS: Record<string, string> = {
  Barbarian: 'barbarian',
  Bard: 'bard',
  Cleric: 'cleric',
  Druid: 'druid',
  Fighter: 'fighter',
  Monk: 'monk',
  Paladin: 'paladin',
  Ranger: 'ranger',
  Rogue: 'rogue',
  Sorcerer: 'sorcerer',
  Warlock: 'warlock',
  Wizard: 'wizard',
};

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };

export function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return String.fromCodePoint(n);
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/**
 * Player spells that belong to at least one class list, sorted by level then name.
 *
 * `alsoInclude` keeps spells that class data names directly even though no class list has them,
 * such as Staggering Smite: a Paladin spell above any level BG3 Paladins reach, which Hexblades
 * get through their expanded spell list.
 */
export function toSpells(
  rows: CargoSpellRow[],
  alsoInclude: ReadonlySet<string> = new Set(),
): Spell[] {
  const spells: Spell[] = [];
  const seen = new Map<string, string>();

  for (const row of rows) {
    if (row['is npc']) continue;
    const classes = [
      ...new Set(
        (row.classes ?? []).map((c) => CLASS_IDS[c.trim()]).filter((c) => c !== undefined),
      ),
    ].sort();
    const name = decodeEntities(row.name).trim();
    const id = slugify(name);
    if (classes.length === 0 && !alsoInclude.has(id)) continue;

    const previous = seen.get(id);
    if (previous) {
      throw new Error(`Spell id "${id}" is produced by both "${previous}" and "${row.page}"`);
    }
    seen.set(id, row.page);

    const actionType = row['action type'];
    if (actionType !== 'action' && actionType !== 'bonus' && actionType !== 'reaction') {
      throw new Error(`Unexpected action type ${JSON.stringify(actionType)} on "${row.page}"`);
    }

    spells.push({
      id,
      name,
      level: Number(row['spell level']),
      school: spellSchoolSchema.parse(row['spell school'].trim().toLowerCase()),
      classes,
      concentration: Boolean(row['is concentration']),
      ritual: Boolean(row['is ritual']),
      actionType,
      wikiPage: decodeEntities(row.page),
    });
  }

  const missing = [...alsoInclude].filter((id) => !seen.has(id));
  if (missing.length > 0) {
    throw new Error(`Class data names spells the wiki export lacks: ${missing.join(', ')}`);
  }

  return spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}
