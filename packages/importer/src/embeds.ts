import { z } from 'zod';
import { extractPost } from './nuxt';
import type { ActGear, AbilityValue, EmbedRef, GearSetup } from './sections';
import { normaliseName } from './text';

/**
 * Gamestegy's build API, which fills the build panels some guides embed instead of gear and
 * ability tables. Only the fields the importer reads are checked; the rest is ignored.
 */

const embeddedBuildSchema = z.object({
  id: z.number(),
  equipment: z
    .object({
      sets: z.array(
        z.object({
          name: z.string(),
          equipment: z.record(z.string(), z.array(z.object({ itemId: z.number() }))),
        }),
      ),
    })
    .nullish(),
  ability_points: z
    .object({
      tabs: z.array(
        z.object({
          name: z.string(),
          values: z.record(z.string(), z.number()),
          plusOne: z.string().nullish(),
          plusTwo: z.string().nullish(),
        }),
      ),
    })
    .nullish(),
  equipmentItems: z.array(z.object({ id: z.number(), display_name: z.string() })).default([]),
});

export type EmbeddedBuild = z.infer<typeof embeddedBuildSchema>;

/** The builds among `raw` (API responses) that have the expected shape, by id. */
export function readEmbeddedBuilds(raw: unknown[]): Map<number, EmbeddedBuild> {
  const builds = new Map<number, EmbeddedBuild>();
  for (const value of raw) {
    const parsed = embeddedBuildSchema.safeParse(value);
    if (parsed.success) builds.set(parsed.data.id, parsed.data);
  }
  return builds;
}

/**
 * Where to fetch the data of a guide page's build panels, or undefined if it has none. The
 * post's own build is the one its panels show; fetched by post, it comes with item names.
 */
export function embeddedBuildUrl(html: string): string | undefined {
  if (!/BG3 Build [A-Za-z ]*Embed/.test(html)) return undefined;
  const { id } = extractPost(html);
  return id ? `https://backend.gamestegy.com/api/bg3-builds/post/${id}` : undefined;
}

/** Panel slot keys as gear-table slot labels the importer already understands. */
const SLOT_LABELS: Record<string, string> = {
  mainHand: 'Melee',
  offHand: 'Melee off-hand',
  rangedMainHand: 'Ranged',
  rangedOffHand: 'Ranged off-hand',
  helmet: 'Head',
  cloak: 'Cloak',
  breast: 'Armour',
  gloves: 'Gloves',
  boots: 'Boots',
  amulet: 'Amulet',
  rings: 'Rings',
  rings2: 'Rings',
};

/**
 * The gear setups an act's panels show. A panel names its sets ("Act 2, Act 2 - Unarmed"); when
 * none of the names exist any more (sets renamed after the guide was written), the build's sets
 * named after the act are used.
 */
export function embeddedGear(act: ActGear, builds: Map<number, EmbeddedBuild>): GearSetup[] {
  const setups: GearSetup[] = [];
  for (const ref of act.embeds) {
    const build = builds.get(ref.buildId);
    const sets = build?.equipment?.sets ?? [];
    const named = ref.sets.flatMap(
      (name) => sets.find((s) => normaliseName(s.name) === normaliseName(name)) ?? [],
    );
    const forAct = sets.filter((s) => new RegExp(`^act\\s*${act.act}(?![.\\d])`, 'i').test(s.name));
    const items = new Map(build?.equipmentItems.map((i) => [i.id, i.display_name]));
    for (const set of named.length ? named : forAct) {
      if (setups.some((s) => s.title === set.name)) continue;
      setups.push({
        title: set.name,
        rows: Object.entries(set.equipment).flatMap(([key, entries]) => {
          const names = entries.flatMap((e) => items.get(e.itemId) ?? []);
          return names.length ? [{ slot: SLOT_LABELS[key] ?? key, items: names }] : [];
        }),
      });
    }
  }
  return setups.filter((s) => s.rows.length > 0);
}

const ABILITY_NAMES = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const;

/**
 * The first ability setup of the first panel build that has one: final scores plus which
 * abilities take the racial +2 and +1, with the names of the other setups.
 */
export function embeddedAbilities(
  refs: EmbedRef[],
  builds: Map<number, EmbeddedBuild>,
): { values: Record<string, AbilityValue>; setup: string; others: string[] } | undefined {
  for (const ref of refs) {
    const [tab, ...others] = builds.get(ref.buildId)?.ability_points?.tabs ?? [];
    if (!tab) continue;
    const scores = new Map(Object.entries(tab.values).map(([k, v]) => [k.toLowerCase(), v]));
    if (!ABILITY_NAMES.every((a) => scores.has(a))) continue;
    const bonusFor = (ability: string) =>
      tab.plusTwo?.toLowerCase() === ability ? 2 : tab.plusOne?.toLowerCase() === ability ? 1 : 0;
    const values = Object.fromEntries(
      ABILITY_NAMES.map((a) => {
        const value = scores.get(a)!;
        const bonus = bonusFor(a);
        return [a, bonus ? { value, base: value - bonus, bonus } : { value }];
      }),
    );
    return { values, setup: tab.name, others: others.map((t) => t.name) };
  }
  return undefined;
}
