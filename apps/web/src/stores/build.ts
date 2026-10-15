import { gameData } from '@bg3planner/gamedata';
import {
  type Answer,
  type Build,
  availableChoices,
  deriveCharacter,
  validateBuild,
} from '@bg3planner/rules';
import { ABILITIES, type Ability } from '@bg3planner/shared';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { newBuild } from './new-build';
import { usePartyStore } from './party';

export { newBuild };

/** The character being edited (the party's active member) and everything derived from it. */
export const useBuildStore = defineStore('build', () => {
  const party = usePartyStore();
  const name = computed({
    get: () => party.currentMember.name,
    set: (value: string) => (party.currentMember.name = value),
  });
  const build = computed({
    get: () => party.currentMember.build,
    set: (value: Build) => (party.currentMember.build = value),
  });

  const character = computed(() => deriveCharacter(build.value, gameData));
  const choices = computed(() => availableChoices(build.value, gameData));
  const issues = computed(() => validateBuild(build.value, gameData));

  /** Drops answers whose choice no longer exists, e.g. after changing race or a level's class. */
  function pruneStaleAnswers() {
    const valid = new Set(choices.value.map((c) => `${c.characterLevel}|${c.key}`));
    build.value.levels.forEach((entry, i) => {
      for (const key of Object.keys(entry.answers)) {
        if (!valid.has(`${i + 1}|${key}`)) delete entry.answers[key];
      }
    });
  }

  /** The character's origin, and which creation fields it fixes. */
  const origin = computed(() =>
    gameData.origins.find((o) => o.id === (build.value.originId ?? 'custom'))!,
  );
  const locks = computed(() => ({
    race: !!origin.value.raceId,
    background: !!origin.value.backgroundId,
  }));

  /** Changes who the character is, applying the race, subrace and background it fixes. */
  function setOrigin(originId: string) {
    const next = gameData.origins.find((o) => o.id === originId);
    if (!next) return;
    if (next.kind === 'custom') delete build.value.originId;
    else build.value.originId = next.id;
    if (next.raceId) {
      build.value.raceId = next.raceId;
      if (next.subraceId) build.value.subraceId = next.subraceId;
      else delete build.value.subraceId;
    }
    if (next.backgroundId) {
      build.value.backgroundId = next.backgroundId;
    } else if (gameData.backgrounds.find((b) => b.id === build.value.backgroundId)?.darkUrgeOnly) {
      // Haunted One belongs to The Dark Urge; anyone else needs another background.
      build.value.backgroundId = 'acolyte';
    }
    if (next.kind === 'origin' || next.kind === 'companion') name.value = next.name;
    pruneStaleAnswers();
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

  return {
    name,
    build,
    origin,
    locks,
    setOrigin,
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
  };
});
