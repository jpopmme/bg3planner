import { classes, subclasses } from './classes';
import { feats } from './feats';
import { races } from './races';

/**
 * Spell ids that hand-written data names directly: expanded spell lists, fixed spell picks and
 * innate spells. The spell generator keeps these even when no class list contains them.
 */
export function referencedSpellIds(): Set<string> {
  const ids = new Set<string>();
  const visit = (value: unknown, key?: string): void => {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (key === 'spells' && typeof item === 'string') ids.add(item);
        else visit(item);
      }
    } else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        if (k === 'spell' && typeof v === 'string') ids.add(v);
        else visit(v, k);
      }
    }
  };
  visit([classes, subclasses, races, feats]);
  return ids;
}
