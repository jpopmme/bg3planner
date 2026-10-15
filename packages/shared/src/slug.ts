/**
 * Stable kebab-case id for a game entity name:
 * `Tasha's Hideous Laughter` → `tashas-hideous-laughter`, `Enlarge/Reduce` → `enlarge-reduce`.
 */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
