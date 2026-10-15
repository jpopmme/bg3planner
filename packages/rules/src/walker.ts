import { ABILITIES, type Ability, MAX_LEVEL, SKILLS, type Skill } from '@bg3planner/shared';
import type {
  Choice,
  ClassDef,
  Feat,
  GameData,
  Race,
  Spell,
  SubclassDef,
  Subrace,
} from '@bg3planner/gamedata';
import type { Answer, Build } from './build';
import { type DataIndex, indexData } from './data-index';
import { POINT_BUY_BUDGET, POINT_BUY_MAX, POINT_BUY_MIN, pointBuySpent } from './point-buy';

export type SourceKind = 'class' | 'subclass' | 'feat' | 'race' | 'subrace';

/** What granted a feature, spell or choice. */
export interface Source {
  kind: SourceKind;
  id: string;
  name: string;
}

export interface Issue {
  severity: 'error' | 'warning';
  /** 1 for character creation. */
  characterLevel: number;
  /** Answer key the issue is about, when it is about one choice. */
  key?: string;
  message: string;
}

/** What a choice may be answered with. */
export type ChoiceOptions =
  | { kind: 'ids'; ids: string[] }
  | { kind: 'replace'; from: string[]; to: string[] }
  | { kind: 'abilities'; abilities: Ability[] };

/** One choice the build has to answer, with what it may be answered with. */
export interface ChoiceSlot {
  characterLevel: number;
  /** Key of the answer in `build.levels[characterLevel - 1].answers`. */
  key: string;
  source: Source;
  choice: Choice;
  /** What is being chosen, for display: "Fighting Style", "Spells", "Ability points". */
  label: string;
  options: ChoiceOptions;
  answer: Answer | undefined;
  /** Spell replacements may be skipped. */
  optional: boolean;
}

export type SpellKind = 'cantrip' | 'spell' | 'extra' | 'innate';

export interface KnownSpell {
  spellId: string;
  kind: SpellKind;
  source: Source;
  /** Ability the spell is cast with, when fixed by its source. */
  ability?: Ability;
  /** Who "knows" the spell, for replacements and duplicate checks: `class:warlock`, `feat:…`. */
  owner: string;
}

/** Everything accumulated while walking the build's levels. */
export interface WalkState {
  characterLevel: number;
  classOrder: string[];
  classLevels: Map<string, number>;
  subclassOf: Map<string, string>;
  abilityBonus: Record<Ability, number>;
  savingThrows: Set<Ability>;
  skills: Set<Skill>;
  expertise: Set<Skill>;
  armour: Set<'light' | 'medium' | 'heavy'>;
  shields: boolean;
  weaponCategories: Set<'simple' | 'martial'>;
  weaponTypes: Set<string>;
  features: { id: string; source: Source }[];
  feats: { id: string; characterLevel: number }[];
  options: Map<string, string[]>;
  spells: KnownSpell[];
  /** Class resource totals (latest value wins) and bonuses added on top (Martial Adept). */
  classResources: Map<string, number>;
  bonusResources: Map<string, number>;
}

export interface WalkResult {
  index: DataIndex;
  state: WalkState;
  slots: ChoiceSlot[];
  issues: Issue[];
}

const emptyAbilityRecord = () =>
  Object.fromEntries(ABILITIES.map((a) => [a, 0])) as Record<Ability, number>;

const isList = (answer: Answer | undefined): answer is string[] => Array.isArray(answer);
const isSwap = (answer: Answer | undefined): answer is { from: string; to: string } =>
  !!answer && !Array.isArray(answer) && 'from' in answer && 'to' in answer;
const isPoints = (answer: Answer | undefined): answer is Partial<Record<Ability, number>> =>
  !!answer && !Array.isArray(answer) && !isSwap(answer);

/** Context for one choice: where it comes from and how spells it teaches are owned and cast. */
interface ChoiceContext {
  characterLevel: number;
  key: string;
  source: Source;
  /** Level of the class granting the choice (12 for races and feats, which ignore it). */
  classLevel: number;
  owner: string;
  ability?: Ability;
  /** Class whose spell list (plus subclass expanded spells) `{ list }` sources refer to. */
  cls?: ClassDef;
  /** Message prefix naming the source and the choice, set by `handleChoice`. */
  label?: string;
}

