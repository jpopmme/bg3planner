import type { GameData } from '@bg3planner/gamedata';
import { type Build, buildSchema } from './build';
import { type ChoiceSlot, type Issue, walkBuild } from './walker';

/**
 * Every choice the build has to answer, with its allowed options, in the order the game asks.
 * Pass `characterLevel` to get only that level's (level 1 includes character creation).
 */
export function availableChoices(
  build: Build,
  data: GameData,
  characterLevel?: number,
): ChoiceSlot[] {
  const { slots } = walkBuild(build, data);
  return characterLevel === undefined
    ? slots
    : slots.filter((s) => s.characterLevel === characterLevel);
}

/** Problems with a build: errors make it impossible in game, warnings mark unfinished choices. */
export function validateBuild(build: Build, data: GameData): Issue[] {
  return walkBuild(build, data).issues;
}

/** Parses untrusted JSON (a saved or imported build) into a build or schema errors. */
export function parseBuild(
  input: unknown,
): { ok: true; build: Build } | { ok: false; issues: Issue[] } {
  const result = buildSchema.safeParse(input);
  if (result.success) return { ok: true, build: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((i) => ({
      severity: 'error',
      characterLevel: 1,
      message: `${i.path.join('.') || 'build'}: ${i.message}`,
    })),
  };
}
