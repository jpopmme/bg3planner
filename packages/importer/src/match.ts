import { editDistance, normaliseName } from './text';

export interface Named {
  id: string;
  name: string;
}

/**
 * Finds the candidate a guide's name refers to: an exact match after normalising, then the same
 * without a leading "The", then the closest name within two typos (for names of 6+ letters).
 */
export function matchName(text: string, candidates: Named[]): Named | undefined {
  const wanted = normaliseName(text);
  if (!wanted) return undefined;
  const byName = new Map(candidates.map((c) => [normaliseName(c.name), c]));
  const exact = byName.get(wanted) ?? byName.get(wanted.replace(/^the /, ''));
  if (exact) return exact;
  for (const [name, candidate] of byName) {
    if (name.replace(/^the /, '') === wanted) return candidate;
  }

  let best: { candidate: Named; distance: number } | undefined;
  for (const [name, candidate] of byName) {
    if (name.length < 6) continue;
    const distance = editDistance(wanted, name);
    if (distance <= 2 && (!best || distance < best.distance)) best = { candidate, distance };
  }
  return best?.candidate;
}
