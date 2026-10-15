import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { type Party, migrateParty } from '@bg3planner/rules';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { PartyRow, PartyStore } from '../party-store';

const ID_PATTERN = /^[A-Za-z0-9_-]{12}$/;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function tokenMatches(token: string, hash: string): boolean {
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function bearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined;
}

/** A stored party, upgraded to the current format if it was saved in an older one. */
function readParty(row: PartyRow): Party {
  const result = migrateParty(JSON.parse(row.data));
  if (!result.ok) throw new Error(`Stored party ${row.id} is unreadable`);
  return result.party;
}

const view = (row: PartyRow) => ({
  id: row.id,
  party: readParty(row),
  revision: row.revision,
  updatedAt: row.updatedAt,
});

export interface PartyRoutesOptions {
  store: PartyStore;
}

/**
 * Parties anyone with the link can read and only the holder of the edit token can change.
 * Creating a party returns its edit token once; the server keeps only a hash.
 */
export const partyRoutes: FastifyPluginAsync<PartyRoutesOptions> = async (app, { store }) => {
  const notFound = (reply: FastifyReply) =>
    reply.code(404).send({ error: 'No party has this link.' });

  /** The party's row if the request may edit it; otherwise sends the error and returns undefined. */
  const authorise = (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const row = ID_PATTERN.test(request.params.id) ? store.get(request.params.id) : undefined;
    if (!row) {
      notFound(reply);
      return undefined;
    }
    const token = bearerToken(request);
    if (!token) {
      reply.code(401).send({ error: 'Editing a shared party needs its edit token.' });
      return undefined;
    }
    if (!tokenMatches(token, row.editTokenHash)) {
      reply.code(403).send({ error: 'This edit token does not belong to this party.' });
      return undefined;
    }
    return row;
  };

  app.post('/parties', async (request, reply) => {
    const result = migrateParty(request.body);
    if (!result.ok)
      return reply.code(400).send({ error: 'Not a valid party.', issues: result.issues });

    const id = randomBytes(9).toString('base64url');
    const editToken = randomBytes(24).toString('base64url');
    const row = store.create(id, hashToken(editToken), JSON.stringify(result.party));
    return reply.code(201).send({ ...view(row), editToken });
  });

  app.get<{ Params: { id: string } }>('/parties/:id', async (request, reply) => {
    const row = ID_PATTERN.test(request.params.id) ? store.get(request.params.id) : undefined;
    return row ? view(row) : notFound(reply);
  });

  app.put<{ Params: { id: string }; Body: { party?: unknown; revision?: unknown } }>(
    '/parties/:id',
    async (request, reply) => {
      const row = authorise(request, reply);
      if (!row) return reply;

      const { party, revision } = request.body ?? {};
      if (!Number.isInteger(revision)) {
        return reply.code(400).send({ error: 'Say which revision these changes are based on.' });
      }
      const result = migrateParty(party);
      if (!result.ok)
        return reply.code(400).send({ error: 'Not a valid party.', issues: result.issues });

      const saved = store.update(row.id, JSON.stringify(result.party), revision as number);
      if (saved.status === 'not-found') return notFound(reply);
      if (saved.status === 'conflict') {
        return reply.code(409).send({
          error: 'The party was changed somewhere else since this copy was loaded.',
          current: view(saved.row),
        });
      }
      return { revision: saved.row.revision, updatedAt: saved.row.updatedAt };
    },
  );

  app.delete<{ Params: { id: string } }>('/parties/:id', async (request, reply) => {
    const row = authorise(request, reply);
    if (!row) return reply;
    store.delete(row.id);
    return reply.code(204).send();
  });
};
