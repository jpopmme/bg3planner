import { SKILLS } from '@bg3planner/shared';
import type {
  Choice,
  Feat,
  GameData,
  LevelGrant,
  Race,
  Spell,
  SpellSource,
  Spellcasting,
  Subrace,
} from './schema';

/** Highest spell level castable at `classLevel`, or 0 before the class can cast. */
export function maxSpellLevel(spellcasting: Spellcasting, classLevel: number): number {
  if (spellcasting.kind === 'pact') return spellcasting.pactSlots[classLevel - 1]?.level ?? 0;
  return spellcasting.slots[classLevel - 1]?.length ?? 0;
}

/**
 * How spells chosen in a given place are cast: with a class's slots, innately (races and feats,
 * which have their own once-per-rest rules), or not at all.
 */
type Caster = Spellcasting | 'innate' | undefined;

/** Race, subrace and feat fields that grant things. */
type Grant = Pick<
  Race | Subrace | Feat,
  'features' | 'weaponTypes' | 'innateSpells' | 'resources' | 'choices'
>;

/**
 * Cross-reference checks that a schema cannot express: unknown ids, impossible choices, and
 * per-level picks that disagree with the "known" tables. Returns one message per problem.
 */
export function findIntegrityIssues(data: GameData): string[] {
  const issues: string[] = [];

  const subraces = data.races.flatMap((r) => r.subraces);
  const idLists: [string, { id: string }[]][] = [
    ['class', data.classes],
    ['subclass', data.subclasses],
    ['race', data.races],
    ['subrace', subraces],
    ['background', data.backgrounds],
    ['feat', data.feats],
    ['origin', data.origins],
    ['feature', data.features],
    ['option group', data.optionGroups],
    ['spell', data.spells],
    ['weapon type', data.weaponTypes],
    ['item', data.items],
    ...data.optionGroups.map((g): [string, { id: string }[]] => [`option in "${g.id}"`, g.options]),
  ];
  for (const [kind, items] of idLists) {
    const seen = new Set<string>();
    for (const { id } of items) {
      if (seen.has(id)) issues.push(`duplicate ${kind} id "${id}"`);
      seen.add(id);
    }
  }

  const spellsById = new Map(data.spells.map((s) => [s.id, s]));
  const featureIds = new Set(data.features.map((f) => f.id));
  const groupsById = new Map(data.optionGroups.map((g) => [g.id, g]));
  const weaponTypeIds = new Set(data.weaponTypes.map((w) => w.id));
  for (const item of data.items) {
    if (item.kind === 'weapon' && !weaponTypeIds.has(item.weaponType)) {
      issues.push(`item "${item.id}" has unknown weapon type "${item.weaponType}"`);
    }
  }
  const spellLists = new Set(data.spells.flatMap((s) => s.classes));
  const classResources = new Set(
    [...data.classes, ...data.subclasses].flatMap((c) =>
      c.levels.flatMap((l) => Object.keys(l.resources ?? {})),
    ),
  );
  const usedFeatures = new Set<string>();
  const usedGroups = new Set<string>();

  const useFeatures = (where: string, ids: string[] | undefined) => {
    for (const id of ids ?? []) {
      usedFeatures.add(id);
      if (!featureIds.has(id)) issues.push(`${where}: unknown feature "${id}"`);
    }
  };

  /** Spells a source can offer, or undefined (with an issue reported) if the source is broken. */
  const candidates = (where: string, from: SpellSource): Spell[] | undefined => {
    if ('list' in from) {
      if (!spellLists.has(from.list)) {
        issues.push(`${where}: no spells belong to list "${from.list}"`);
        return undefined;
      }
      return data.spells.filter((s) => s.classes.includes(from.list));
    }
    const found: Spell[] = [];
    for (const id of from.spells) {
      const spell = spellsById.get(id);
      if (spell) found.push(spell);
      else issues.push(`${where}: unknown spell "${id}"`);
    }
    return found;
  };

  const checkChoice = (where: string, choice: Choice, classLevel: number, caster: Caster) => {
    switch (choice.type) {
      case 'subclass':
      case 'feat':
        return;
      case 'option': {
        usedGroups.add(choice.group);
        const group = groupsById.get(choice.group);
        if (!group) {
          issues.push(`${where}: unknown option group "${choice.group}"`);
          return;
        }
        for (const id of choice.only ?? []) {
          if (!group.options.some((o) => o.id === id)) {
            issues.push(`${where}: "${id}" is not an option of "${group.id}"`);
          }
        }
        const available = group.options.filter(
          (o) =>
            (o.minClassLevel ?? 1) <= classLevel && (!choice.only || choice.only.includes(o.id)),
        );
        if (available.length < choice.count) {
          issues.push(
            `${where}: picks ${choice.count} from "${group.id}" but only ${available.length} are available`,
          );
        }
        return;
      }
      case 'cantrip': {
        if ('list' in choice.from && !caster) {
          issues.push(`${where}: cantrip list choice without spellcasting`);
        }
        const pool = candidates(where, choice.from)?.filter((s) => s.level === 0);
        if (pool && pool.length < choice.count) {
          issues.push(`${where}: picks ${choice.count} cantrips from a pool of ${pool.length}`);
        }
        return;
      }
      case 'spell':
      case 'replace-spell': {
        const minLevel = choice.minLevel ?? 1;
        if (minLevel > choice.maxLevel) issues.push(`${where}: minLevel is above maxLevel`);
        if (!caster) {
          issues.push(`${where}: spell choice without spellcasting`);
        } else if (caster !== 'innate' && !(choice.type === 'spell' && choice.extra)) {
          const castable = maxSpellLevel(caster, classLevel);
          if (choice.maxLevel > castable) {
            issues.push(
              `${where}: allows level ${choice.maxLevel} spells but slots reach ${castable}`,
            );
          }
        }
        const count = choice.type === 'spell' ? choice.count : 1;
        const pool = candidates(where, choice.from)?.filter(
          (s) =>
            s.level >= minLevel &&
            s.level <= choice.maxLevel &&
            (!choice.schools || (s.school !== null && choice.schools.includes(s.school))),
        );
        if (pool && pool.length < count) {
          issues.push(`${where}: picks ${count} spells from a pool of ${pool.length}`);
        }
        return;
      }
      case 'ability-increase': {
        if (choice.maxPerAbility > choice.points) {
          issues.push(`${where}: maxPerAbility is above points`);
        }
        if (new Set(choice.from).size * choice.maxPerAbility < choice.points) {
          issues.push(`${where}: cannot spend ${choice.points} points on the listed abilities`);
        }
        return;
      }
      case 'skill': {
        const pool = choice.from ?? SKILLS;
        if (pool.length < choice.count) {
          issues.push(`${where}: picks ${choice.count} skills from a pool of ${pool.length}`);
        }
        return;
      }
      case 'weapon-proficiency': {
        if (weaponTypeIds.size < choice.count) {
          issues.push(`${where}: picks ${choice.count} of ${weaponTypeIds.size} weapon types`);
        }
        return;
      }
      case 'expertise': {
        const pool = choice.from ?? SKILLS;
        if (pool.length < choice.count) {
          issues.push(`${where}: picks ${choice.count} skills from a pool of ${pool.length}`);
        }
        if (choice.grantsProficiency && !choice.from) {
          issues.push(`${where}: grantsProficiency needs a "from" list`);
        }
        return;
      }
    }
  };

  const checkLevels = (owner: string, levels: LevelGrant[], caster: Caster) => {
    for (const lvl of levels) {
      const where = `${owner} level ${lvl.level}`;
      useFeatures(where, lvl.features);
      for (const id of lvl.spells ?? []) {
        const spell = spellsById.get(id);
        if (!spell) issues.push(`${where}: unknown spell "${id}"`);
        // Without spellcasting the spell is innate, usable at once.
        else if (caster && caster !== 'innate' && spell.level > maxSpellLevel(caster, lvl.level)) {
          issues.push(`${where}: grants "${id}" (level ${spell.level}) before it can be cast`);
        }
      }
      lvl.choices.forEach((choice, i) =>
        checkChoice(`${where} choice ${i + 1} (${choice.type})`, choice, lvl.level, caster),
      );
    }
  };

  /** Races, subraces and feats: not tied to a class level, and their spells are innate. */
  const checkGrant = (owner: string, grant: Grant) => {
    useFeatures(owner, grant.features);
    for (const id of grant.weaponTypes ?? []) {
      if (!weaponTypeIds.has(id)) issues.push(`${owner}: unknown weapon type "${id}"`);
    }
    for (const { characterLevel, spell } of grant.innateSpells ?? []) {
      if (!spellsById.has(spell)) {
        issues.push(`${owner}: unknown spell "${spell}" at level ${characterLevel}`);
      }
    }
    for (const id of Object.keys(grant.resources ?? {})) {
      if (!classResources.has(id)) issues.push(`${owner}: unknown resource "${id}"`);
    }
    grant.choices?.forEach((choice, i) => {
      if (choice.type === 'subclass' || choice.type === 'feat' || choice.type === 'replace-spell') {
        issues.push(`${owner} choice ${i + 1}: "${choice.type}" only makes sense on a class level`);
      }
      checkChoice(`${owner} choice ${i + 1} (${choice.type})`, choice, 12, 'innate');
    });
  };

  /** Cumulative cantrip and spell picks must match the caster's known-count tables. */
  const checkKnownCounts = (owner: string, levels: LevelGrant[], caster: Spellcasting) => {
    let cantrips = 0;
    let spells = 0;
    for (let level = 1; level <= caster.cantripsKnown.length; level++) {
      for (const choice of levels.find((l) => l.level === level)?.choices ?? []) {
        if (choice.type === 'cantrip') cantrips += choice.count;
        if (choice.type === 'spell' && !choice.extra) spells += choice.count;
      }
      if (cantrips !== caster.cantripsKnown[level - 1]) {
        issues.push(
          `${owner} level ${level}: ${cantrips} cantrip picks so far, table says ${caster.cantripsKnown[level - 1]}`,
        );
      }
      if (spells !== caster.spellsKnown[level - 1]) {
        issues.push(
          `${owner} level ${level}: ${spells} spell picks so far, table says ${caster.spellsKnown[level - 1]}`,
        );
      }
    }
  };

  const classesById = new Map(data.classes.map((c) => [c.id, c]));

  const checkWeaponTypes = (where: string, ids: string[] | undefined) => {
    for (const id of ids ?? []) {
      if (!weaponTypeIds.has(id)) issues.push(`${where}: unknown weapon type "${id}"`);
    }
  };

  for (const cls of data.classes) {
    checkWeaponTypes(cls.name, cls.proficiencies.weaponTypes);
    checkWeaponTypes(`${cls.name} (multiclass)`, cls.multiclassProficiencies.weaponTypes);
    for (const lvl of cls.levels) {
      checkWeaponTypes(`${cls.name} level ${lvl.level}`, lvl.proficiencies?.weaponTypes);
    }
    checkLevels(cls.name, cls.levels, cls.spellcasting);
    if (cls.spellcasting) checkKnownCounts(cls.name, cls.levels, cls.spellcasting);

    const subclassChoiceLevels = cls.levels
      .filter((l) => l.choices.some((c) => c.type === 'subclass'))
      .map((l) => l.level);
    if (subclassChoiceLevels.length !== 1 || subclassChoiceLevels[0] !== cls.subclassLevel) {
      issues.push(
        `${cls.name}: subclass must be chosen exactly once, at level ${cls.subclassLevel} (found at ${subclassChoiceLevels.join(', ') || 'none'})`,
      );
    }
    if (!data.subclasses.some((s) => s.classId === cls.id)) {
      issues.push(`${cls.name}: has no subclasses`);
    }
  }

  for (const sub of data.subclasses) {
    const cls = classesById.get(sub.classId);
    if (!cls) {
      issues.push(`${sub.name}: unknown class "${sub.classId}"`);
      continue;
    }
    if (sub.spellcasting && cls.spellcasting) {
      issues.push(`${sub.name}: both the subclass and its class define spellcasting`);
    }
    const early = sub.levels.find((l) => l.level < cls.subclassLevel);
    if (early) {
      issues.push(
        `${sub.name}: grants something at level ${early.level}, before the subclass is chosen`,
      );
    }

    const caster = sub.spellcasting ?? cls.spellcasting;
    for (const lvl of sub.levels) {
      checkWeaponTypes(`${sub.name} level ${lvl.level}`, lvl.proficiencies?.weaponTypes);
    }
    checkLevels(sub.name, sub.levels, caster);
    if (sub.spellcasting) checkKnownCounts(sub.name, sub.levels, sub.spellcasting);

    for (const { classLevel, spells } of sub.expandedSpells ?? []) {
      const where = `${sub.name} expanded spells at level ${classLevel}`;
      if (!caster) {
        issues.push(`${where}: class cannot cast spells`);
        continue;
      }
      for (const id of spells) {
        const spell = spellsById.get(id);
        if (!spell) issues.push(`${where}: unknown spell "${id}"`);
        else if (spell.level < 1 || spell.level > maxSpellLevel(caster, classLevel)) {
          issues.push(`${where}: "${id}" is level ${spell.level}, not castable yet`);
        }
      }
    }
  }

  for (const race of data.races) {
    checkGrant(race.name, race);
    for (const sub of race.subraces) checkGrant(`${race.name} / ${sub.name}`, sub);
  }
  for (const feat of data.feats) checkGrant(`Feat ${feat.name}`, feat);

  const backgroundIds = new Set(data.backgrounds.map((b) => b.id));
  for (const origin of data.origins) {
    const race = data.races.find((r) => r.id === origin.raceId);
    if (origin.raceId && !race) issues.push(`${origin.name}: unknown race "${origin.raceId}"`);
    if (origin.subraceId && !race?.subraces.some((s) => s.id === origin.subraceId)) {
      issues.push(`${origin.name}: "${origin.subraceId}" is not a subrace of ${origin.raceId}`);
    }
    if (race && race.subraces.length > 0 && !origin.subraceId) {
      issues.push(`${origin.name}: fixes the race ${race.name} but not its subrace`);
    }
    if (origin.backgroundId && !backgroundIds.has(origin.backgroundId)) {
      issues.push(`${origin.name}: unknown background "${origin.backgroundId}"`);
    }
  }
  if (!data.origins.some((o) => o.kind === 'custom')) issues.push('no custom origin');

  for (const group of data.optionGroups) {
    for (const option of group.options) {
      const where = `Option ${group.id}/${option.id}`;
      const grants = option.grants;
      useFeatures(where, grants?.features);
      for (const id of grants?.spells ?? []) {
        if (!spellsById.has(id)) issues.push(`${where}: unknown spell "${id}"`);
      }
      for (const id of grants?.weaponTypes ?? []) {
        if (!weaponTypeIds.has(id)) issues.push(`${where}: unknown weapon type "${id}"`);
      }
    }
  }

  for (const id of featureIds) {
    if (!usedFeatures.has(id)) issues.push(`feature "${id}" is never granted`);
  }
  for (const id of groupsById.keys()) {
    if (!usedGroups.has(id)) issues.push(`option group "${id}" is never offered`);
  }

  return issues;
}
