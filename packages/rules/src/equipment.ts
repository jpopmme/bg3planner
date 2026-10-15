import type { Ability } from '@bg3planner/shared';
import type { GameData, Item, WeaponType } from '@bg3planner/gamedata';
import { ACTS, type Act, type Build, EQUIP_SLOTS, type EquipSlot, type Loadout } from './build';
import { type DataIndex, indexData } from './data-index';

export const ACT_NAMES: Record<Act, string> = { act1: 'Act 1', act2: 'Act 2', act3: 'Act 3' };

export const SLOT_NAMES: Record<EquipSlot, string> = {
  head: 'Head',
  cloak: 'Cloak',
  armour: 'Armour',
  gloves: 'Gloves',
  boots: 'Boots',
  amulet: 'Amulet',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
  meleeMain: 'Melee main hand',
  meleeOff: 'Melee off hand',
  rangedMain: 'Ranged main hand',
  rangedOff: 'Ranged off hand',
};

/** What the character can use, as `deriveCharacter` reports it. */
export interface Proficiencies {
  armour: ('light' | 'medium' | 'heavy')[];
  shields: boolean;
  weaponCategories: ('simple' | 'martial')[];
  weaponTypes: string[];
}

export interface EquipmentIssue {
  severity: 'error' | 'warning';
  act: Act;
  slot: EquipSlot;
  message: string;
}

const weaponTypeOf = (item: Item, index: DataIndex): WeaponType | undefined =>
  item.kind === 'weapon' ? index.weaponTypes.get(item.weaponType) : undefined;

/** Whether `item` can go in `slot` at all (hand rules are checked separately). */
export function slotAccepts(slot: EquipSlot, item: Item, data: GameData): boolean {
  const range = weaponTypeOf(item, indexData(data))?.range;
  switch (slot) {
    case 'ring1':
    case 'ring2':
      return item.kind === 'ring';
    case 'meleeMain':
      return range === 'melee';
    case 'meleeOff':
      return range === 'melee' || item.kind === 'shield';
    case 'rangedMain':
    case 'rangedOff':
      return range === 'ranged';
    default:
      return item.kind === slot;
  }
}

/** Every item that fits `slot`, in catalogue order. */
export function itemsForSlot(slot: EquipSlot, data: GameData): Item[] {
  return data.items.filter((item) => slotAccepts(slot, item, data));
}

/** The items of a loadout that exist and fit their slot. */
export function equippedItems(
  loadout: Loadout | undefined,
  data: GameData,
): Partial<Record<EquipSlot, Item>> {
  const index = indexData(data);
  const items: Partial<Record<EquipSlot, Item>> = {};
  for (const slot of EQUIP_SLOTS) {
    const item = index.items.get(loadout?.[slot] ?? '');
    if (item && slotAccepts(slot, item, data)) items[slot] = item;
  }
  return items;
}

const isLight = (item: Item | undefined) =>
  item?.kind === 'weapon' && item.properties.includes('light');

/** Problems with two-handed weapons and dual-wielding in one weapon set. */
function handIssues(
  main: Item | undefined,
  off: Item | undefined,
  offSlot: EquipSlot,
  index: DataIndex,
  dualWielder: boolean,
  report: (slot: EquipSlot, message: string) => void,
) {
  if (!off) return;
  const mainType = main && weaponTypeOf(main, index);
  if (main && mainType?.handedness === 'two-handed') {
    report(offSlot, `${main.name} needs both hands, so nothing can go in the off hand.`);
    return;
  }
  if (off.kind !== 'weapon') return;
  if (weaponTypeOf(off, index)?.handedness === 'two-handed') {
    report(offSlot, `${off.name} needs both hands, so it cannot be held in the off hand.`);
  } else if (!dualWielder && !(isLight(off) && (!main || isLight(main)))) {
    report(
      offSlot,
      `Dual-wielding ${off.name} needs the Dual Wielder feat, unless both weapons are light.`,
    );
  }
}

/**
 * Problems with the planned gear of each act: items that do not exist or do not fit their slot,
 * hand rules, a unique item used twice, and gear the character is not proficient with.
 */
