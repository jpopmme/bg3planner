/**
 * Downloads a table from bg3.wiki's Special:CargoExport as JSON.
 *
 * bg3.wiki rate-limits anonymous traffic, so the download retries with backoff. Behind an HTTP
 * proxy, run with NODE_USE_ENV_PROXY=1.
 */
export const USER_AGENT = 'bg3planner-datagen/0.1 (+https://github.com/jpopmme/bg3planner)';
const MAX_ATTEMPTS = 6;

export interface CargoQuery {
  table: string;
  fields: readonly string[];
  where?: string;
}

export function cargoExportUrl({ table, fields, where }: CargoQuery): string {
  const url = new URL('https://bg3.wiki/w/index.php');
  url.searchParams.set('title', 'Special:CargoExport');
  url.searchParams.set('tables', table);
  url.searchParams.set('fields', fields.join(','));
  if (where) url.searchParams.set('where', where);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5000');
  return url.href;
}

export async function downloadCargo(query: CargoQuery): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(cargoExportUrl(query), { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) return res.json();
    if (res.status !== 429 || attempt === MAX_ATTEMPTS) {
      throw new Error(`bg3.wiki export of ${query.table} failed: HTTP ${res.status}`);
    }
    const waitSeconds = Number(res.headers.get('retry-after')) || 15 * 2 ** (attempt - 1);
    console.warn(`Rate limited by bg3.wiki, retrying in ${waitSeconds}s (attempt ${attempt})`);
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
  }
}
