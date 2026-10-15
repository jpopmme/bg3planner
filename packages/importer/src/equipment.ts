import { type GameData, type Item, RARITIES } from '@bg3planner/gamedata';
import {
  ACT_NAMES,
  ACTS,
  type Act,
  type Build,
  type EquipSlot,
  type Loadout,
  SLOT_NAMES,
  deriveCharacter,
  equipmentIssues,
  slotAccepts,
} from '@bg3planner/rules';
import { type Named, matchName } from './match';
import type { ActGear } from './sections';

type Note = (message: string, act: Act) => void;

/** Slots a guide's slot label can mean, in the order they are filled. */
function slotsFor(label: string): EquipSlot[] {
  const l = label.toLowerCase();
  const off = /off[- ]?hand/.test(l);
  if (/shield/.test(l)) return ['meleeOff'];
  if (/ranged|bow|crossbow/.test(l)) return off ? ['rangedOff'] : ['rangedMain'];
  if (/melee|weapon/.test(l)) return off ? ['meleeOff'] : ['meleeMain'];
  if (/head|helm|hat/.test(l)) return ['head'];
  if (/cloak|cape/.test(l)) return ['cloak'];
  if (/armou?r|body|chest/.test(l)) return ['armour'];
  if (/glove|gauntlet|hands/.test(l)) return ['gloves'];
  if (/boot|feet|shoes/.test(l)) return ['boots'];
  if (/amulet|neck/.test(l)) return ['amulet'];
  if (/ring/.test(l)) return ['ring1', 'ring2'];
  return [];
}

const FILL_ORDER: EquipSlot[] = [
  'meleeMain',
  'meleeOff',
  'rangedMain',
  'rangedOff',
  'head',
  'cloak',
  'armour',
  'gloves',
  'boots',
  'amulet',
  'ring1',
  'ring2',
];

/**
 * Item names to match against. Items that share a name are listed by the catalogue as
 * "Dark Justiciar Half-Plate (Rare)"; guides write the bare name, which means the best variant.
 */
function itemNames(data: GameData): Named[] {
  const variants = new Map<string, Item>();
  const rank = (item: Item) => RARITIES.indexOf(item.rarity);
  for (const item of data.items) {
    const bare = /^(.*?) \(([^)]+)\)$/.exec(item.name)?.[1];
    if (!bare) continue;
    const best = variants.get(bare);
    if (!best || rank(item) > rank(best)) variants.set(bare, item);
  }
  return [...data.items, ...[...variants].map(([name, item]) => ({ id: item.id, name }))];
}

/** The catalogue item a guide's cell names, also trying without a remark like "(BiS)". */
function findItem(name: string, names: Named[], data: GameData): Item | undefined {
  const found = matchName(name, names) ?? matchName(name.replace(/\s*\([^)]*\)\s*$/, ''), names);
  return found && data.items.find((i) => i.id === found.id);
}

const list = (names: string[]) =>
  names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : (names[0] ?? '');

/**
 * Fills `build.equipment` from a guide's gear section: for each act, the first setup's first
 * suggestion per slot that the rules allow. Alternatives, other setups and names the catalogue
 * lacks become notes. Slots a later act leaves empty keep the earlier act's item.
 */
