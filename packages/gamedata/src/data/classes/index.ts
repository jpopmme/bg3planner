import type { ClassDef, SubclassDef } from '../../schema';
import { fighter, fighterSubclasses } from './fighter';
import { warlock, warlockSubclasses } from './warlock';

export const classes: ClassDef[] = [fighter, warlock];
export const subclasses: SubclassDef[] = [...fighterSubclasses, ...warlockSubclasses];

/** Spell ids named directly by class data (expanded spell lists, fixed spell picks). */
export function referencedSpellIds(): Set<string> {
  const ids = new Set<string>();
  for (const owner of [...classes, ...subclasses]) {
    for (const level of owner.levels) {
      for (const choice of level.choices) {
        if ('from' in choice && 'spells' in choice.from)
          choice.from.spells.forEach((id) => ids.add(id));
      }
    }
  }
  for (const sub of subclasses) {
    sub.expandedSpells?.forEach(({ spells }) => spells.forEach((id) => ids.add(id)));
  }
  return ids;
}
