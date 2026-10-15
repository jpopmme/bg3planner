import { gameData } from '../../index';
import { findIntegrityIssues } from '../../integrity';
import {
  type ClassDef,
  type Feature,
  type GameData,
  type OptionGroup,
  type SubclassDef,
  gameDataSchema,
} from '../../schema';

/**
 * One class with everything only it uses: its subclasses, the features they grant (those not
 * already in data/features.ts) and its option groups. Each class module exports one bundle.
 */
export interface ClassBundle {
  cls: ClassDef;
  subclasses: SubclassDef[];
  features: Feature[];
  optionGroups: OptionGroup[];
}

/**
 * Schema and integrity problems of a bundle checked against the rest of the dataset, as if it
 * were registered. "Never granted" issues are only reported for the bundle's own features and
 * groups, so a bundle can be checked before the others exist.
 *
 * `pendingSpells` lists spell ids that exist on bg3.wiki but are not in spells.json yet (spells
 * on no class list are only generated once something references them); they are not reported.
 */
export function bundleIssues(bundle: ClassBundle, pendingSpells: string[] = []): string[] {
  const data: GameData = {
    ...gameData,
    classes: [...gameData.classes.filter((c) => c.id !== bundle.cls.id), bundle.cls],
    subclasses: [
      ...gameData.subclasses.filter((s) => s.classId !== bundle.cls.id),
      ...bundle.subclasses,
    ],
    features: [
      ...gameData.features.filter((f) => !bundle.features.some((b) => b.id === f.id)),
      ...bundle.features,
    ],
    optionGroups: [
      ...gameData.optionGroups.filter((g) => !bundle.optionGroups.some((b) => b.id === g.id)),
      ...bundle.optionGroups,
    ],
  };

  const parsed = gameDataSchema.safeParse(data);
  const schemaIssues = parsed.success
    ? []
    : parsed.error.issues.map((i) => `schema: ${i.path.join('.')}: ${i.message}`);

  const own = new Set([
    ...bundle.features.map((f) => `feature "${f.id}" is never granted`),
    ...bundle.optionGroups.map((g) => `option group "${g.id}" is never offered`),
  ]);
  const pending = pendingSpells.map((id) => `unknown spell "${id}"`);
  const integrity = findIntegrityIssues(data).filter(
    (issue) =>
      !(/is never granted$|is never offered$/.test(issue) && !own.has(issue)) &&
      !pending.some((p) => issue.includes(p)),
  );
  return [...schemaIssues, ...integrity];
}
