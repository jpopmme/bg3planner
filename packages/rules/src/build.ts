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

export const buildSchema = z
  .object({
    /** Dataset the build was made with (see GAME_DATA_VERSION). */
    gameDataVersion: z.string(),
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
  })
  .strict();

export type Answer = z.infer<typeof answerSchema>;
export type LevelEntry = z.infer<typeof levelEntrySchema>;
export type Build = z.infer<typeof buildSchema>;
