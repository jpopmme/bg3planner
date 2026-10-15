import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBuildStore } from './build';
import { usePartyStore } from './party';

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe('roster', () => {
  it('adds origin characters with their fixed race and background', () => {
    const party = usePartyStore();
    const id = party.addMember('astarion')!;
    const astarion = party.party.members.find((m) => m.id === id)!;
    expect(astarion.name).toBe('Astarion');
    expect(astarion.build).toMatchObject({
      originId: 'astarion',
      raceId: 'elf',
      subraceId: 'high-elf',
      backgroundId: 'charlatan',
    });
    // Rogue is not in the planner yet, so he starts as a Fighter.
    expect(astarion.build.levels[0]!.classId).toBe('fighter');
  });

  it('starts origins in their own class when the planner has it', () => {
    const party = usePartyStore();
    const id = party.addMember('wyll');
    const wyll = party.party.members.find((m) => m.id === id)!;
    expect(wyll.build.levels[0]!.classId).toBe('warlock');
  });

  it('fills the active party first, then camp', () => {
    const party = usePartyStore();
    const ids = ['gale', 'karlach', 'laezel', 'wyll'].map((o) => party.addMember(o)!);
    expect(party.party.activeMemberIds).toHaveLength(4);
    expect(party.party.activeMemberIds).not.toContain(ids[3]);
  });

  it('will not put a fifth character in the party', () => {
    const party = usePartyStore();
    const ids = ['gale', 'karlach', 'laezel', 'wyll'].map((o) => party.addMember(o)!);
    expect(party.toggleActive(ids[3]!)).toBe(false);
    expect(party.toggleActive(ids[0]!)).toBe(true); // to camp
    expect(party.toggleActive(ids[3]!)).toBe(true); // now there is room
    expect(party.party.activeMemberIds).toContain(ids[3]);
  });

  it('tracks which origins are taken', () => {
    const party = usePartyStore();
    party.addMember('shadowheart');
    party.addMember('custom');
    expect([...party.takenOrigins]).toEqual(['shadowheart']);
  });

  it('removes characters but always keeps one', () => {
    const party = usePartyStore();
    const first = party.party.members[0]!.id;
    const second = party.addMember('custom')!;
    party.select(second);
    party.removeMember(second);
    expect(party.party.members.map((m) => m.id)).toEqual([first]);
    expect(party.party.activeMemberIds).toEqual([first]);
    expect(party.selectedId).toBe(first);
    party.removeMember(first);
    expect(party.party.members).toHaveLength(1);
  });

  it('duplicates a character into camp', () => {
    const party = usePartyStore();
    party.party.members[0]!.name = 'Tav';
    const copy = party.duplicateMember(party.party.members[0]!.id)!;
    expect(party.party.members.find((m) => m.id === copy)!.name).toBe('Tav (copy)');
    expect(party.party.activeMemberIds).not.toContain(copy);
  });

  it('edits whichever character is selected', () => {
    const party = usePartyStore();
    const build = useBuildStore();
    const gale = party.addMember('gale')!;
    party.select(gale);
    expect(build.name).toBe('Gale');
    build.name = 'Gale of Waterdeep';
    expect(party.party.members.find((m) => m.id === gale)!.name).toBe('Gale of Waterdeep');
  });
});

describe('setOrigin', () => {
  it('applies an origin’s fixed race, subrace, background and name', () => {
    const build = useBuildStore();
    build.setOrigin('karlach');
    expect(build.build).toMatchObject({
      originId: 'karlach',
      raceId: 'tiefling',
      subraceId: 'zariel-tiefling',
      backgroundId: 'outlander',
    });
    expect(build.name).toBe('Karlach');
    expect(build.locks).toEqual({ race: true, background: true });
  });

  it('gives The Dark Urge Haunted One and a free race, and takes it away again', () => {
    const build = useBuildStore();
    build.setOrigin('dark-urge');
    expect(build.build.backgroundId).toBe('haunted-one');
    expect(build.locks).toEqual({ race: false, background: true });

    build.setOrigin('custom');
    expect(build.build.originId).toBeUndefined();
    expect(build.build.backgroundId).toBe('acolyte');
    expect(build.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });
});
