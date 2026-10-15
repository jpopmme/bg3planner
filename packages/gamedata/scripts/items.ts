import { ABILITIES, type Ability, SKILLS, type Skill, slugify } from '@bg3planner/shared';
import {
  type AbilityEffect,
  ITEM_KINDS,
  type Item,
  type ItemKind,
  RARITIES,
  type Rarity,
} from '../src/schema';
import { decodeEntities } from './spells';

/** Fields requested from bg3.wiki's `equipment` Cargo table (armour, clothing, accessories). */
export const EQUIPMENT_FIELDS = [
  '_pageName=page',
  'name',
  'uid',
  'type',
  'proficiency',
  'armour_class',
  'armour_class_bonus',
  'stealth_disadvantage',
  'rarity',
  'passives',
  'special',
  'legacy',
] as const;

/** Fields requested from bg3.wiki's `weapons` Cargo table. */
export const WEAPON_FIELDS = [
  '_pageName=page',
  'name',
  'uid',
  'type',
  'rarity',
  'enchantment',
  'damage',
  'damage_type',
  'versatile_damage',
  'extra_damage',
  'extra_damage_type',
  'finesse',
  'heavy',
  'light',
  'reach',
  'thrown',
  'weapon_passives',
  'special_weapon_actions',
  'special',
  'legacy',
] as const;

/** Fields requested from bg3.wiki's `item_locations` Cargo table. */
export const LOCATION_FIELDS = ['uid'] as const;

type CargoText = string | null;
type CargoNumber = number | string | null;

interface CargoItemRow {
  page: string;
  name: CargoText;
  uid: CargoText;
  type: CargoText;
  rarity: CargoText;
  special: CargoText;
  /** Set for items players cannot get (`unobtainable`, `inaccessible`, `legacy`, `unusable`). */
  legacy: CargoText;
}

export interface CargoEquipmentRow extends CargoItemRow {
  proficiency: CargoText;
  'armour class': CargoNumber;
  'armour class bonus': CargoNumber;
  'stealth disadvantage': CargoNumber;
  passives: string[] | null;
}

export interface CargoWeaponRow extends CargoItemRow {
  enchantment: CargoNumber;
  damage: CargoText;
  'damage type': CargoText;
  'versatile damage': CargoText;
  'extra damage': CargoText;
  'extra damage type': CargoText;
  finesse: CargoNumber;
  heavy: CargoNumber;
  light: CargoNumber;
  reach: CargoNumber;
  thrown: CargoNumber;
  'weapon passives': string[] | null;
  'special weapon actions': string[] | null;
}

export interface CargoLocationRow {
  uid: CargoText;
}

/** Wiki equipment types → our item kinds. Camp clothes, underwear and instruments are left out. */
const EQUIPMENT_KINDS: Record<string, Exclude<ItemKind, 'weapon'>> = {
  Helmets: 'head',
  Cloaks: 'cloak',
  Clothing: 'armour',
  'Light Armour': 'armour',
  'Medium Armour': 'armour',
  'Heavy Armour': 'armour',
  Gloves: 'gloves',
  Boots: 'boots',
  Amulets: 'amulet',
  Rings: 'ring',
  Shields: 'shield',
};

const PROFICIENCIES = {
  'Light Armour': 'light',
  'Medium Armour': 'medium',
  'Heavy Armour': 'heavy',
} as const;

/** Found in this many places or more: enough copies that two characters can each have one. */
const COMMON_ENOUGH = 5;

/** Weapons a spell creates, so every caster gets their own. */
const SUMMONED = new Set(['Shadow Blade (weapon)']);

function isUnique(row: CargoItemRow, name: string, rarity: Rarity, locations: number): boolean {
  if (rarity === 'common' || /\+\d$/.test(name) || SUMMONED.has(decodeEntities(row.page))) {
    return false;
  }
  return locations < COMMON_ENOUGH;
}

/**
 * Replaces `[[File:…]]` links with a space (an icon can stand between words, as in `2d8 Fire`).
 * They can nest other links in their alt text (`[[File:X.png|alt=[[Saving Throw]]|…]]`).
 */
function removeFileLinks(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('[[File:', i)) {
      let depth = 0;
      do {
        if (text.startsWith('[[', i)) {
          depth++;
          i += 2;
        } else if (text.startsWith(']]', i)) {
          depth--;
          i += 2;
        } else i++;
      } while (depth > 0 && i < text.length);
      out += ' ';
    } else out += text[i++];
  }
  return out;
}

