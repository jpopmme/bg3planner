import { ABILITIES, MAX_LEVEL, SKILLS } from '@bg3planner/shared';
import { z } from 'zod';

/** Kebab-case slug, e.g. `eldritch-knight`. See `slugify` in @bg3planner/shared. */
export const idSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be a kebab-case slug');

const abilitySchema = z.enum(ABILITIES);
const skillSchema = z.enum(SKILLS as [string, ...string[]]);
const positiveInt = z.number().int().positive();
const classLevelSchema = z.number().int().min(1).max(MAX_LEVEL);
const spellLevelSchema = z.number().int().min(0).max(9);

export const SPELL_SCHOOLS = [
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
] as const;
export const spellSchoolSchema = z.enum(SPELL_SCHOOLS);

// ---------------------------------------------------------------------------
// Spells (generated from bg3.wiki, see scripts/generate-spells.ts)
// ---------------------------------------------------------------------------

export const spellSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  level: spellLevelSchema,
  school: spellSchoolSchema,
  /** Ids of the classes whose spell list contains this spell. */
  classes: z.array(idSchema),
  concentration: z.boolean(),
  ritual: z.boolean(),
  actionType: z.enum(['action', 'bonus', 'reaction']),
  /** Page title on bg3.wiki. */
  wikiPage: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Features and option groups
// ---------------------------------------------------------------------------

/** Something a class or subclass level grants automatically. */
export const featureSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  /** `action` covers anything used from the hotbar: actions, bonus actions and free actions. */
  kind: z.enum(['passive', 'action', 'reaction']),
});

/** One pick in an option group (a fighting style, an invocation, a manoeuvre, ...). */
export const optionSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  /** Lowest level of the granting class at which this option can be picked. */
  minClassLevel: classLevelSchema.optional(),
});

export const optionGroupSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  options: z.array(optionSchema).min(1),
});

// ---------------------------------------------------------------------------
// Per-level choices
// ---------------------------------------------------------------------------

/** Where a spell choice draws from: a class spell list, or a fixed set of spells. */
export const spellSourceSchema = z.union([
  z.object({ list: idSchema }).strict(),
  z.object({ spells: z.array(idSchema).min(1) }).strict(),
]);

const spellFilter = {
  from: spellSourceSchema,
  minLevel: spellLevelSchema.optional(),
  maxLevel: spellLevelSchema,
  schools: z.array(spellSchoolSchema).min(1).optional(),
  /** Short UI hint, e.g. "Any school" or "Mystic Arcanum". */
  label: z.string().optional(),
};

export const choiceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('subclass') }).strict(),
  /** A feat or an Ability Improvement. */
  z.object({ type: z.literal('feat') }).strict(),
  z.object({ type: z.literal('option'), group: idSchema, count: positiveInt }).strict(),
  z
    .object({
      type: z.literal('cantrip'),
      count: positiveInt,
      from: spellSourceSchema,
      label: z.string().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('spell'),
      count: positiveInt,
      ...spellFilter,
      /** Learned on top of "spells known" (e.g. Mystic Arcanum). */
      extra: z.literal(true).optional(),
    })
    .strict(),
  /** Optionally swap one known spell for another. */
  z.object({ type: z.literal('replace-spell'), ...spellFilter }).strict(),
]);

