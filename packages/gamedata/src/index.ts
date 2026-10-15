import { classes, subclasses } from './data/classes';
import { features } from './data/features';
import { optionGroups } from './data/options';
import { multiclassSpellSlots } from './data/spell-slots';
import spells from './data/spells.json' with { type: 'json' };
import type { GameData, Spell } from './schema';

export * from './schema';
export { findIntegrityIssues, maxSpellLevel } from './integrity';

/**
 * Game patch this dataset describes. Saved builds record it so they can be
 * migrated when the dataset is regenerated for a newer patch.
 */
export const GAME_DATA_VERSION = 'patch-8';

/** The full dataset. Validated by the package's tests rather than at runtime. */
export const gameData: GameData = {
  version: GAME_DATA_VERSION,
  classes,
  subclasses,
  features,
  optionGroups,
  // JSON imports type enums as plain strings; the schema test checks the real values.
  spells: spells as Spell[],
  multiclassSpellSlots,
};
