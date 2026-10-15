import { type Party, migrateParty } from '@bg3planner/rules';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

/** Packs a whole party into a URL-safe string, for links that work without the server. */
export function encodeParty(party: Party): string {
  return compressToEncodedURIComponent(JSON.stringify(party));
}

/** Unpacks a party from a link, upgrading it if it was made by an older version. */
export function decodeParty(encoded: string): Party | undefined {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return undefined;
    const result = migrateParty(JSON.parse(json));
    return result.ok ? result.party : undefined;
  } catch {
    return undefined;
  }
}

/** File name for an exported party: `Hexknight.bg3party.json`. */
export function exportFileName(name: string): string {
  const safe = name.replace(/[\\/:*?"<>|]+/g, '').trim();
  return `${safe || 'party'}.bg3party.json`;
}
