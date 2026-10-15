import type { Choice, GameData, LevelGrant, Spell, SpellSource, Spellcasting } from './schema';

/** Highest spell level castable at `classLevel`, or 0 before the class can cast. */
export function maxSpellLevel(spellcasting: Spellcasting, classLevel: number): number {
  if (spellcasting.kind === 'pact') return spellcasting.pactSlots[classLevel - 1]?.level ?? 0;
  return spellcasting.slots[classLevel - 1]?.length ?? 0;
}

/**
 * Cross-reference checks that a schema cannot express: unknown ids, impossible choices, and
 * per-level picks that disagree with the "known" tables. Returns one message per problem.
 */
export function findIntegrityIssues(data: GameData): string[] {
  const issues: string[] = [];

  const reportDuplicates = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) issues.push(`duplicate ${kind} id "${id}"`);
      seen.add(id);
    }
  };
  reportDuplicates(
    'class',
    data.classes.map((c) => c.id),
  );
  reportDuplicates(
    'subclass',
    data.subclasses.map((s) => s.id),
  );
  reportDuplicates(
    'feature',
    data.features.map((f) => f.id),
  );
  reportDuplicates(
    'option group',
    data.optionGroups.map((g) => g.id),
  );
  reportDuplicates(
    'spell',
    data.spells.map((s) => s.id),
  );
  for (const group of data.optionGroups) {
    reportDuplicates(
      `option in "${group.id}"`,
      group.options.map((o) => o.id),
    );
  }

  const spellsById = new Map(data.spells.map((s) => [s.id, s]));
  const featureIds = new Set(data.features.map((f) => f.id));
  const groupsById = new Map(data.optionGroups.map((g) => [g.id, g]));
  const spellLists = new Set(data.spells.flatMap((s) => s.classes));
  const usedFeatures = new Set<string>();
  const usedGroups = new Set<string>();

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

  const checkChoice = (
    where: string,
    choice: Choice,
    classLevel: number,
    caster: Spellcasting | undefined,
  ) => {
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
        const available = group.options.filter((o) => (o.minClassLevel ?? 1) <= classLevel);
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
        } else if (!(choice.type === 'spell' && choice.extra)) {
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
            (!choice.schools || choice.schools.includes(s.school)),
        );
        if (pool && pool.length < count) {
          issues.push(`${where}: picks ${count} spells from a pool of ${pool.length}`);
        }
        return;
      }
    }
  };

  const checkLevels = (owner: string, levels: LevelGrant[], caster: Spellcasting | undefined) => {
    for (const lvl of levels) {
      const where = `${owner} level ${lvl.level}`;
      for (const id of lvl.features) {
        usedFeatures.add(id);
        if (!featureIds.has(id)) issues.push(`${where}: unknown feature "${id}"`);
      }
      lvl.choices.forEach((choice, i) =>
        checkChoice(`${where} choice ${i + 1} (${choice.type})`, choice, lvl.level, caster),
      );
    }
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

  for (const cls of data.classes) {
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

  for (const id of featureIds) {
    if (!usedFeatures.has(id)) issues.push(`feature "${id}" is never granted`);
  }
  for (const id of groupsById.keys()) {
    if (!usedGroups.has(id)) issues.push(`option group "${id}" is never offered`);
  }

  return issues;
}