export function equipmentIssues(
  build: Build,
  data: GameData,
  character: Proficiencies & { feats: { id: string }[] },
): EquipmentIssue[] {
  const index = indexData(data);
  const issues: EquipmentIssue[] = [];
  const dualWielder = character.feats.some((f) => f.id === 'dual-wielder');

  for (const act of ACTS) {
    const loadout = build.equipment?.[act];
    if (!loadout) continue;
    const report = (severity: EquipmentIssue['severity']) => (slot: EquipSlot, message: string) =>
      issues.push({ severity, act, slot, message });
    const error = report('error');
    const warning = report('warning');

    const seen = new Map<string, EquipSlot>();
    for (const slot of EQUIP_SLOTS) {
      const id = loadout[slot];
      if (!id) continue;
      const item = index.items.get(id);
      if (!item) {
        error(slot, `Unknown item "${id}".`);
        continue;
      }
      if (!slotAccepts(slot, item, data)) {
        error(slot, `${item.name} does not go in the ${SLOT_NAMES[slot].toLowerCase()} slot.`);
        continue;
      }
      const other = seen.get(id);
      if (other && item.unique) {
        error(slot, `There is only one ${item.name}, and it is already in ${SLOT_NAMES[other]}.`);
      }
      seen.set(id, slot);
      const problem = proficiencyProblem(item, character, index);
      if (problem) warning(slot, problem);
    }

    const items = equippedItems(loadout, data);
    handIssues(items.meleeMain, items.meleeOff, 'meleeOff', index, dualWielder, error);
    handIssues(items.rangedMain, items.rangedOff, 'rangedOff', index, dualWielder, error);
  }
  return issues;
}

function proficiencyProblem(
  item: Item,
  character: Proficiencies,
  index: DataIndex,
): string | undefined {
  if (item.kind === 'armour' && item.proficiency && !character.armour.includes(item.proficiency)) {
    return `Not proficient with ${item.proficiency} armour: Disadvantage on Strength and Dexterity rolls, and no spellcasting.`;
  }
  if (item.kind === 'shield' && !character.shields) {
    return 'Not proficient with shields: Disadvantage on Strength and Dexterity rolls, and no spellcasting.';
  }
  const type = weaponTypeOf(item, index);
  if (
    type &&
    !character.weaponCategories.includes(type.category) &&
    !character.weaponTypes.includes(type.id)
  ) {
    return `Not proficient with ${type.name.toLowerCase()}: no proficiency bonus on attack rolls.`;
  }
  return undefined;
}

export interface ArmourClassPart {
  label: string;
  value: number;
}

/**
 * Armour Class with the given gear on: the armour (or 10 unarmoured) plus the Dexterity modifier
 * it allows, the shield, Defence, and bonuses from other items.
 */
export function armourClassParts(
  items: Partial<Record<EquipSlot, Item>>,
  dexterityModifier: number,
  effects: { feats: string[]; fightingStyles: string[] },
): ArmourClassPart[] {
  const armour = items.armour?.kind === 'armour' ? items.armour : undefined;
  const parts: ArmourClassPart[] = [
    { label: armour?.name ?? 'Unarmoured', value: armour?.armourClass ?? 10 },
  ];

  let dexterity = dexterityModifier;
  if (armour?.proficiency === 'heavy') dexterity = 0;
  else if (armour?.proficiency === 'medium' && !armour.noDexterityCap) {
    dexterity = Math.min(dexterity, effects.feats.includes('medium-armour-master') ? 3 : 2);
  }
  if (dexterity !== 0) parts.push({ label: 'Dexterity', value: dexterity });

  const shield = items.meleeOff?.kind === 'shield' ? items.meleeOff : undefined;
  if (shield) parts.push({ label: shield.name, value: shield.shieldBonus });
  if (armour?.proficiency && effects.fightingStyles.includes('defence')) {
    parts.push({ label: 'Defence', value: 1 });
  }
  for (const item of Object.values(items)) {
    if (item.armourClassBonus) parts.push({ label: item.name, value: item.armourClassBonus });
  }
  return parts;
}

/** Ability scores with gear on: "set" items raise a score to at least their value, then bonuses add up to their cap. */
export function applyAbilityEffects(
  scores: Record<Ability, number>,
  items: Partial<Record<EquipSlot, Item>>,
): Record<Ability, number> {
  const result = { ...scores };
  const effects = Object.values(items).flatMap((item) => item.abilityEffects ?? []);
  for (const effect of effects) {
    if ('set' in effect) result[effect.ability] = Math.max(result[effect.ability], effect.set);
  }
  for (const effect of effects) {
    if (!('add' in effect)) continue;
    const score = result[effect.ability];
    result[effect.ability] =
      effect.add > 0
        ? Math.max(score, Math.min(score + effect.add, effect.max ?? 30))
        : score + effect.add;
  }
  return result;
}

export interface ItemConflict {
  act: Act;
  itemId: string;
  /** Members planning to use the item, in roster order. */
  memberIds: string[];
}

/** Unique items more than one of the given members plan to use in the same act. */
export function itemConflicts(
  members: { id: string; build: Build }[],
  data: GameData,
): ItemConflict[] {
  const index = indexData(data);
  const conflicts: ItemConflict[] = [];
  for (const act of ACTS) {
    const users = new Map<string, string[]>();
    for (const member of members) {
      const ids = new Set(Object.values(member.build.equipment?.[act] ?? {}));
      for (const id of ids) {
        if (!index.items.get(id)?.unique) continue;
        users.set(id, [...(users.get(id) ?? []), member.id]);
      }
    }
    for (const [itemId, memberIds] of users) {
      if (memberIds.length > 1) conflicts.push({ act, itemId, memberIds });
    }
  }
  return conflicts;
}
