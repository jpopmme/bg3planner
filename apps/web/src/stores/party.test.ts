import { type Party, partyOf } from '@bg3planner/rules';
import { hexknight, makeBuild } from '@bg3planner/rules/fixtures';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { encodeParty } from '../lib/share';
import { usePartyStore } from './party';

/** An in-memory stand-in for /api/parties with the real API's rules. */
function fakeServer() {
  const rows = new Map<string, { party: Party; revision: number; token: string }>();
  let n = 0;
  let down = false;
  const json = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status });

  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    if (down) throw new TypeError('Failed to fetch');
    const id = url.split('/api/parties/')[1];
    const token = (init.headers as Record<string, string>)?.authorization?.slice(7);
    const row = id ? rows.get(id) : undefined;
    const view = (rid: string) => ({ id: rid, ...rows.get(rid)!, updatedAt: 'now' });
    switch (init.method ?? 'GET') {
      case 'POST': {
        const newId = `party${String(++n).padStart(7, '0')}`;
        rows.set(newId, {
          party: JSON.parse(init.body as string),
          revision: 1,
          token: `token-${n}`,
        });
        return json(201, { ...view(newId), editToken: `token-${n}` });
      }
      case 'GET':
        return row ? json(200, view(id!)) : json(404, { error: 'No party has this link.' });
      case 'PUT': {
        if (!row) return json(404, {});
        if (token !== row.token) return json(403, { error: 'wrong token' });
        const { party, revision } = JSON.parse(init.body as string);
        if (revision !== row.revision) return json(409, { error: 'changed', current: view(id!) });
        row.party = party;
        row.revision++;
        return json(200, { revision: row.revision, updatedAt: 'now' });
      }
      case 'DELETE':
        rows.delete(id!);
        return json(204);
    }
    return json(405);
  });
  return {
    rows,
    fetchMock,
    setDown: (value: boolean) => (down = value),
    /** Simulates an edit saved from another device. */
    editElsewhere(id: string, rename: string) {
      const row = rows.get(id)!;
      row.party = { ...row.party, members: [{ ...row.party.members[0]!, name: rename }] };
      row.revision++;
    },
  };
}

let server: ReturnType<typeof fakeServer>;

