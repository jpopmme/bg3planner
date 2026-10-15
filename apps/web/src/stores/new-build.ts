import { GAME_DATA_VERSION, type Origin, gameData } from '@bg3planner/gamedata';
import type { Build } from '@bg3planner/rules';
import { ABILITIES, type Ability } from '@bg3planner/shared';

/** A fresh level-1 character: every score at 8, nothing chosen yet. */
export function newBuild(): Build {
  return {
    gameDataVersion: GAME_DATA_VERSION,
    raceId: 'human',
    backgroundId: 'acolyte',
    abilities: {
      base: Object.fromEntries(ABILITIES.map((a) => [a, 8])) as Record<Ability, number>,
      racialBonus: {},
    },
    levels: [{ classId: 'fighter', answers: {} }],
  };
}

/** A fresh character for an origin: its fixed race, subrace and background, and its usual class. */
export function buildForOrigin(origin: Origin): Build {
  const build = newBuild();
  if (origin.kind !== 'custom') build.originId = origin.id;
  if (origin.raceId) build.raceId = origin.raceId;
  if (origin.subraceId) build.subraceId = origin.subraceId;
  if (origin.backgroundId) build.backgroundId = origin.backgroundId;
  // Classes not in the planner yet (Rogue, Wizard, ...) start as Fighter.
  const classId = gameData.classes.some((c) => c.id === origin.defaultClass)
    ? origin.defaultClass
    : 'fighter';
  build.levels[0]!.classId = classId;
  return build;
}
