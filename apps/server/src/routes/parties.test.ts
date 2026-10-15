import { type Party, partyOf } from '@bg3planner/rules';
import { hexknight, makeBuild } from '@bg3planner/rules/fixtures';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { PartyStore } from '../party-store';

let store: PartyStore;
let app: ReturnType<typeof buildApp>;

beforeEach(() => {
  store = new PartyStore(':memory:');
  app = buildApp({ store });
});
afterEach(() => app.close());

const party = (name = 'Tav'): Party => partyOf({ name, build: makeBuild() });

async function create(body: unknown = party()) {
  const res = await app.inject({ method: 'POST', url: '/api/parties', payload: body as object });
  return { res, body: res.json() as { id: string; editToken: string; revision: number } };
}

const put = (id: string, payload: unknown, token?: string) =>
  app.inject({
    method: 'PUT',
    url: `/api/parties/${id}`,
    payload: payload as object,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

describe('/api/parties', () => {
  it('creates a party and returns its link id and edit token', async () => {
    const { res, body } = await create();
    expect(res.statusCode).toBe(201);
    expect(body.id).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(body.editToken.length).toBeGreaterThanOrEqual(32);
    expect(body.revision).toBe(1);
  });

  it('never stores the edit token itself', async () => {
    const { body } = await create();
    expect(store.get(body.id)!.editTokenHash).not.toContain(body.editToken);
  });

  it('lets anyone read a party by its id', async () => {
    const saved = party('Hexknight');
    const { body } = await create(saved);
    const res = await app.inject({ method: 'GET', url: `/api/parties/${body.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: body.id, party: saved, revision: 1 });
  });

  it('upgrades an old single-character draft when it is created', async () => {
    const { res, body } = await create({ name: 'Hexknight', build: hexknight });
    expect(res.statusCode).toBe(201);
    const read = await app.inject({ method: 'GET', url: `/api/parties/${body.id}` });
    expect(read.json().party.members[0]).toMatchObject({ name: 'Hexknight', build: hexknight });
  });

  it('upgrades rows saved in an older format when they are read', async () => {
    store.create('oldformat123', 'x', JSON.stringify({ name: 'Old', build: makeBuild() }));
    const res = await app.inject({ method: 'GET', url: '/api/parties/oldformat123' });
    expect(res.json().party).toMatchObject({ schemaVersion: 2, members: [{ name: 'Old' }] });
  });

  it('rejects invalid parties', async () => {
    const { res } = await create({ schemaVersion: 2, name: 'Empty', members: [] });
    expect(res.statusCode).toBe(400);
    expect(res.json().issues[0].message).toMatch(/^members:/);
  });

  it('answers 404 for unknown or malformed ids', async () => {
    for (const id of ['abcdefghijkl', 'short', '../../etc/passwd']) {
      const res = await app.inject({
        method: 'GET',
        url: `/api/parties/${encodeURIComponent(id)}`,
      });
      expect(res.statusCode).toBe(404);
    }
  });

  describe('saving changes', () => {
    it('saves with the edit token and bumps the revision', async () => {
      const { body } = await create();
      const res = await put(body.id, { party: party('Renamed'), revision: 1 }, body.editToken);
      expect(res.statusCode).toBe(200);
      expect(res.json().revision).toBe(2);
      const read = await app.inject({ method: 'GET', url: `/api/parties/${body.id}` });
      expect(read.json().party.members[0].name).toBe('Renamed');
    });

    it('needs the right edit token', async () => {
      const { body } = await create();
      expect((await put(body.id, { party: party(), revision: 1 })).statusCode).toBe(401);
      expect((await put(body.id, { party: party(), revision: 1 }, 'wrong')).statusCode).toBe(403);
      const other = await create();
      expect(
        (await put(body.id, { party: party(), revision: 1 }, other.body.editToken)).statusCode,
      ).toBe(403);
    });

    it('refuses changes based on an outdated revision', async () => {
      const { body } = await create();
      await put(body.id, { party: party('Device A'), revision: 1 }, body.editToken);
      const res = await put(body.id, { party: party('Device B'), revision: 1 }, body.editToken);
      expect(res.statusCode).toBe(409);
      expect(res.json().current).toMatchObject({
        revision: 2,
        party: { members: [{ name: 'Device A' }] },
      });
    });

    it('needs a revision and a valid party', async () => {
      const { body } = await create();
      expect((await put(body.id, { party: party() }, body.editToken)).statusCode).toBe(400);
      expect((await put(body.id, { party: {}, revision: 1 }, body.editToken)).statusCode).toBe(400);
    });

    it('answers 404 when saving a party that does not exist', async () => {
      expect((await put('abcdefghijkl', { party: party(), revision: 1 }, 'x')).statusCode).toBe(
        404,
      );
    });
  });

  it('deletes a party with its edit token', async () => {
    const { body } = await create();
    const del = (token?: string) =>
      app.inject({
        method: 'DELETE',
        url: `/api/parties/${body.id}`,
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
    expect((await del('wrong')).statusCode).toBe(403);
    expect((await del(body.editToken)).statusCode).toBe(204);
    expect((await app.inject({ method: 'GET', url: `/api/parties/${body.id}` })).statusCode).toBe(
      404,
    );
  });
});
