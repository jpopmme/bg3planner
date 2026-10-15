import {
  ABILITIES,
  type Ability,
  SKILL_ABILITIES,
  SKILLS,
  type Skill,
  abilityModifier,
  proficiencyBonus,
} from '@bg3planner/shared';
import {
  type Feature,
  type GameData,
  type Spellcasting,
  maxSpellLevel,
} from '@bg3planner/gamedata';
import type { Act, Build } from './build';
import {
  type ArmourClassPart,
  type UnarmouredDefence,
  applyAbilityEffects,
  armourClassParts,
  equippedItems,
} from './equipment';
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
/** Hit points per level of one class (Draconic Resilience: per Sorcerer level). */
const HIT_POINTS_PER_CLASS_LEVEL: Record<string, { classId: string; amount: number }> = {
  'draconic-resilience': { classId: 'sorcerer', amount: 1 },
};
const UNARMOURED_DEFENCES: Record<string, UnarmouredDefence> = {
  'unarmoured-defence-barbarian': 'barbarian',
  'unarmoured-defence-monk': 'monk',
  'draconic-resilience': 'draconic',
};
/** Monk speed without armour or shield, by Monk level: +3 m at 2, +4.5 m at 6, +6 m at 10. */
const UNARMOURED_MOVEMENT: [number, number][] = [
  [10, 6],
  [6, 4.5],
  [2, 3],
];

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
  /** How the class gets its spells (see the dataset's `preparation`). */
  preparation: 'known' | 'spellbook' | 'whole-list';
  /** Spells prepared each day, for spellbook and whole-list casters. */
  prepares?: number;
  /** Highest spell level this class alone can cast. */
  maxSpellLevel: number;
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
  origin?: { id: string; name: string };
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
  /** The act whose planned gear is worn; absent means no gear at all. */
  act?: Act;
  /** Ability scores, including gear. */
  abilityScores: Record<Ability, number>;
  abilityModifiers: Record<Ability, number>;
  proficiencyBonus: number;
  hitPoints: number;
  armourClass: number;
  /** What the Armour Class is made of, e.g. armour, Dexterity, shield, rings. */
  armourClassParts: ArmourClassPart[];
  savingThrows: Ability[];
  /** Total saving throw bonus per ability (modifier, plus proficiency where proficient). */
  savingThrowBonuses: Record<Ability, number>;
  skills: Skill[];
  expertise: Skill[];
  /** Total check bonus per skill (modifier, plus proficiency, doubled with expertise). */
  skillBonuses: Record<Skill, number>;
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

/**
 * The character sheet a build produces, wearing the gear planned for `act` if one is given.
 * Invalid answers and items are skipped; see `validateBuild` and `equipmentIssues`.
 */
export function deriveCharacter(
  build: Build,
  data: GameData,
  { act }: { act?: Act } = {},
): DerivedCharacter {
  const { index, state } = walkBuild(build, data);
  const level = build.levels.length;
  const prof = proficiencyBonus(level);
  const gear = equippedItems(act ? build.equipment?.[act] : undefined, data);
  const worn = Object.values(gear);

  const abilityScores = applyAbilityEffects(
    Object.fromEntries(
      ABILITIES.map((a) => [
        a,
        Math.min(
          20,
          build.abilities.base[a] + (build.abilities.racialBonus[a] ?? 0) + state.abilityBonus[a],
        ),
      ]),
    ) as Record<Ability, number>,
    gear,
  );
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
  for (const id of effectIds) {
    const perClass = HIT_POINTS_PER_CLASS_LEVEL[id];
    if (perClass) hitPoints += perClass.amount * (state.classLevels.get(perClass.classId) ?? 0);
  }

  const origin = index.origins.get(build.originId ?? 'custom');
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
  const gearBonus = (get: (item: (typeof worn)[number]) => number | undefined) =>
    worn.reduce((sum, item) => sum + (get(item) ?? 0), 0);
  const acParts = armourClassParts(gear, abilityModifiers, {
    feats: featIds,
    fightingStyles: state.options.get('fighting-styles') ?? [],
    unarmouredDefences: effectIds.flatMap((id) => UNARMOURED_DEFENCES[id] ?? []),
  });

  // Speed from class features depends on what is worn (nothing, without an act).
  const bodyArmour = gear.armour?.kind === 'armour' ? gear.armour.proficiency : null;
  const shield = gear.meleeOff?.kind === 'shield';
  let classSpeed = 0;
  if (effectIds.includes('fast-movement') && bodyArmour !== 'heavy') classSpeed += 3;
  if (effectIds.includes('unarmoured-movement') && !bodyArmour && !shield) {
    const monk = state.classLevels.get('monk') ?? 0;
    classSpeed += UNARMOURED_MOVEMENT.find(([lvl]) => monk >= lvl)?.[1] ?? 0;
  }
  // Jack of All Trades: half proficiency (rounded down) on checks without proficiency.
  const jack = effectIds.includes('jack-of-all-trades') ? Math.floor(prof / 2) : 0;

  const optional = <K extends string, V>(key: K, value: V | undefined) =>
    (value === undefined ? {} : { [key]: value }) as Partial<Record<K, V>>;

  return {
    level,
    classes,
    ...optional('origin', named(origin)),
    ...optional('race', named(race)),
    ...optional('subrace', named(subrace)),
    ...optional('background', named(background)),
    ...optional('size', race?.size),
    ...optional('act', act),
    speed:
      (subrace?.speed ?? race?.speed ?? 9) +
      effectIds.reduce((sum, id) => sum + (SPEED_BONUS[id] ?? 0), 0) +
      classSpeed,
    darkvision: Math.max(0, ...effectIds.map((id) => DARKVISION_RANGE[id] ?? 0)),
    abilityScores,
    abilityModifiers,
    proficiencyBonus: prof,
    hitPoints,
    armourClass: acParts.reduce((sum, part) => sum + part.value, 0),
    armourClassParts: acParts,
    savingThrows: ABILITIES.filter((a) => state.savingThrows.has(a)),
    savingThrowBonuses: Object.fromEntries(
      ABILITIES.map((a) => [
        a,
        abilityModifiers[a] +
          (state.savingThrows.has(a) ? prof : 0) +
          gearBonus(
            (item) => (item.savingThrowBonus?.all ?? 0) + (item.savingThrowBonus?.[a] ?? 0),
          ),
      ]),
    ) as Record<Ability, number>,
    skillBonuses: Object.fromEntries(
      SKILLS.map((skill) => [
        skill,
        abilityModifiers[SKILL_ABILITIES[skill]] +
          (state.skills.has(skill) ? prof : jack) +
          (state.expertise.has(skill) ? prof : 0) +
          gearBonus((item) => item.skillBonus?.[skill]),
      ]),
    ) as Record<Skill, number>,
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
    casters: casters.map(({ classId, spellcasting, level: classLevel }) => {
      const preparation = spellcasting.preparation ?? 'known';
      const modifier = abilityModifiers[spellcasting.ability];
      // Paladins prepare half their level; Clerics, Druids and Wizards their full level.
      const prepared =
        (spellcasting.kind === 'half' ? Math.floor(classLevel / 2) : classLevel) + modifier;
      return {
        classId,
        ability: spellcasting.ability,
        saveDc: 8 + prof + modifier,
        attackBonus: prof + modifier,
        preparation,
        ...(preparation === 'known' ? {} : { prepares: Math.max(1, prepared) }),
        maxSpellLevel: maxSpellLevel(spellcasting, classLevel),
      };
    }),
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
