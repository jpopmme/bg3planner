/** Plain text with non-breaking and zero-width spaces cleaned up and whitespace collapsed. */
export function cleanText(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b|\u200c|\u200d|\ufeff/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lower-case name with accents, punctuation and British/American spelling differences removed. */
export function normaliseName(name: string): string {
  return cleanText(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/\barmor\b/g, 'armour')
    .replace(/\bdefense\b/g, 'defence')
    .replace(/\bmaneuver/g, 'manoeuvre')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Edit distance, for tolerating small typos in names. */
export function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length]!;
}
