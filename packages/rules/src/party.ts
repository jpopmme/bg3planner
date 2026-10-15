import { z } from 'zod';
import { buildSchema } from './build';
import type { Issue } from './walker';

/**
 * Version of the saved party format. Bump it when the format changes and add a step to
 * `MIGRATIONS` that upgrades the previous version.
 */
export const PARTY_SCHEMA_VERSION = 2;

/** Most characters a roster can hold, and how many can travel together. */
export const MAX_ROSTER = 12;
export const MAX_ACTIVE = 4;

export const memberSchema = z
  .object({
    id: z.string().min(1).max(64),
    name: z.string().max(80),
    build: buildSchema,
  })
  .strict();

export const partySchema = z
  .object({
    schemaVersion: z.literal(PARTY_SCHEMA_VERSION),
    name: z.string().max(80),
    members: z.array(memberSchema).min(1).max(MAX_ROSTER),
    activeMemberIds: z.array(z.string()).max(MAX_ACTIVE),
    notes: z.string().max(5000).optional(),
  })
  .strict()
  .superRefine((party, ctx) => {
    const ids = party.members.map((m) => m.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', path: ['members'], message: 'member ids must be unique' });
    }
    for (const id of party.activeMemberIds) {
      if (!ids.includes(id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['activeMemberIds'],
          message: `"${id}" is not a member`,
        });
      }
    }
  });

export type PartyMember = z.infer<typeof memberSchema>;
export type Party = z.infer<typeof partySchema>;

/** Browsers and Node both provide `crypto.randomUUID`; this package targets neither's typings. */
const newId = () =>
  (globalThis as unknown as { crypto: { randomUUID(): string } }).crypto.randomUUID();

/** A party holding one character. */
export function partyOf(member: Omit<PartyMember, 'id'>, makeId = newId): Party {
  const id = makeId();
  return {
    schemaVersion: PARTY_SCHEMA_VERSION,
    name: '',
    members: [{ id, ...member }],
    activeMemberIds: [id],
  };
}

type Raw = Record<string, unknown>;

/** Upgrade steps, keyed by the version they upgrade from. */
const MIGRATIONS: Record<number, (doc: Raw, makeId: () => string) => Raw> = {
  // Version 1 is the single-character draft the planner saved before parties: `{ name, build }`.
  1: (doc, makeId) =>
    partyOf(
      { name: typeof doc.name === 'string' ? doc.name : '', build: doc.build as never },
      makeId,
    ),
};

/** Version of a raw saved document; documents from before versioning are version 1. */
function versionOf(doc: Raw): number {
  return typeof doc.schemaVersion === 'number' ? doc.schemaVersion : 1;
}

/**
 * Reads a saved party of any known version, upgrading it to the current format.
 * `from` is the version it was saved in.
 */
export function migrateParty(
  input: unknown,
  makeId: () => string = newId,
): { ok: true; party: Party; from: number } | { ok: false; issues: Issue[] } {
  const fail = (message: string) => ({
    ok: false as const,
    issues: [{ severity: 'error' as const, characterLevel: 1, message }],
  });
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return fail('This is not a saved party.');
  }

  let doc = input as Raw;
  const from = versionOf(doc);
  if (from > PARTY_SCHEMA_VERSION) {
    return fail(`This party was saved by a newer version of the planner (format ${from}).`);
  }
  for (let version = from; version < PARTY_SCHEMA_VERSION; version++) {
    const step = MIGRATIONS[version];
    if (!step) return fail(`Saved format ${version} cannot be upgraded.`);
    doc = step(doc, makeId);
  }

  const result = partySchema.safeParse(doc);
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map((i) => ({
        severity: 'error',
        characterLevel: 1,
        message: `${i.path.join('.') || 'party'}: ${i.message}`,
      })),
    };
  }
  return { ok: true, party: result.data, from };
}
