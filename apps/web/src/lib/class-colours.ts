/** Each class's colour, used for its share of the class bar and its level markers. */
const CLASS_COLOURS: Record<string, string> = Object.fromEntries(
  [
    'barbarian',
    'bard',
    'cleric',
    'druid',
    'fighter',
    'monk',
    'paladin',
    'ranger',
    'rogue',
    'sorcerer',
    'warlock',
    'wizard',
  ].map((id) => [id, `var(--class-${id})`]),
);

export function classColour(classId: string): string {
  return CLASS_COLOURS[classId] ?? 'var(--accent)';
}