/** Wikitext (with expanded HTML templates) → plain text. */
export function wikiToText(raw: string): string {
  // Template output is escaped up to three times in the export (`&amp;amp;nbsp;`).
  let text = raw;
  for (let previous = ''; previous !== text;) {
    previous = text;
    text = decodeEntities(text);
  }
  text = removeFileLinks(text);
  // Footnotes point at the wiki page's Bugs and Notes sections, which are not shown here.
  text = text.replace(/<sup>[\s\S]*?<\/sup>/g, '');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/\{\{[^{}]*\}\}/g, '');
  text = text.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1');
  text = text.replace(/'{2,}/g, '');
  text = text.replace(/[\u00a0\u2009\u202f]/g, ' ');
  // Pointers to the wiki page's own Notes and Bugs sections.
  text = text.replace(/\s*\[?\s*See:? (Notes|Bugs)\s*\]/g, '');
  // Icons removed above leave brackets behind: `Scarlet Feast ()`, `Knock (+ )`, `( Recharge: …)`.
  text = text.replace(/\(\s*\+?\s*\)/g, '').replace(/\(\s+/g, '(');
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/ +([.,:])/g, '$1')
    .replace(/^ +| +$/gm, '')
    .trim();
}

/** The bullet points of a `special` field, as plain text. */
export function specialEffects(special: CargoText): string[] {
  if (!special) return [];
  return wikiToText(special)
    .split('\n')
    .map((line) => line.replace(/^[*#:\s]+/, '').trim())
    .filter((line) => line && !/^No special properties/i.test(line));
}

function cleanList(values: string[] | null): string[] {
  return (values ?? [])
    .map((v) =>
      decodeEntities(v)
        .replace(/\s*\(passive feature\)$/i, '')
        .trim(),
    )
    .filter(Boolean);
}

/** `sleight-of-hand` → `Sleight of Hand`, as the wiki writes it. */
const titleCase = (id: string) =>
  id
    .split('-')
    .map((word, i) => (i > 0 && word === 'of' ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join(' ');
const ABILITY_NAMES = new Map(ABILITIES.map((a): [string, Ability] => [titleCase(a), a]));
const SKILL_NAMES = new Map(SKILLS.map((s): [string, Skill] => [titleCase(s), s]));
const ABILITY = [...ABILITY_NAMES.keys()].join('|');
const SKILL = [...SKILL_NAMES.keys()].join('|');
const SET_ABILITY = new RegExp(`^Sets? the wearer's (${ABILITY})(?: score)? to (\\d+)`);
const ADD_ABILITY = new RegExp(`^(${ABILITY}) ([+-]\\d+)(?:,? \\(?up to (\\d+)\\)?)?\\.?$`);
const SAVING_THROWS = new RegExp(`^(?:(${ABILITY}) )?Saving Throws? ([+-]\\d+)\\.?$`);
const SKILL_BONUS = new RegExp(`^(${SKILL}) ([+-]\\d+)\\.?$`);

/** Stat changes the planner can apply, read from effect lines the wiki writes in fixed phrasings. */
export function statEffects(
  effects: string[],
): Pick<Item, 'armourClassBonus' | 'abilityEffects' | 'savingThrowBonus' | 'skillBonus'> {
  let armourClass = 0;
  const abilityEffects: AbilityEffect[] = [];
  const saves: Partial<Record<Ability | 'all', number>> = {};
  const skills: Partial<Record<Skill, number>> = {};
  for (const line of effects) {
    let m: RegExpExecArray | null;
    if ((m = /^Armour Class ([+-]\d+)\b/.exec(line))) armourClass += Number(m[1]);
    else if ((m = SET_ABILITY.exec(line))) {
      abilityEffects.push({ ability: ABILITY_NAMES.get(m[1]!)!, set: Number(m[2]) });
    } else if ((m = ADD_ABILITY.exec(line))) {
      abilityEffects.push({
        ability: ABILITY_NAMES.get(m[1]!)!,
        add: Number(m[2]),
        ...(m[3] ? { max: Number(m[3]) } : {}),
      });
    } else if ((m = SAVING_THROWS.exec(line))) {
      const key = m[1] ? ABILITY_NAMES.get(m[1])! : 'all';
      saves[key] = (saves[key] ?? 0) + Number(m[2]);
    } else if ((m = SKILL_BONUS.exec(line))) {
      const skill = SKILL_NAMES.get(m[1]!)!;
      skills[skill] = (skills[skill] ?? 0) + Number(m[2]);
    }
  }
  return {
    ...(armourClass ? { armourClassBonus: armourClass } : {}),
    ...(abilityEffects.length ? { abilityEffects } : {}),
    ...(Object.keys(saves).length ? { savingThrowBonus: saves } : {}),
    ...(Object.keys(skills).length ? { skillBonus: skills } : {}),
  };
}

const toNumber = (value: CargoNumber): number | undefined =>
  value === null || value === '' ? undefined : Number(value);

function rarityOf(row: CargoItemRow): Rarity {
  const rarity = row.rarity?.trim().toLowerCase();
  if (!RARITIES.includes(rarity as Rarity)) {
    throw new Error(`Unexpected rarity ${JSON.stringify(row.rarity)} on "${row.page}"`);
  }
  return rarity as Rarity;
}

/** An item before its id and shown name are settled; distributes over the item kinds. */
type ItemBody = Item extends infer T ? (T extends Item ? Omit<T, 'id' | 'name'> : never) : never;

interface Draft {
  row: CargoItemRow;
  name: string;
  item: ItemBody;
}

function equipmentDraft(row: CargoEquipmentRow, locations: number): Draft | undefined {
  const kind = row.type ? EQUIPMENT_KINDS[row.type] : undefined;
  if (!kind) return undefined;
  const name = decodeEntities(row.name ?? row.page).trim();
  const rarity = rarityOf(row);
  const effects = specialEffects(row.special);
  const base = {
    rarity,
    unique: isUnique(row, name, rarity, locations),
    ...statEffects(effects),
    effects,
    passives: cleanList(row.passives),
    wikiPage: decodeEntities(row.page),
  };

  if (kind === 'armour') {
    const passives = base.passives;
    return {
      row,
      name,
      item: {
        ...base,
        kind,
        proficiency: PROFICIENCIES[row.type as keyof typeof PROFICIENCIES] ?? null,
        armourClass: toNumber(row['armour class']) ?? 10,
        ...(passives.includes('Exotic Material') ? { noDexterityCap: true } : {}),
        stealthDisadvantage: Boolean(toNumber(row['stealth disadvantage'])),
      },
    };
  }
  if (kind === 'shield') {
    const shieldBonus = toNumber(row['armour class bonus']) ?? 2;
    return { row, name, item: { ...base, kind, shieldBonus } };
  }
  return { row, name, item: { ...base, kind } };
}

function weaponDraft(row: CargoWeaponRow, locations: number): Draft {
  const name = decodeEntities(row.name ?? row.page).trim();
  const rarity = rarityOf(row);
  if (!row.type || !row.damage) throw new Error(`Weapon "${row.page}" lacks a type or damage`);
  const typed = (dice: string, type: CargoText) => (type ? `${dice} ${type}` : dice);
  let damage = typed(row.damage, row['damage type']);
  if (row['extra damage']) damage += ` + ${typed(row['extra damage'], row['extra damage type'])}`;
  const properties = (['finesse', 'heavy', 'light', 'reach', 'thrown'] as const).filter((p) =>
    Boolean(toNumber(row[p])),
  );
  const enchantment = toNumber(row.enchantment);
  const actions = cleanList(row['special weapon actions']);
  const effects = specialEffects(row.special);
  return {
    row,
    name,
    item: {
      kind: 'weapon',
      rarity,
      unique: isUnique(row, name, rarity, locations),
      weaponType: slugify(row.type),
      ...(enchantment ? { enchantment } : {}),
      damage,
      ...(row['versatile damage']
        ? { versatileDamage: typed(row['versatile damage'], row['damage type']) }
        : {}),
      properties,
      ...statEffects(effects),
      effects,
      passives: cleanList(row['weapon passives']),
      ...(actions.length ? { actions } : {}),
      wikiPage: decodeEntities(row.page),
    },
  };
}

/**
 * Wearable items players can get, sorted by kind then name.
 *
 * Rows of the same page are variants of one item (dyes, duplicates), so only the first is kept.
 * Items are keyed by name; when two pages share a name ("Dark Justiciar Half-Plate (Rare)" and
 * "(Very Rare)"), the page title becomes both the id and the shown name.
 */
export function toItems(
  equipment: CargoEquipmentRow[],
  weapons: CargoWeaponRow[],
  locations: CargoLocationRow[] = [],
): Item[] {
  const found = new Map<string, number>();
  for (const { uid } of locations) if (uid) found.set(uid, (found.get(uid) ?? 0) + 1);
  const count = (row: CargoItemRow) => (row.uid ? (found.get(row.uid) ?? 0) : 0);

  const drafts: Draft[] = [];
  const pages = new Set<string>();
  const keep = (draft: Draft | undefined) => {
    if (!draft || draft.row.legacy || pages.has(draft.row.page)) return;
    pages.add(draft.row.page);
    drafts.push(draft);
  };
  for (const row of equipment) keep(equipmentDraft(row, count(row)));
  for (const row of weapons) keep(weaponDraft(row, count(row)));

  const byName = new Map<string, number>();
  for (const d of drafts) byName.set(d.name, (byName.get(d.name) ?? 0) + 1);

  const ids = new Map<string, string>();
  const items = drafts.map((d): Item => {
    const name = byName.get(d.name)! > 1 ? d.item.wikiPage : d.name;
    const id = slugify(name);
    const previous = ids.get(id);
    if (previous)
      throw new Error(`Item id "${id}" is produced by "${previous}" and "${d.row.page}"`);
    ids.set(id, d.row.page);
    return { id, name, ...d.item } as Item;
  });

  const order = (item: Item) => ITEM_KINDS.indexOf(item.kind);
  return items.sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));
}