beforeEach(() => {
  localStorage.clear();
  server = fakeServer();
  vi.stubGlobal('fetch', server.fetchMock);
  setActivePinia(createPinia());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const methods = () => server.fetchMock.mock.calls.map(([, init]) => init?.method ?? 'GET');

describe('party store on this device', () => {
  it('starts with one fresh character and nothing to lose', () => {
    const store = usePartyStore();
    expect(store.party.members).toHaveLength(1);
    expect(store.status).toBe('local');
    expect(store.hasUnsavedWork).toBe(false);
  });

  it('migrates the single-character draft the previous version saved', () => {
    localStorage.setItem(
      'bg3planner:draft',
      JSON.stringify({ name: 'Hexknight', build: hexknight }),
    );
    const store = usePartyStore();
    expect(store.currentMember).toMatchObject({ name: 'Hexknight', build: hexknight });
    expect(localStorage.getItem('bg3planner:draft')).toBeNull();
    expect(JSON.parse(localStorage.getItem('bg3planner:party')!).party.schemaVersion).toBe(2);
  });

  it('keeps edits across visits', async () => {
    usePartyStore().currentMember.name = 'Shadowheart';
    await nextTick();
    setActivePinia(createPinia());
    expect(usePartyStore().currentMember.name).toBe('Shadowheart');
  });

  it('ignores damaged storage', () => {
    localStorage.setItem('bg3planner:party', '{"party": {"schemaVersion": 2}}');
    expect(usePartyStore().party.members[0]!.name).toBe('');
  });

  it('exports and imports files, upgrading old ones', () => {
    const store = usePartyStore();
    store.currentMember.name = 'Exported';
    const file = store.exportJson();
    store.startOver();
    expect(store.importJson(file)).toBeUndefined();
    expect(store.currentMember.name).toBe('Exported');

    expect(store.importJson(JSON.stringify({ name: 'Old', build: makeBuild() }))).toBeUndefined();
    expect(store.currentMember.name).toBe('Old');
  });

  it('explains why a file cannot be imported', () => {
    const store = usePartyStore();
    expect(store.importJson('not json')).toBe(
      'This file is not a saved party (it is not valid JSON).',
    );
    expect(store.importJson('{"schemaVersion": 7}')).toMatch(/newer version/);
  });
});

describe('party store online', () => {
  it('creates links once', async () => {
    const store = usePartyStore();
    const link = await store.shareOnline();
    await store.shareOnline();
    expect(methods()).toEqual(['POST']);
    expect(store.status).toBe('synced');
    expect(store.links.view).toBe(`http://localhost:3000/p/${link.id}`);
    expect(store.links.edit).toBe(`http://localhost:3000/p/${link.id}#edit=${link.editToken}`);
  });

  it('saves edits online shortly after they are made', async () => {
    vi.useFakeTimers();
    const store = usePartyStore();
    const { id } = await store.shareOnline();
    store.currentMember.name = 'Synced';
    await nextTick();
    expect(store.dirty).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(store.status).toBe('synced');
    expect(store.dirty).toBe(false);
    expect(server.rows.get(id)).toMatchObject({ revision: 2 });
    expect(server.rows.get(id)!.party.members[0]!.name).toBe('Synced');
  });

  it('keeps changes on this device while the server is unreachable', async () => {
    const store = usePartyStore();
    await store.shareOnline();
    server.setDown(true);
    store.currentMember.name = 'Offline edit';
    await nextTick();
    await store.sync();
    expect(store.status).toBe('offline');
    expect(store.dirty).toBe(true);

    server.setDown(false);
    await store.sync();
    expect(store.status).toBe('synced');
  });

  it('stops on edits made elsewhere and lets the player pick a version', async () => {
    const store = usePartyStore();
    const { id } = await store.shareOnline();
    server.editElsewhere(id, 'Other device');
    store.currentMember.name = 'This device';
    await nextTick();
    await store.sync();
    expect(store.status).toBe('conflict');

    await store.keepMyVersion();
    expect(store.status).toBe('synced');
    expect(server.rows.get(id)!.party.members[0]!.name).toBe('This device');
  });

  it('can take the other device’s version instead', async () => {
    const store = usePartyStore();
    const { id } = await store.shareOnline();
    server.editElsewhere(id, 'Other device');
    store.currentMember.name = 'This device';
    await nextTick();
    await store.sync();
    store.keepServerVersion();
    expect(store.currentMember.name).toBe('Other device');
    expect(store.status).toBe('synced');
    expect(store.dirty).toBe(false);
  });

  it('says it is saving as soon as an edit is made', async () => {
    const store = usePartyStore();
    await store.shareOnline();
    store.currentMember.name = 'Pending';
    expect(store.status).toBe('syncing');
  });

  it('does not send data it just received back to the server', async () => {
    const store = usePartyStore();
    const { id } = await store.shareOnline();
    server.editElsewhere(id, 'Edited on phone');
    await store.refreshFromServer();
    await nextTick();
    expect(store.dirty).toBe(false);
    expect(store.status).toBe('synced');
  });

  it('pulls edits made elsewhere when it starts', async () => {
    const store = usePartyStore();
    const { id } = await store.shareOnline();
    server.editElsewhere(id, 'Edited on phone');
    await store.refreshFromServer();
    expect(store.currentMember.name).toBe('Edited on phone');
    expect(store.remote!.revision).toBe(2);
  });

  it('goes back to local-only if the online copy was deleted', async () => {
    const store = usePartyStore();
    const { id } = await store.shareOnline();
    server.rows.delete(id);
    await store.refreshFromServer();
    expect(store.remote).toBeNull();
    expect(store.status).toBe('local');
  });

  it('stops sharing by deleting the online copy', async () => {
    const store = usePartyStore();
    const { id } = await store.shareOnline();
    await store.stopSharing();
    expect(server.rows.has(id)).toBe(false);
    expect(store.status).toBe('local');
  });
});

describe('opening links', () => {
  async function sharedElsewhere(name: string) {
    const other = usePartyStore();
    other.currentMember.name = name;
    const link = await other.shareOnline();
    localStorage.clear();
    setActivePinia(createPinia());
    return link;
  }

  it('makes an edit link this device’s party', async () => {
    const link = await sharedElsewhere('From laptop');
    const store = usePartyStore();
    expect(await store.openLink({ id: link.id, editToken: link.editToken })).toBe('edit');
    expect(store.currentMember.name).toBe('From laptop');
    expect(store.remote).toMatchObject({ id: link.id, revision: 1 });
    expect(store.readOnly).toBe(false);
  });

  it('shows a view link read-only and can keep a copy', async () => {
    const link = await sharedElsewhere('Someone else');
    const store = usePartyStore();
    expect(await store.openLink({ id: link.id })).toBe('view');
    expect(store.readOnly).toBe(true);
    expect(store.currentMember.name).toBe('Someone else');
    expect(store.party.members[0]!.name).toBe('');

    store.copyViewed();
    expect(store.readOnly).toBe(false);
    expect(store.currentMember.name).toBe('Someone else');
    expect(store.remote).toBeNull();
  });

  it('recognises its own party', async () => {
    const store = usePartyStore();
    const { id } = await store.shareOnline();
    expect(await store.openLink({ id })).toBe('own');
  });

  it('opens snapshot links and rejects damaged ones', async () => {
    const store = usePartyStore();
    const snapshot = partyOf({ name: 'Snapshot', build: hexknight });
    expect(await store.openLink({ encoded: encodeParty(snapshot) })).toBe('view');
    expect(store.currentMember.name).toBe('Snapshot');
    expect(await store.openLink({ encoded: 'garbage' })).toBe('missing');
    expect(await store.openLink({ id: 'nonexistent1' })).toBe('missing');
  });
});
