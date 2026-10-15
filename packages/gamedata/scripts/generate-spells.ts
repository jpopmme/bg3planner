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
import { CARGO_FIELDS, type CargoSpellRow, toSpells } from './spells';

const OUTPUT = fileURLToPath(new URL('../src/data/spells.json', import.meta.url));
const USER_AGENT = 'bg3planner-datagen/0.1 (+https://github.com/jpopmme/bg3planner)';
const MAX_ATTEMPTS = 6;

function exportUrl(): string {
  const url = new URL('https://bg3.wiki/w/index.php');
  url.searchParams.set('title', 'Special:CargoExport');
  url.searchParams.set('tables', 'spells');
  url.searchParams.set('fields', CARGO_FIELDS.join(','));
  url.searchParams.set('where', 'is_spell=1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5000');
  return url.href;
}

async function download(): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(exportUrl(), { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) return res.json();
    if (res.status !== 429 || attempt === MAX_ATTEMPTS) {
      throw new Error(`bg3.wiki export failed: HTTP ${res.status}`);
    }
    const waitSeconds = Number(res.headers.get('retry-after')) || 15 * 2 ** (attempt - 1);
    console.warn(`Rate limited by bg3.wiki, retrying in ${waitSeconds}s (attempt ${attempt})`);
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
  }
}

const { values } = parseArgs({ options: { input: { type: 'string' } } });
const rows = (
  values.input ? JSON.parse(await readFile(values.input, 'utf8')) : await download()
) as CargoSpellRow[];

const spells = toSpells(rows, referencedSpellIds()).map((spell) => spellSchema.parse(spell));
const json = await format(JSON.stringify(spells), {
  ...(await resolveConfig(OUTPUT)),
  parser: 'json',
});
await writeFile(OUTPUT, json);
console.log(`Wrote ${spells.length} spells to ${OUTPUT}`);
