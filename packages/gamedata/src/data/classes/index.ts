import type { ClassDef, Feature, OptionGroup, SubclassDef } from '../../schema';
import { barbarianBundle } from './barbarian';
import { bardBundle } from './bard';
import type { ClassBundle } from './bundle';
import { clericBundle } from './cleric';
import { druidBundle } from './druid';
import { fighter, fighterSubclasses } from './fighter';
import { monkBundle } from './monk';
import { paladinBundle } from './paladin';
import { rangerBundle } from './ranger';
import { rogueBundle } from './rogue';
import { sorcererBundle } from './sorcerer';
import { warlock, warlockSubclasses } from './warlock';
import { wizardBundle } from './wizard';

/** Classes written as bundles (see bundle.ts); Fighter and Warlock predate them. */
const bundles: ClassBundle[] = [
  barbarianBundle,
  bardBundle,
  clericBundle,
  druidBundle,
  monkBundle,
  paladinBundle,
  rangerBundle,
  rogueBundle,
  sorcererBundle,
  wizardBundle,
];

export const classes: ClassDef[] = [fighter, warlock, ...bundles.map((b) => b.cls)];
export const subclasses: SubclassDef[] = [
  ...fighterSubclasses,
  ...warlockSubclasses,
  ...bundles.flatMap((b) => b.subclasses),
];
export const classFeatures: Feature[] = bundles.flatMap((b) => b.features);
export const classOptionGroups: OptionGroup[] = bundles.flatMap((b) => b.optionGroups);
