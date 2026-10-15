/**
 * Regenerates src/data/items.json from bg3.wiki's `equipment`, `weapons` and `item_locations`
 * Cargo tables.
 *
 *   npm run generate:items -w @bg3planner/gamedata
 *   npm run generate:items -w @bg3planner/gamedata -- --input saved-exports-dir
 *
 * `--input` builds from exports saved earlier as equipment.json, weapons.json and locations.json.
 * Data is licensed CC BY-NC-SA 4.0 by bg3.wiki contributors (see ATTRIBUTION.md).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { format, resolveConfig } from 'prettier';
import { itemSchema } from '../src/schema';
import { type CargoQuery, downloadCargo } from './cargo';
import {
  type CargoEquipmentRow,
  type CargoLocationRow,
  type CargoWeaponRow,
  EQUIPMENT_FIELDS,
  LOCATION_FIELDS,
  toItems,
  WEAPON_FIELDS,
} from './items';

const OUTPUT = fileURLToPath(new URL('../src/data/items.json', import.meta.url));

const { values } = parseArgs({ options: { input: { type: 'string' } } });
const input = values.input;
const load = async (file: string, query: CargoQuery) =>
  input ? JSON.parse(await readFile(join(input, file), 'utf8')) : downloadCargo(query);

const equipment = (await load('equipment.json', {
  table: 'equipment',
  fields: EQUIPMENT_FIELDS,
})) as CargoEquipmentRow[];
const weapons = (await load('weapons.json', {
  table: 'weapons',
  fields: WEAPON_FIELDS,
})) as CargoWeaponRow[];
const locations = (await load('locations.json', {
  table: 'item_locations',
  fields: LOCATION_FIELDS,
})) as CargoLocationRow[];

const items = toItems(equipment, weapons, locations).map((item) => itemSchema.parse(item));
const json = await format(JSON.stringify(items), {
  ...(await resolveConfig(OUTPUT)),
  parser: 'json',
});
await writeFile(OUTPUT, json);
console.log(`Wrote ${items.length} items to ${OUTPUT}`);
