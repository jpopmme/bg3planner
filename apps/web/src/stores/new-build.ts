import { GAME_DATA_VERSION } from '@bg3planner/gamedata';
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
