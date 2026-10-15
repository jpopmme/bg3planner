import { backgrounds } from './data/backgrounds';
import { classes, subclasses } from './data/classes';
import { feats } from './data/feats';
import { features } from './data/features';
import { optionGroups } from './data/options';
import { races } from './data/races';
import { multiclassSpellSlots } from './data/spell-slots';
import spells from './data/spells.json' with { type: 'json' };
import { weaponTypes } from './data/weapons';
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
  races,
  backgrounds,
  feats,
  features,
  optionGroups,
  // JSON imports type enums as plain strings; the schema test checks the real values.
  spells: spells as Spell[],
  weaponTypes,
  multiclassSpellSlots,
};
