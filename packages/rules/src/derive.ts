import {
  ABILITIES,
  type Ability,
  type Skill,
  abilityModifier,
  proficiencyBonus,
} from '@bg3planner/shared';
import type { Feature, GameData, Spellcasting } from '@bg3planner/gamedata';
import type { Build } from './build';
import { type SpellSlots, spellSlots } from './spell-slots';
import { type SpellKind, type Source, walkBuild } from './walker';

/**
 * Effects the data cannot express yet, keyed by feature or feat id. Kept in one place so they
 * are easy to find when the data model grows to cover them.
 */
const HIT_POINTS_PER_LEVEL: Record<string, number> = {
  'dwarven-toughness': 1, // feature
  tough: 2, // feat
};
const SPEED_BONUS: Record<string, number> = { mobile: 3 }; // feat
const DARKVISION_RANGE: Record<string, number> = { darkvision: 12, 'superior-darkvision': 24 };

export interface DerivedClass {
  id: string;
  name: string;
  level: number;
  subclass?: { id: string; name: string };
}

export interface DerivedCaster {
  classId: string;
  ability: Ability;
  saveDc: number;
  attackBonus: number;
}

export interface DerivedSpell {
  id: string;
  name: string;
  level: number;
  kind: SpellKind;
  source: Source;
  ability?: Ability;
}

export interface DerivedCharacter {
  level: number;
  /** In the order they were first taken. */
  classes: DerivedClass[];
  race?: { id: string; name: string };
  subrace?: { id: string; name: string };
  background?: { id: string; name: string };
  size?: 'small' | 'medium';
  /** Metres per turn. */
  speed: number;
  /** Metres; 0 without darkvision. */
  darkvision: number;
  abilityScores: Record<Ability, number>;
  abilityModifiers: Record<Ability, number>;
  proficiencyBonus: number;
  hitPoints: number;
  savingThrows: Ability[];
  skills: Skill[];
  expertise: Skill[];
  armour: ('light' | 'medium' | 'heavy')[];
  shields: boolean;
  weaponCategories: ('simple' | 'martial')[];
  weaponTypes: string[];
  features: (Feature & { source: Source })[];
  feats: { id: string; name: string; characterLevel: number }[];
  /** Picks per option group, e.g. `eldritch-invocations`. */
  options: Record<string, string[]>;
  spellSlots: SpellSlots;
  casters: DerivedCaster[];
  spells: DerivedSpell[];
  resources: Record<string, number>;
}

/** The character sheet a build produces. Invalid answers are skipped; see `validateBuild`. */
export function deriveCharacter(build: Build, data: GameData): DerivedCharacter {
  const { index, state } = walkBuild(build, data);
  const level = build.levels.length;
  const prof = proficiencyBonus(level);

  const abilityScores = Object.fromEntries(
    ABILITIES.map((a) => [
      a,
      Math.min(
        20,
        build.abilities.base[a] + (build.abilities.racialBonus[a] ?? 0) + state.abilityBonus[a],
      ),
    ]),
  ) as Record<Ability, number>;
  const abilityModifiers = Object.fromEntries(
    ABILITIES.map((a) => [a, abilityModifier(abilityScores[a])]),
  ) as Record<Ability, number>;

  const features: DerivedCharacter['features'] = [];
  for (const { id, source } of state.features) {
    const feature = index.features.get(id);
    if (feature && !features.some((f) => f.id === id)) features.push({ ...feature, source });
  }
  const featIds = state.feats.map((f) => f.id);
  const effectIds = [...features.map((f) => f.id), ...featIds];

  const conMod = abilityModifiers.constitution;
  let hitPoints = 0;
  build.levels.forEach((entry, i) => {
    const cls = index.classes.get(entry.classId);
    if (!cls) return;
    const base = i === 0 ? cls.hitPoints.firstLevel : cls.hitPoints.perLevel;
    hitPoints += Math.max(1, base + conMod);
  });
  for (const id of effectIds) hitPoints += (HIT_POINTS_PER_LEVEL[id] ?? 0) * level;

  const race = index.races.get(build.raceId);
  const subrace = race?.subraces.find((s) => s.id === build.subraceId);
  const background = index.backgrounds.get(build.backgroundId);

  const classes: DerivedClass[] = [];
  const casters: { level: number; spellcasting: Spellcasting; classId: string }[] = [];
  for (const id of state.classOrder) {
    const cls = index.classes.get(id)!;
    const classLevel = state.classLevels.get(id)!;
    const subclass = index.subclasses.get(state.subclassOf.get(id) ?? '');
    classes.push({
      id,
      name: cls.name,
      level: classLevel,
      ...(subclass ? { subclass: { id: subclass.id, name: subclass.name } } : {}),
    });
    const spellcasting = cls.spellcasting ?? subclass?.spellcasting;
    if (spellcasting) casters.push({ level: classLevel, spellcasting, classId: id });
  }

  const resources: Record<string, number> = Object.fromEntries(state.classResources);
  for (const [id, bonus] of state.bonusResources) resources[id] = (resources[id] ?? 0) + bonus;

  const named = <T extends { id: string; name: string }>(item: T | undefined) =>
    item ? { id: item.id, name: item.name } : undefined;
  const optional = <K extends string, V>(key: K, value: V | undefined) =>
    (value === undefined ? {} : { [key]: value }) as Partial<Record<K, V>>;

  return {
    level,
    classes,
    ...optional('race', named(race)),
    ...optional('subrace', named(subrace)),
    ...optional('background', named(background)),
    ...optional('size', race?.size),
    speed:
      (subrace?.speed ?? race?.speed ?? 9) +
      effectIds.reduce((sum, id) => sum + (SPEED_BONUS[id] ?? 0), 0),
    darkvision: Math.max(0, ...effectIds.map((id) => DARKVISION_RANGE[id] ?? 0)),
    abilityScores,
    abilityModifiers,
    proficiencyBonus: prof,
    hitPoints,
    savingThrows: ABILITIES.filter((a) => state.savingThrows.has(a)),
    skills: [...state.skills].sort(),
    expertise: [...state.expertise].sort(),
    armour: (['light', 'medium', 'heavy'] as const).filter((a) => state.armour.has(a)),
    shields: state.shields,
    weaponCategories: (['simple', 'martial'] as const).filter((w) => state.weaponCategories.has(w)),
    weaponTypes: [...state.weaponTypes].sort(),
    features,
    feats: state.feats.map((f) => ({
      id: f.id,
      name: index.feats.get(f.id)?.name ?? f.id,
      characterLevel: f.characterLevel,
    })),
    options: Object.fromEntries(state.options),
    spellSlots: spellSlots(casters, data.multiclassSpellSlots),
    casters: casters.map(({ classId, spellcasting }) => ({
      classId,
      ability: spellcasting.ability,
      saveDc: 8 + prof + abilityModifiers[spellcasting.ability],
      attackBonus: prof + abilityModifiers[spellcasting.ability],
    })),
    spells: state.spells.flatMap((s) => {
      const spell = index.spells.get(s.spellId);
      if (!spell) return [];
      return [
        {
          id: spell.id,
          name: spell.name,
          level: spell.level,
          kind: s.kind,
          source: s.source,
          ...(s.ability ? { ability: s.ability } : {}),
        },
      ];
    }),
    resources,
  };
}
