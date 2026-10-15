import { GAME_DATA_VERSION, gameData } from '@bg3planner/gamedata';
import {
  type Answer,
  type Build,
  availableChoices,
  deriveCharacter,
  parseBuild,
  validateBuild,
} from '@bg3planner/rules';
import { ABILITIES, type Ability } from '@bg3planner/shared';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

const DRAFT_KEY = 'bg3planner:draft';

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

/** The draft saved by the previous visit, if it is still a valid build. */
function loadDraft(): { name: string; build: Build } | undefined {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return undefined;
    const saved = JSON.parse(raw) as { name?: unknown; build?: unknown };
    const parsed = parseBuild(saved.build);
    if (!parsed.ok) return undefined;
    return { name: typeof saved.name === 'string' ? saved.name : '', build: parsed.build };
  } catch {
    return undefined;
  }
}

export const useBuildStore = defineStore('build', () => {
  const draft = loadDraft();
  const name = ref(draft?.name ?? '');
  const build = ref<Build>(draft?.build ?? newBuild());

  const character = computed(() => deriveCharacter(build.value, gameData));
  const choices = computed(() => availableChoices(build.value, gameData));
  const issues = computed(() => validateBuild(build.value, gameData));

  // Until real saving arrives (M4), keep a draft so a reload does not lose work.
  watch(
    [name, build],
    () => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ name: name.value, build: build.value }));
      } catch {
        // Storage can be unavailable (private mode, quota); the planner still works.
      }
    },
    { deep: true },
  );

  /** Drops answers whose choice no longer exists, e.g. after changing race or a level's class. */
  function pruneStaleAnswers() {
    const valid = new Set(choices.value.map((c) => `${c.characterLevel}|${c.key}`));
    build.value.levels.forEach((entry, i) => {
      for (const key of Object.keys(entry.answers)) {
        if (!valid.has(`${i + 1}|${key}`)) delete entry.answers[key];
      }
    });
  }

  function setRace(raceId: string) {
    build.value.raceId = raceId;
    delete build.value.subraceId;
    pruneStaleAnswers();
  }

  function setSubrace(subraceId: string | undefined) {
    if (subraceId) build.value.subraceId = subraceId;
    else delete build.value.subraceId;
    const first = build.value.levels[0]!.answers;
    for (const key of Object.keys(first)) if (key.startsWith('subrace:')) delete first[key];
    pruneStaleAnswers();
  }

  function setBackground(backgroundId: string) {
    build.value.backgroundId = backgroundId;
    pruneStaleAnswers();
  }

  function setBaseScore(ability: Ability, score: number) {
    build.value.abilities.base[ability] = score;
  }

  /** Puts the racial +2 or +1 on an ability, moving it off whichever ability had it. */
  function setRacialBonus(ability: Ability, bonus: 1 | 2 | undefined) {
    const bonuses = build.value.abilities.racialBonus;
    if (bonus === undefined) {
      delete bonuses[ability];
      return;
    }
    for (const a of ABILITIES) if (bonuses[a] === bonus) delete bonuses[a];
    bonuses[ability] = bonus;
  }

  /** Changes the class taken at a level; that level's class choices start over. */
  function setLevelClass(index: number, classId: string) {
    const entry = build.value.levels[index];
    if (!entry || entry.classId === classId) return;
    entry.classId = classId;
    for (const key of Object.keys(entry.answers)) {
      if (!key.startsWith('race:') && !key.startsWith('subrace:')) delete entry.answers[key];
    }
    pruneStaleAnswers();
  }

  function addLevel(classId: string) {
    if (build.value.levels.length >= 12) return;
    build.value.levels.push({ classId, answers: {} });
  }

  function removeLastLevel() {
    if (build.value.levels.length <= 1) return;
    build.value.levels.pop();
    pruneStaleAnswers();
  }

  function setAnswer(characterLevel: number, key: string, answer: Answer | undefined) {
    const entry = build.value.levels[characterLevel - 1];
    if (!entry) return;
    if (answer === undefined) delete entry.answers[key];
    else entry.answers[key] = answer;
    // A different subclass or feat changes which follow-up choices exist.
    pruneStaleAnswers();
  }

  function reset() {
    name.value = '';
    build.value = newBuild();
  }

  return {
    name,
    build,
    character,
    choices,
    issues,
    setRace,
    setSubrace,
    setBackground,
    setBaseScore,
    setRacialBonus,
    setLevelClass,
    addLevel,
    removeLastLevel,
    setAnswer,
    reset,
  };
});
