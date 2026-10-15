import { gameData, type Item, RARITIES } from '@bg3planner/gamedata';

const byId = new Map(gameData.items.map((i) => [i.id, i]));

export const itemById = (id: string | undefined): Item | undefined =>
  id ? byId.get(id) : undefined;

const weaponTypeNames = new Map(gameData.weaponTypes.map((w) => [w.id, w.name]));
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** Weapon type names are plural: "Shortswords" → "Shortsword", "Quarterstaves" → "Quarterstaff". */
const singular = (type: string) =>
  type === 'Quarterstaves' ? 'Quarterstaff' : type.replace(/s$/, '');

/** One line on what the item is: armour type and AC, shield bonus, or weapon type and damage. */
export function itemBasics(item: Item): string {
  switch (item.kind) {
    case 'armour':
      return item.proficiency
        ? `${item.proficiency[0]!.toUpperCase()}${item.proficiency.slice(1)} armour, AC ${item.armourClass}`
        : `Clothing, AC ${item.armourClass}`;
    case 'shield':
      return `Shield, ${signed(item.shieldBonus)} AC`;
    case 'weapon': {
      const type = weaponTypeNames.get(item.weaponType) ?? item.weaponType;
      return `${singular(type)}, ${item.damage}`;
    }
    default:
      return item.kind === 'head'
        ? 'Headwear'
        : `${item.kind[0]!.toUpperCase()}${item.kind.slice(1)}`;
  }
}

/** What the item does, briefly: its effects, then its passives. */
export function itemEffects(item: Item): string[] {
  return [...item.effects, ...item.passives];
}

/** Rarest first, then by name. */
export function byRarity(a: Item, b: Item): number {
  return RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || a.name.localeCompare(b.name);
}

export const rarityName = (item: Item) =>
  item.rarity === 'story'
    ? 'Story item'
    : `${item.rarity[0]!.toUpperCase()}${item.rarity.slice(1)}`;
