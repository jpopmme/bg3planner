import type { ClassDef, Feature, OptionGroup, SubclassDef } from '../../schema';
import type { ClassBundle } from './bundle';
import { fighter, fighterSubclasses } from './fighter';
import { warlock, warlockSubclasses } from './warlock';

/** Classes written as bundles (see bundle.ts); Fighter and Warlock predate them. */
const bundles: ClassBundle[] = [];

export const classes: ClassDef[] = [fighter, warlock, ...bundles.map((b) => b.cls)];
export const subclasses: SubclassDef[] = [
  ...fighterSubclasses,
  ...warlockSubclasses,
  ...bundles.flatMap((b) => b.subclasses),
];
export const classFeatures: Feature[] = bundles.flatMap((b) => b.features);
export const classOptionGroups: OptionGroup[] = bundles.flatMap((b) => b.optionGroups);