export const levelSchema = z
  .object({
    level: classLevelSchema,
    features: z.array(idSchema),
    choices: z.array(choiceSchema),
    /** Totals (not increments) of class resources from this level on, e.g. superiority dice. */
    resources: z.record(idSchema, positiveInt).optional(),
    /** Skill proficiencies granted outright. */
    skills: z.array(skillSchema).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Spellcasting
// ---------------------------------------------------------------------------

const perClassLevel = <T extends z.ZodType>(item: T) => z.array(item).length(MAX_LEVEL);

/**
 * Slots per spell level for one class level: `[2, 1]` = two 1st-level and one 2nd-level slot.
 * `[]` before the class can cast.
 */
const slotRowSchema = z.array(z.number().int().nonnegative()).max(9);

const knownCounts = {
  ability: abilitySchema,
  spellList: idSchema,
  /** Cantrips known at each class level (index 0 = level 1). */
  cantripsKnown: perClassLevel(z.number().int().nonnegative()),
  /** Leveled spells known at each class level, excluding extras such as Mystic Arcanum. */
  spellsKnown: perClassLevel(z.number().int().nonnegative()),
};

export const spellcastingSchema = z.discriminatedUnion('kind', [
  z
    .object({
      /**
       * Effective spellcaster level (ESL) is class level × 1, ½ or ⅓. BG3 rounds a single class's
       * ESL up, but sums multiclass fractions first and rounds the total down. Pact Magic adds nothing.
       */
      kind: z.enum(['full', 'half', 'third']),
      ...knownCounts,
      /** Slots for a single-class character, by class level. */
      slots: perClassLevel(slotRowSchema),
    })
    .strict(),
  z
    .object({
      /** Warlock Pact Magic: separate slots that never combine with other classes'. */
      kind: z.literal('pact'),
      ...knownCounts,
      pactSlots: perClassLevel(
        z.object({ count: positiveInt, level: z.number().int().min(1).max(5) }).strict(),
      ),
    })
    .strict(),
]);

// ---------------------------------------------------------------------------
// Classes and subclasses
// ---------------------------------------------------------------------------

const proficienciesSchema = z
  .object({
    armour: z.array(z.enum(['light', 'medium', 'heavy'])),
    shields: z.boolean(),
    weapons: z.array(z.enum(['simple', 'martial'])),
  })
  .strict();

const patchSchema = z.string().regex(/^patch-\d+$/);

export const classSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    hitPoints: z.object({ firstLevel: positiveInt, perLevel: positiveInt }).strict(),
    savingThrows: z.array(abilitySchema).length(2),
    skillChoices: z.object({ count: positiveInt, from: z.array(skillSchema).min(1) }).strict(),
    proficiencies: proficienciesSchema,
    /** What taking this class as a second (or later) class grants. */
    multiclassProficiencies: proficienciesSchema,
    subclassLevel: classLevelSchema,
    spellcasting: spellcastingSchema.optional(),
    /** Exactly one entry per class level, in order. */
    levels: z.array(levelSchema).length(MAX_LEVEL),
  })
  .strict()
  .superRefine((cls, ctx) => {
    cls.levels.forEach((lvl, i) => {
      if (lvl.level !== i + 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['levels', i, 'level'],
          message: `expected level ${i + 1}, got ${lvl.level}`,
        });
      }
    });
  });

export const subclassSchema = z
  .object({
    id: idSchema,
    classId: idSchema,
    name: z.string().min(1),
    /** Game patch that added this subclass, if it was not in the launch version. */
    addedIn: patchSchema.optional(),
    spellcasting: spellcastingSchema.optional(),
    /** Spells added to the class's spell list once the class reaches `classLevel`. */
    expandedSpells: z
      .array(z.object({ classLevel: classLevelSchema, spells: z.array(idSchema).min(1) }).strict())
      .optional(),
    /** Only the class levels where the subclass adds something, in ascending order. */
    levels: z.array(levelSchema),
  })
  .strict()
  .superRefine((sub, ctx) => {
    sub.levels.forEach((lvl, i) => {
      const prev = sub.levels[i - 1];
      if (prev && prev.level >= lvl.level) {
        ctx.addIssue({
          code: 'custom',
          path: ['levels', i, 'level'],
          message: 'levels must be strictly ascending',
        });
      }
    });
  });

/** Spell slots for a multiclass caster, indexed by combined caster level (index 0 = level 1). */
export const slotTableSchema = perClassLevel(slotRowSchema);

export const gameDataSchema = z
  .object({
    version: patchSchema,
    classes: z.array(classSchema),
    subclasses: z.array(subclassSchema),
    features: z.array(featureSchema),
    optionGroups: z.array(optionGroupSchema),
    spells: z.array(spellSchema),
    multiclassSpellSlots: slotTableSchema,
  })
  .strict();

export type Spell = z.infer<typeof spellSchema>;
export type SpellSchool = z.infer<typeof spellSchoolSchema>;
export type SpellSource = z.infer<typeof spellSourceSchema>;
export type Feature = z.infer<typeof featureSchema>;
export type Option = z.infer<typeof optionSchema>;
export type OptionGroup = z.infer<typeof optionGroupSchema>;
export type Choice = z.infer<typeof choiceSchema>;
export type LevelGrant = z.infer<typeof levelSchema>;
export type Spellcasting = z.infer<typeof spellcastingSchema>;
export type ClassDef = z.infer<typeof classSchema>;
export type SubclassDef = z.infer<typeof subclassSchema>;
export type GameData = z.infer<typeof gameDataSchema>;
