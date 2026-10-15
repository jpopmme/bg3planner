import { ABILITIES, MAX_LEVEL } from '@bg3planner/shared';
import { idSchema } from '@bg3planner/gamedata';
import { z } from 'zod';

const abilitySchema = z.enum(ABILITIES);

/**
 * The player's answer to one choice:
 * - a list of picked ids (subclass, feat, options, cantrips, spells, skills, weapon types);
 * - a spell swap (`replace-spell`);
 * - points per ability (`ability-increase`).
 */
export const answerSchema = z.union([
  z.array(z.string()),
  z.object({ from: idSchema, to: idSchema }).strict(),
  z.partialRecord(abilitySchema, z.number().int().positive()),
]);

/**
 * One character level. `answers` is keyed by where each choice comes from, counted within this
 * level: `class:0` is the first choice of this class level, `subclass:0` the subclass's, `feat:0`
 * the chosen feat's. Level 1 also holds `class-skills`, `race:N` and `subrace:N`.
 */
export const levelEntrySchema = z
  .object({
    classId: idSchema,
    answers: z.record(z.string(), answerSchema),
  })
  .strict();

/** The game's three acts; each has its own loadout, since gear changes as the story goes on. */
export const ACTS = ['act1', 'act2', 'act3'] as const;
export type Act = (typeof ACTS)[number];

/** Where an imported build came from, and what the importer could not settle. */
export const buildSourceSchema = z
  .object({
    kind: z.literal('gamestegy'),
    url: z.string().url().optional(),
    /** The guide's title. */
    title: z.string().max(200),
    importedAt: z.string(),
    notes: z
      .array(
        z
          .object({
            /** Character level the note is about; absent for character creation. */
            level: z.number().int().min(1).max(MAX_LEVEL).optional(),
            /** Act whose gear the note is about. */
            act: z.enum(ACTS).optional(),
            message: z.string().max(500),
          })
          .strict(),
      )
      .max(200),
  })
  .strict();

/** Equipment slots, in the order the game's inventory shows them. */
export const EQUIP_SLOTS = [
  'head',
  'cloak',
  'armour',
  'gloves',
  'boots',
  'amulet',
  'ring1',
  'ring2',
  'meleeMain',
  'meleeOff',
  'rangedMain',
  'rangedOff',
] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

/** Item id per slot. */
export const loadoutSchema = z.partialRecord(z.enum(EQUIP_SLOTS), idSchema);
export const equipmentSchema = z.partialRecord(z.enum(ACTS), loadoutSchema);

export const buildSchema = z
  .object({
    /** Dataset the build was made with (see GAME_DATA_VERSION). */
    gameDataVersion: z.string(),
    /** Who the character is (see the dataset's origins); absent means a custom character. */
    originId: idSchema.optional(),
    raceId: idSchema,
    subraceId: idSchema.optional(),
    backgroundId: idSchema,
    abilities: z
      .object({
        /** Point-buy scores before any bonus. */
        base: z.record(abilitySchema, z.number().int()),
        /** The free +2 and +1 every race gets at character creation. */
        racialBonus: z.partialRecord(abilitySchema, z.union([z.literal(1), z.literal(2)])),
      })
      .strict(),
    levels: z.array(levelEntrySchema).min(1).max(MAX_LEVEL),
    /** Planned gear per act; absent until the player plans any. */
    equipment: equipmentSchema.optional(),
    source: buildSourceSchema.optional(),
  })
  .strict();

export type Answer = z.infer<typeof answerSchema>;
export type LevelEntry = z.infer<typeof levelEntrySchema>;
export type Build = z.infer<typeof buildSchema>;
export type BuildSource = z.infer<typeof buildSourceSchema>;
export type Loadout = z.infer<typeof loadoutSchema>;
export type Equipment = z.infer<typeof equipmentSchema>;