/**
 * Walks a build from character creation to its last level, accumulating the character and
 * recording every choice with its allowed options. All public functions are built on this.
 */
export function walkBuild(build: Build, data: GameData): WalkResult {
  const index = indexData(data);
  const issues: Issue[] = [];
  const slots: ChoiceSlot[] = [];
  const state: WalkState = {
    characterLevel: 0,
    classOrder: [],
    classLevels: new Map(),
    subclassOf: new Map(),
    abilityBonus: emptyAbilityRecord(),
    savingThrows: new Set(),
    skills: new Set(),
    expertise: new Set(),
    armour: new Set(),
    shields: false,
    weaponCategories: new Set(),
    weaponTypes: new Set(),
    features: [],
    feats: [],
    options: new Map(),
    spells: [],
    classResources: new Map(),
    bonusResources: new Map(),
  };

  const issue = (
    severity: Issue['severity'],
    characterLevel: number,
    message: string,
    key?: string,
  ) => issues.push({ severity, characterLevel, message, ...(key ? { key } : {}) });

  // ---- Character creation ---------------------------------------------------------------

  if (build.gameDataVersion !== data.version) {
    issue(
      'warning',
      1,
      `Build was made with game data ${build.gameDataVersion}; current data is ${data.version}`,
    );
  }

  const race = index.races.get(build.raceId);
  let subrace: Subrace | undefined;
  if (!race) {
    issue('error', 1, `Unknown race "${build.raceId}"`);
  } else if (build.subraceId) {
    subrace = race.subraces.find((s) => s.id === build.subraceId);
    if (!subrace) issue('error', 1, `${race.name} has no subrace "${build.subraceId}"`);
  } else if (race.subraces.length > 0) {
    issue('warning', 1, `Choose a ${race.name} subrace`);
  }

  const nameOf = (id: string) =>
    (index.races.get(id) ?? index.subraces.get(id) ?? index.backgrounds.get(id))?.name ?? id;

  const background = index.backgrounds.get(build.backgroundId);
  if (!background) issue('error', 1, `Unknown background "${build.backgroundId}"`);
  else background.skills.forEach((s) => state.skills.add(s as Skill));

  const origin = index.origins.get(build.originId ?? 'custom');
  if (!origin) {
    issue('error', 1, `Unknown origin "${build.originId}"`);
  } else {
    const fixed = (what: string, wanted: string | undefined, actual: string | undefined) => {
      if (wanted && wanted !== actual) {
        issue('error', 1, `${origin.name} is always a ${what}: ${nameOf(wanted)}`);
      }
    };
    fixed('race', origin.raceId, build.raceId);
    fixed('subrace', origin.subraceId, build.subraceId);
    fixed('background', origin.backgroundId, build.backgroundId);
    if (background?.darkUrgeOnly && origin.kind !== 'dark-urge') {
      issue('error', 1, `Only The Dark Urge can have the ${background.name} background`);
    }
  }

  checkAbilities(build, (severity, message) => issue(severity, 1, message));

  const currentScore = (ability: Ability) =>
    build.abilities.base[ability] +
    (build.abilities.racialBonus[ability] ?? 0) +
    state.abilityBonus[ability];

  // ---- Choices ----------------------------------------------------------------------------

  const knownIds = () => new Set(state.spells.map((s) => s.spellId));

  const spellPool = (
    choice: Extract<Choice, { type: 'cantrip' | 'spell' | 'replace-spell' }>,
    ctx: ChoiceContext,
  ): Spell[] => {
    if ('spells' in choice.from) {
      return choice.from.spells.flatMap((id) => index.spells.get(id) ?? []);
    }
    const list = choice.from.list;
    const pool = index.data.spells.filter((s) => s.classes.includes(list));
    const spellcasting = ctx.cls?.spellcasting;
    const subclass = ctx.cls && index.subclasses.get(state.subclassOf.get(ctx.cls.id) ?? '');
    if (spellcasting?.spellList === list && subclass?.expandedSpells) {
      for (const { classLevel, spells } of subclass.expandedSpells) {
        if (classLevel > ctx.classLevel) continue;
        for (const id of spells) {
          const spell = index.spells.get(id);
          if (spell && !pool.includes(spell)) pool.push(spell);
        }
      }
    }
    return pool;
  };

  const optionsFor = (choice: Choice, ctx: ChoiceContext): ChoiceOptions => {
    switch (choice.type) {
      case 'subclass':
        return {
          kind: 'ids',
          ids: index.data.subclasses.filter((s) => s.classId === ctx.cls?.id).map((s) => s.id),
        };
      case 'feat':
        return {
          kind: 'ids',
          ids: index.data.feats.filter((f) => featAllowed(f)).map((f) => f.id),
        };
      case 'option': {
        const taken = state.options.get(choice.group) ?? [];
        const group = index.optionGroups.get(choice.group);
        return {
          kind: 'ids',
          ids: (group?.options ?? [])
            .filter((o) => (o.minClassLevel ?? 1) <= ctx.classLevel && !taken.includes(o.id))
            .map((o) => o.id),
        };
      }
      case 'cantrip': {
        const known = knownIds();
        return {
          kind: 'ids',
          ids: spellPool(choice, ctx)
            .filter((s) => s.level === 0 && !known.has(s.id))
            .map((s) => s.id),
        };
      }
      case 'spell':
      case 'replace-spell': {
        const known = knownIds();
        const to = spellPool(choice, ctx)
          .filter(
            (s) =>
              s.level >= (choice.minLevel ?? 1) &&
              s.level <= choice.maxLevel &&
              (!choice.schools || (s.school !== null && choice.schools.includes(s.school))) &&
              !known.has(s.id),
          )
          .map((s) => s.id);
        if (choice.type === 'spell') return { kind: 'ids', ids: to };
        const from = state.spells
          .filter((s) => s.owner === ctx.owner && s.kind === 'spell')
          .map((s) => s.spellId);
        return { kind: 'replace', from, to };
      }
      case 'ability-increase':
        return { kind: 'abilities', abilities: [...choice.from] };
      case 'skill':
        return {
          kind: 'ids',
          ids: (choice.from ?? SKILLS).filter((s) => !state.skills.has(s as Skill)),
        };
      case 'weapon-proficiency':
        return {
          kind: 'ids',
          ids: index.data.weaponTypes
            .filter((w) => !state.weaponCategories.has(w.category) && !state.weaponTypes.has(w.id))
            .map((w) => w.id),
        };
    }
  };

  const featAllowed = (feat: Feat): boolean => {
    if (!feat.repeatable && state.feats.some((f) => f.id === feat.id)) return false;
    const req = feat.requires;
    if (req?.armour && !state.armour.has(req.armour)) return false;
    for (const [ability, min] of Object.entries(req?.abilities ?? {})) {
      if (currentScore(ability as Ability) < min) return false;
    }
    return true;
  };

  /** Validates a list answer; returns the valid picks (possibly fewer than asked). */
  const readList = (
    answer: Answer | undefined,
    count: number,
    ids: string[],
    ctx: ChoiceContext,
  ) => {
    const label = ctx.label ?? ctx.source.name;
    if (answer === undefined) {
      issue('warning', ctx.characterLevel, `${label}: choose ${count}`, ctx.key);
      return [];
    }
    if (!isList(answer)) {
      issue('error', ctx.characterLevel, `${label}: expected a list of picks`, ctx.key);
      return [];
    }
    const valid: string[] = [];
    for (const id of answer) {
      if (valid.includes(id)) {
        issue('error', ctx.characterLevel, `${label}: "${id}" is picked twice`, ctx.key);
      } else if (!ids.includes(id)) {
        issue('error', ctx.characterLevel, `${label}: "${id}" is not an allowed choice`, ctx.key);
      } else {
        valid.push(id);
      }
    }
    if (answer.length > count) {
      issue(
        'error',
        ctx.characterLevel,
        `${label}: ${answer.length} picked, only ${count} allowed`,
        ctx.key,
      );
      return valid.slice(0, count);
    }
    if (answer.length < count) {
      issue(
        'warning',
        ctx.characterLevel,
        `${label}: ${answer.length} of ${count} chosen`,
        ctx.key,
      );
    }
    return valid;
  };

  const addSpells = (ids: string[], kind: SpellKind, ctx: ChoiceContext) => {
    for (const spellId of ids) {
      state.spells.push({
        spellId,
        kind,
        source: ctx.source,
        owner: ctx.owner,
        ...(ctx.ability ? { ability: ctx.ability } : {}),
      });
    }
  };

  const describe = (choice: Choice): string => {
    switch (choice.type) {
      case 'subclass':
        return 'Subclass';
      case 'feat':
        return 'Feat';
      case 'option':
        return index.optionGroups.get(choice.group)?.name ?? choice.group;
      case 'cantrip':
        return choice.label ?? 'Cantrips';
      case 'spell':
        if (choice.label) return choice.label;
        if (choice.schools) {
          const schools = choice.schools.join(' or ');
          return `${schools.charAt(0).toUpperCase()}${schools.slice(1)} spells`;
        }
        return 'Spells';
      case 'replace-spell':
        return 'Spell replacement';
      case 'ability-increase':
        return 'Ability points';
      case 'skill':
        return 'Skills';
      case 'weapon-proficiency':
        return 'Weapon proficiencies';
    }
  };

  const handleChoice = (choice: Choice, baseCtx: ChoiceContext, answer: Answer | undefined) => {
    const label = describe(choice);
    const ctx = { ...baseCtx, label: `${baseCtx.source.name} – ${label}` };
    const options = optionsFor(choice, ctx);
    slots.push({
      characterLevel: ctx.characterLevel,
      key: ctx.key,
      source: ctx.source,
      choice,
      label,
      options,
      answer,
      optional: choice.type === 'replace-spell',
    });
    const level = ctx.characterLevel;

    switch (choice.type) {
      case 'subclass': {
        const [id] = readList(answer, 1, options.kind === 'ids' ? options.ids : [], ctx);
        if (id && ctx.cls) state.subclassOf.set(ctx.cls.id, id);
        return;
      }
      case 'feat': {
        const [id] = readList(answer, 1, options.kind === 'ids' ? options.ids : [], ctx);
        const feat = id ? index.feats.get(id) : undefined;
        if (feat) {
          state.feats.push({ id: feat.id, characterLevel: level });
          applyGrant(feat, { kind: 'feat', id: feat.id, name: feat.name }, 'feat', level);
        }
        return;
      }
      case 'option': {
        const picks = readList(
          answer,
          choice.count,
          options.kind === 'ids' ? options.ids : [],
          ctx,
        );
        state.options.set(choice.group, [...(state.options.get(choice.group) ?? []), ...picks]);
        return;
      }
      case 'cantrip':
      case 'spell': {
        const picks = readList(
          answer,
          choice.count,
          options.kind === 'ids' ? options.ids : [],
          ctx,
        );
        addSpells(
          picks,
          choice.type === 'cantrip' ? 'cantrip' : choice.extra ? 'extra' : 'spell',
          ctx,
        );
        return;
      }
      case 'replace-spell': {
        if (answer === undefined || options.kind !== 'replace') return;
        if (!isSwap(answer)) {
          issue(
            'error',
            level,
            `${ctx.label}: expected a spell to replace and its replacement`,
            ctx.key,
          );
          return;
        }
        const known = state.spells.find(
          (s) => s.owner === ctx.owner && s.kind === 'spell' && s.spellId === answer.from,
        );
        if (!known) {
          issue(
            'error',
            level,
            `${ctx.label}: "${answer.from}" is not a known spell to replace`,
            ctx.key,
          );
        } else if (!options.to.includes(answer.to)) {
          issue(
            'error',
            level,
            `${ctx.label}: "${answer.to}" is not an allowed replacement`,
            ctx.key,
          );
        } else {
          known.spellId = answer.to;
        }
        return;
      }
      case 'ability-increase': {
        if (answer === undefined) {
          issue(
            'warning',
            level,
            `${ctx.label}: assign ${choice.points} ability point(s)`,
            ctx.key,
          );
          return;
        }
        if (!isPoints(answer)) {
          issue('error', level, `${ctx.label}: expected points per ability`, ctx.key);
          return;
        }
        const errorsBefore = issues.length;
        let total = 0;
        for (const [ability, points] of Object.entries(answer) as [Ability, number][]) {
          total += points;
          if (!choice.from.includes(ability)) {
            issue('error', level, `${ctx.label}: cannot increase ${ability}`, ctx.key);
          } else if (points > choice.maxPerAbility) {
            issue(
              'error',
              level,
              `${ctx.label}: at most +${choice.maxPerAbility} to ${ability}`,
              ctx.key,
            );
          } else if (currentScore(ability) + points > 20) {
            issue('error', level, `${ctx.label}: ${ability} would exceed 20`, ctx.key);
          }
        }
        if (total > choice.points) {
          issue(
            'error',
            level,
            `${ctx.label}: ${total} points assigned, only ${choice.points} available`,
            ctx.key,
          );
        } else if (total < choice.points) {
          issue(
            'warning',
            level,
            `${ctx.label}: ${total} of ${choice.points} points assigned`,
            ctx.key,
          );
        }
        if (issues.slice(errorsBefore).some((i) => i.severity === 'error')) return;
        for (const [ability, points] of Object.entries(answer) as [Ability, number][]) {
          state.abilityBonus[ability] += points;
          if (choice.savingThrowProficiency) state.savingThrows.add(ability);
        }
        return;
      }
      case 'skill': {
        const picks = readList(
          answer,
          choice.count,
          options.kind === 'ids' ? options.ids : [],
          ctx,
        );
        picks.forEach((s) => state.skills.add(s as Skill));
        return;
      }
      case 'weapon-proficiency': {
        const picks = readList(
          answer,
          choice.count,
          options.kind === 'ids' ? options.ids : [],
          ctx,
        );
        picks.forEach((w) => state.weaponTypes.add(w));
        return;
      }
    }
  };

  const addFeatures = (ids: string[] | undefined, source: Source) => {
    for (const id of ids ?? []) state.features.push({ id, source });
  };

  /** Fixed grants of a race, subrace or feat, then its choices keyed `<prefix>:<i>`. */
  const applyGrant = (
    grant: Race | Subrace | Feat,
    source: Source,
    prefix: 'race' | 'subrace' | 'feat',
    characterLevel: number,
  ) => {
    addFeatures(grant.features, source);
    for (const [ability, points] of Object.entries(grant.abilityIncrease ?? {}) as [
      Ability,
      number,
    ][]) {
      // Fixed increases stop at 20, like the game's.
      state.abilityBonus[ability] += Math.max(0, Math.min(points, 20 - currentScore(ability)));
    }
    grant.skills?.forEach((s) => state.skills.add(s as Skill));
    grant.expertise?.forEach((s) => {
      state.skills.add(s as Skill);
      state.expertise.add(s as Skill);
    });
    grant.armour?.forEach((a) => state.armour.add(a));
    if (grant.shields) state.shields = true;
    grant.weaponTypes?.forEach((w) => state.weaponTypes.add(w));
    for (const [id, amount] of Object.entries(grant.resources ?? {})) {
      state.bonusResources.set(id, (state.bonusResources.get(id) ?? 0) + amount);
    }
    const entry = build.levels[characterLevel - 1];
    grant.choices?.forEach((choice, i) => {
      const key = `${prefix}:${i}`;
      handleChoice(
        choice,
        {
          characterLevel,
          key,
          source,
          classLevel: MAX_LEVEL,
          owner: `${source.kind}:${source.id}`,
          ...(grant.spellcastingAbility ? { ability: grant.spellcastingAbility } : {}),
        },
        entry?.answers[key],
      );
    });
  };

  const innateSources: { grant: Race | Subrace; source: Source }[] = [];
  if (race)
    innateSources.push({ grant: race, source: { kind: 'race', id: race.id, name: race.name } });
  if (subrace) {
    innateSources.push({
      grant: subrace,
      source: { kind: 'subrace', id: subrace.id, name: subrace.name },
    });
  }

  // ---- Levels -----------------------------------------------------------------------------

  build.levels.forEach((entry, i) => {
    const characterLevel = i + 1;
    state.characterLevel = characterLevel;

    const cls = index.classes.get(entry.classId);
    if (!cls) {
      issue('error', characterLevel, `Unknown class "${entry.classId}"`);
      return;
    }
    const classLevel = (state.classLevels.get(cls.id) ?? 0) + 1;
    state.classLevels.set(cls.id, classLevel);
    const classSource: Source = { kind: 'class', id: cls.id, name: cls.name };

    if (classLevel === 1) {
      state.classOrder.push(cls.id);
      const profs = characterLevel === 1 ? cls.proficiencies : cls.multiclassProficiencies;
      profs.armour.forEach((a) => state.armour.add(a));
      if (profs.shields) state.shields = true;
      profs.weapons.forEach((w) => state.weaponCategories.add(w));
    }

    if (characterLevel === 1) {
      cls.savingThrows.forEach((a) => state.savingThrows.add(a));
      // Class skills are picked once, for the starting class, and exclude background skills.
      handleChoice(
        { type: 'skill', count: cls.skillChoices.count, from: cls.skillChoices.from },
        {
          characterLevel,
          key: 'class-skills',
          source: classSource,
          classLevel,
          owner: `class:${cls.id}`,
        },
        entry.answers['class-skills'],
      );
      if (race) applyGrant(race, innateSources[0]!.source, 'race', 1);
      if (subrace) applyGrant(subrace, innateSources[1]!.source, 'subrace', 1);
    }

    for (const { grant, source } of innateSources) {
      for (const { characterLevel: unlock, spell } of grant.innateSpells ?? []) {
        if (unlock !== characterLevel) continue;
        state.spells.push({
          spellId: spell,
          kind: 'innate',
          source,
          owner: `${source.kind}:${source.id}`,
          ...(grant.spellcastingAbility ? { ability: grant.spellcastingAbility } : {}),
        });
      }
    }

    const grantLevel = (
      levelGrant: ClassDef['levels'][number] | undefined,
      source: Source,
      prefix: 'class' | 'subclass',
      subclass?: SubclassDef,
    ) => {
      if (!levelGrant) return;
      addFeatures(levelGrant.features, source);
      levelGrant.skills?.forEach((s) => state.skills.add(s as Skill));
      levelGrant.proficiencies?.armour?.forEach((a) => state.armour.add(a));
      if (levelGrant.proficiencies?.shields) state.shields = true;
      levelGrant.proficiencies?.weapons?.forEach((w) => state.weaponCategories.add(w));
      for (const [id, total] of Object.entries(levelGrant.resources ?? {})) {
        state.classResources.set(id, total);
      }
      const spellcasting = cls.spellcasting ?? subclass?.spellcasting;
      levelGrant.choices.forEach((choice, j) => {
        const key = `${prefix}:${j}`;
        handleChoice(
          choice,
          {
            characterLevel,
            key,
            source,
            classLevel,
            owner: `class:${cls.id}`,
            cls: subclass?.spellcasting ? { ...cls, spellcasting: subclass.spellcasting } : cls,
            ...(spellcasting ? { ability: spellcasting.ability } : {}),
          },
          entry.answers[key],
        );
      });
    };

    grantLevel(cls.levels[classLevel - 1], classSource, 'class');

    const subclass = index.subclasses.get(state.subclassOf.get(cls.id) ?? '');
    if (subclass) {
      grantLevel(
        subclass.levels.find((l) => l.level === classLevel),
        { kind: 'subclass', id: subclass.id, name: subclass.name },
        'subclass',
        subclass,
      );
    }

    const expected = new Set(
      slots.filter((s) => s.characterLevel === characterLevel).map((s) => s.key),
    );
    for (const key of Object.keys(entry.answers)) {
      if (!expected.has(key)) {
        issue(
          'warning',
          characterLevel,
          `Answer "${key}" does not match any choice at this level`,
          key,
        );
      }
    }
  });

  return { index, state, slots, issues };
}

function checkAbilities(
  build: Build,
  report: (severity: Issue['severity'], message: string) => void,
) {
  const { base, racialBonus } = build.abilities;
  let scoresValid = true;
  for (const ability of ABILITIES) {
    const score = base[ability];
    if (score < POINT_BUY_MIN || score > POINT_BUY_MAX) {
      report('error', `Base ${ability} must be ${POINT_BUY_MIN}–${POINT_BUY_MAX}, got ${score}`);
      scoresValid = false;
    }
  }
  if (scoresValid) {
    const spent = pointBuySpent(base);
    if (spent > POINT_BUY_BUDGET) {
      report('error', `Point buy spends ${spent} points; the budget is ${POINT_BUY_BUDGET}`);
    } else if (spent < POINT_BUY_BUDGET) {
      report('warning', `${POINT_BUY_BUDGET - spent} point-buy points unspent`);
    }
  }

  const bonuses = Object.values(racialBonus).sort();
  if (bonuses.length === 0) {
    report('warning', 'Assign the racial +2 and +1 ability bonuses');
  } else if (bonuses.join() !== '1,2') {
    report('error', 'Racial bonuses must be +2 to one ability and +1 to another');
  }
}
