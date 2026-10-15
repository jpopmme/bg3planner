/**
 * Regenerates src/data/spells.json from bg3.wiki's `spells` Cargo table.
 *
 *   npm run generate:spells -w @bg3planner/gamedata
 *   npm run generate:spells -w @bg3planner/gamedata -- --input saved-export.json
 *
 * bg3.wiki rate-limits anonymous traffic, so the download retries with backoff; `--input` builds
 * from an export saved earlier instead. Behind an HTTP proxy, run with NODE_USE_ENV_PROXY=1.
 * Data is licensed CC BY-NC-SA 4.0 by bg3.wiki contributors (see ATTRIBUTION.md).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { format, resolveConfig } from 'prettier';
import { referencedSpellIds } from '../src/data/references';
import { spellSchema } from '../src/schema';
import { downloadCargo } from './cargo';
import { CARGO_FIELDS, type CargoSpellRow, toSpells } from './spells';

const OUTPUT = fileURLToPath(new URL('../src/data/spells.json', import.meta.url));

const { values } = parseArgs({ options: { input: { type: 'string' } } });
const rows = (
  values.input
    ? JSON.parse(await readFile(values.input, 'utf8'))
    : await downloadCargo({ table: 'spells', fields: CARGO_FIELDS, where: 'is_spell=1' })
) as CargoSpellRow[];

const spells = toSpells(rows, referencedSpellIds()).map((spell) => spellSchema.parse(spell));
const json = await format(JSON.stringify(spells), {
  ...(await resolveConfig(OUTPUT)),
  parser: 'json',
});
await writeFile(OUTPUT, json);
console.log(`Wrote ${spells.length} spells to ${OUTPUT}`);
