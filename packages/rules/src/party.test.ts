import { describe, expect, it } from 'vitest';
import { hexknight, makeBuild } from './fixtures/builds';
import { MAX_ACTIVE, PARTY_SCHEMA_VERSION, migrateParty, partyOf } from './party';

const ids = () => {
  let n = 0;
  return () => `member-${++n}`;
};

describe('partyOf', () => {
  it('makes a current-format party with one active member', () => {
    expect(partyOf({ name: 'Hexknight', build: hexknight }, ids())).toEqual({
      schemaVersion: PARTY_SCHEMA_VERSION,
      name: '',
      members: [{ id: 'member-1', name: 'Hexknight', build: hexknight }],
      activeMemberIds: ['member-1'],
    });
  });
});

describe('migrateParty', () => {
  it('accepts a current party unchanged', () => {
    const party = partyOf({ name: 'A', build: makeBuild() }, ids());
    expect(migrateParty(party)).toEqual({ ok: true, party, from: PARTY_SCHEMA_VERSION });
  });

  it('upgrades the version 1 single-character draft', () => {
    const draft = JSON.parse(JSON.stringify({ name: 'Hexknight', build: hexknight }));
    const result = migrateParty(draft, ids());
    expect(result).toEqual({
      ok: true,
      from: 1,
      party: {
        schemaVersion: PARTY_SCHEMA_VERSION,
        name: '',
        members: [{ id: 'member-1', name: 'Hexknight', build: hexknight }],
        activeMemberIds: ['member-1'],
      },
    });
  });

  it('rejects a version 1 draft whose build is broken', () => {
    const result = migrateParty({ name: 'X', build: { levels: [] } });
    expect(result.ok).toBe(false);
  });

  it('refuses parties saved by a newer planner', () => {
    expect(migrateParty({ schemaVersion: 99 })).toEqual({
      ok: false,
      issues: [
        expect.objectContaining({
          message: 'This party was saved by a newer version of the planner (format 99).',
        }),
      ],
    });
  });

  it('refuses things that are not parties', () => {
    for (const input of [null, 'party', [], 3]) {
      expect(migrateParty(input)).toMatchObject({ ok: false });
    }
  });

  it('checks member ids and the active list', () => {
    const party = partyOf({ name: 'A', build: makeBuild() }, ids());
    const twin = { ...party, members: [...party.members, party.members[0]!] };
    const stranger = { ...party, activeMemberIds: ['nobody'] };
    const crowd = { ...party, activeMemberIds: Array(MAX_ACTIVE + 1).fill('member-1') };
    expect(migrateParty(twin)).toMatchObject({
      ok: false,
      issues: [{ message: 'members: member ids must be unique' }],
    });
    expect(migrateParty(stranger)).toMatchObject({
      ok: false,
      issues: [{ message: 'activeMemberIds: "nobody" is not a member' }],
    });
    expect(migrateParty(crowd).ok).toBe(false);
  });
});
