/**
 * Regenerates src/data/descriptions.json: what each spell, feature, feat and option does, from
 * bg3.wiki's `spells`, `passives` and `actions` Cargo tables and its rendered "Feats" page.
 *
 *   npm run generate:descriptions -w @bg3planner/gamedata
 *   npm run generate:descriptions -w @bg3planner/gamedata -- --input saved-exports-dir
 *
 * `--input` builds from spells.json, passives.json, actions.json and feats.html saved earlier.
 * Data is licensed CC BY-NC-SA 4.0 by bg3.wiki contributors (see ATTRIBUTION.md).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { format, resolveConfig } from 'prettier';
import { gameData } from '../src/index';
import { downloadCargo, USER_AGENT } from './cargo';
import { type CargoDescriptionRow, DESCRIPTION_FIELDS, toDescriptions } from './descriptions';

const OUTPUT = fileURLToPath(new URL('../src/data/descriptions.json', import.meta.url));
const FEATS_PAGE = 'https://bg3.wiki/w/index.php?title=Feats&action=render';

const { values } = parseArgs({ options: { input: { type: 'string' } } });
const input = values.input;
const table = async (name: string, where?: string) =>
  (input
    ? JSON.parse(await readFile(join(input, `${name}.json`), 'utf8'))
    : await downloadCargo({
        table: name,
        fields: DESCRIPTION_FIELDS,
        ...(where ? { where } : {}),
      })) as CargoDescriptionRow[];

async function featsHtml(): Promise<string> {
  if (input) return readFile(join(input, 'feats.html'), 'utf8');
  const res = await fetch(FEATS_PAGE, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`bg3.wiki Feats page failed: HTTP ${res.status}`);
  return res.text();
}

const { descriptions, missing } = toDescriptions(gameData, {
  spells: await table('spells', 'is_spell=1'),
  passives: await table('passives'),
  actions: await table('actions'),
  featsHtml: await featsHtml(),
});
if (missing.length) {
  console.warn(`No description found for: ${missing.join(', ')}`);
  process.exitCode = 1;
}

const sorted = Object.fromEntries(
  Object.entries(descriptions).sort(([a], [b]) => a.localeCompare(b)),
);
const json = await format(JSON.stringify(sorted), {
  ...(await resolveConfig(OUTPUT)),
  parser: 'json',
});
await writeFile(OUTPUT, json);
console.log(`Wrote ${Object.keys(sorted).length} descriptions to ${OUTPUT}`);
