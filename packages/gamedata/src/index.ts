import { backgrounds } from './data/backgrounds';
import { classFeatures, classOptionGroups, classes, subclasses } from './data/classes';
import { feats } from './data/feats';
import { features } from './data/features';
import { optionGroups } from './data/options';
import items from './data/items.json' with { type: 'json' };
import { origins } from './data/origins';
import { races } from './data/races';
import { multiclassSpellSlots } from './data/spell-slots';
import spells from './data/spells.json' with { type: 'json' };
import { weaponTypes } from './data/weapons';
import type { GameData, Item, Spell } from './schema';

export * from './schema';
export { findIntegrityIssues, maxSpellLevel } from './integrity';

/**
 * Game patch this dataset describes. Saved builds record it so they can be
 * migrated when the dataset is regenerated for a newer patch.
 */
export const GAME_DATA_VERSION = 'patch-8';

/**
 * What each spell, feature, feat and option does, keyed as `spell:<id>`, `feature:<id>`,
 * `feat:<id>` and `option:<group>:<id>`. Loaded on demand: it is only needed when a player opens
 * the details of something, and bundlers split it into its own file.
 */
export async function loadDescriptions(): Promise<Record<string, string>> {
  return (await import('./data/descriptions.json')).default;
}

/** The full dataset. Validated by the package's tests rather than at runtime. */
export const gameData: GameData = {
  version: GAME_DATA_VERSION,
  classes,
  subclasses,
  races,
  backgrounds,
  feats,
  origins,
  features: [...features, ...classFeatures],
  optionGroups: [...optionGroups, ...classOptionGroups],
  // JSON imports type enums as plain strings; the schema test checks the real values.
  spells: spells as Spell[],
  weaponTypes,
  items: items as Item[],
  multiclassSpellSlots,
};
