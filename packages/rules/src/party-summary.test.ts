import { gameData } from '@bg3planner/gamedata';
import { describe, expect, it } from 'vitest';
import { deriveCharacter } from './derive';
import { hexknight, makeBuild } from './fixtures/builds';
import { type Party, partyOf } from './party';
import { partyIssues, summariseParty } from './party-summary';

const party = (members: Party['members'], active: string[]): Party => ({
  ...partyOf({ name: 'x', build: makeBuild() }),
  members,
  activeMemberIds: active,
});
const member = (id: string, originId?: string) => ({
  id,
  name: id,
  build: { ...makeBuild(), ...(originId ? { originId } : {}) },
});

describe('partyIssues', () => {
  it('allows several custom characters but each origin only once', () => {
    const p = party(
      [member('a'), member('b'), member('c', 'wyll'), member('d', 'wyll')],
      ['a', 'b', 'c', 'd'],
    );
    expect(partyIssues(p, gameData)).toEqual([
      {
        severity: 'error',
        memberId: 'd',
        message: 'Wyll is in the roster twice; there is only one Wyll.',
      },
    ]);
  });

  it('notes an empty or part-filled active party', () => {
    expect(partyIssues(party([member('a')], []), gameData)).toEqual([
      { severity: 'warning', message: 'No one is in the active party yet.' },
    ]);
    expect(partyIssues(party([member('a'), member('b')], ['a']), gameData)).toEqual([
      { severity: 'warning', message: 'The active party has 1 of 4 places filled.' },
    ]);
    expect(partyIssues(party([member('a')], ['a']), gameData)).toEqual([]);
  });
});

describe('summariseParty', () => {
  const hex = deriveCharacter(hexknight, gameData);
  const human = deriveCharacter(makeBuild(), gameData);

  it('finds who rolls best, including ties', () => {
    const summary = summariseParty([
      { id: 'hex', character: hex },
      { id: 'human', character: human },
    ])!;
    expect(summary.skills.intimidation).toEqual({ bonus: 9, memberIds: ['hex'] });
    expect(summary.savingThrows.charisma).toEqual({ bonus: 5, memberIds: ['hex'] });
  });

  it('lists everyone who ties for best', () => {
    const summary = summariseParty([
      { id: 'a', character: human },
      { id: 'b', character: human },
    ])!;
    expect(summary.skills.athletics.memberIds).toEqual(['a', 'b']);
  });

  it('lists members without darkvision', () => {
    const summary = summariseParty([
      { id: 'hex', character: hex },
      { id: 'human', character: human },
    ])!;
    expect(summary.withoutDarkvision).toEqual(['human']);
  });

  it('has nothing to say about an empty group', () => {
    expect(summariseParty([])).toBeUndefined();
  });
});
