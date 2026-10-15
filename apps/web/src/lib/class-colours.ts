/** Each class's colour, used for its share of the class bar and its level markers. */
const CLASS_COLOURS: Record<string, string> = {
  fighter: 'var(--class-fighter)',
  warlock: 'var(--class-warlock)',
};

export function classColour(classId: string): string {
  return CLASS_COLOURS[classId] ?? 'var(--accent)';
}