export function importEquipment(build: Build, gear: ActGear[], data: GameData, note: Note) {
  const names = itemNames(data);
  const character = deriveCharacter(build, data);
  let previous: Loadout = {};

  for (const act of ACTS) {
    const guide = gear.find((g) => `act${g.act}` === act);
    const [setup, ...others] = guide?.setups ?? [];
    if (!setup) {
      if (guide) note(`The guide lists no gear table for ${ACT_NAMES[act]}.`, act);
      if (Object.keys(previous).length) build.equipment = { ...build.equipment, [act]: previous };
      continue;
    }
    if (others.length) {
      note(
        `The guide also describes ${list(others.map((o) => o.title ?? 'another setup'))}; ${setup.title ?? 'the first setup'} was used.`,
        act,
      );
    }

    // Candidates per slot, in the guide's order.
    const candidates = new Map<EquipSlot, Item[]>();
    const unknown: string[] = [];
    for (const row of setup.rows) {
      const slots = slotsFor(row.slot);
      for (const name of row.items) {
        const item = findItem(name, names, data);
        if (!item) {
          unknown.push(name);
          continue;
        }
        // When the label does not fit the item (a dagger under "Shield"), it goes where it fits.
        const target =
          slots.find((s) => slotAccepts(s, item, data)) ??
          FILL_ORDER.find((s) => slotAccepts(s, item, data));
        if (!target) continue;
        for (const s of target === 'ring1' ? (['ring1', 'ring2'] as const) : [target]) {
          const items = candidates.get(s) ?? [];
          if (!items.includes(item)) candidates.set(s, [...items, item]);
        }
      }
    }
    if (unknown.length) {
      note(`Not in the item catalogue, so not placed: ${list(unknown.map((n) => `"${n}"`))}.`, act);
    }

    const loadout = pickLoadout(build, candidates, character, data, act);
    reportAlternatives(loadout, candidates, act, note);

    const kept = FILL_ORDER.filter((s) => !loadout[s] && previous[s]);
    for (const slot of kept) loadout[slot] = previous[slot];
    if (kept.length) {
      note(
        `${list(kept.map((s) => SLOT_NAMES[s]))}: nothing new in the guide, so the earlier act’s gear is kept.`,
        act,
      );
    }
    if (Object.keys(loadout).length) build.equipment = { ...build.equipment, [act]: loadout };
    previous = loadout;
  }
}

/** First candidate per slot that leaves no rule broken, given what is already placed. */
function pickLoadout(
  build: Build,
  candidates: Map<EquipSlot, Item[]>,
  character: ReturnType<typeof deriveCharacter>,
  data: GameData,
  act: Act,
): Loadout {
  const loadout: Loadout = {};
  const fits = (slot: EquipSlot, item: Item) => {
    const trial: Build = { ...build, equipment: { [act]: { ...loadout, [slot]: item.id } } };
    return !equipmentIssues(trial, data, character).some(
      (i) => i.severity === 'error' && i.slot === slot,
    );
  };
  const offHandListed = candidates.has('meleeOff');
  for (const slot of FILL_ORDER) {
    let options = candidates.get(slot) ?? [];
    // A guide listing off-hand items means a one-handed main weapon, even when it also names a
    // two-handed one (Hexknight's Drakethroat Glaive, only used to apply its weapon buff).
    if (slot === 'meleeMain' && offHandListed) {
      const oneHanded = options.filter((i) => !needsBothHands(i, data));
      if (oneHanded.length) options = oneHanded;
    }
    const pick = options.find(
      (item) => !Object.values(loadout).includes(item.id) && fits(slot, item),
    );
    if (pick) loadout[slot] = pick.id;
  }
  return loadout;
}

function needsBothHands(item: Item, data: GameData): boolean {
  return (
    item.kind === 'weapon' &&
    data.weaponTypes.find((w) => w.id === item.weaponType)?.handedness === 'two-handed'
  );
}

function reportAlternatives(
  loadout: Loadout,
  candidates: Map<EquipSlot, Item[]>,
  act: Act,
  note: Note,
) {
  const placed = new Set(Object.values(loadout));
  const reported = new Set<string>();
  for (const slot of FILL_ORDER) {
    if (slot === 'ring2') continue; // reported with Ring 1
    const others = (candidates.get(slot) ?? []).filter(
      (i) => !placed.has(i.id) && !reported.has(i.id),
    );
    if (!others.length) continue;
    for (const item of others) reported.add(item.id);
    const label = slot === 'ring1' ? 'Rings' : SLOT_NAMES[slot];
    note(`${label}: the guide also suggests ${list(others.map((i) => i.name))}.`, act);
  }
}
