import { gameData } from '@bg3planner/gamedata';
import { describe, expect, it } from 'vitest';
import type { Build, Loadout } from './build';
import { deriveCharacter } from './derive';
import {
  applyAbilityEffects,
  equipmentIssues,
  itemConflicts,
  itemsForSlot,
  slotAccepts,
} from './equipment';
import { classLevels, hexknight, makeBuild } from './fixtures/builds';
import { partyOf } from './party';
import { partyIssues } from './party-summary';

const item = (id: string) => {
  const found = gameData.items.find((i) => i.id === id);
  if (!found) throw new Error(`No item ${id}`);
  return found;
};

const withGear = (build: Build, act3: Loadout): Build => ({ ...build, equipment: { act3 } });

const issuesFor = (build: Build) =>
  equipmentIssues(build, gameData, deriveCharacter(build, gameData)).map(
    ({ severity, slot, message }) => ({ severity, slot, message }),
  );

describe('slotAccepts', () => {
  it('matches items to their slots', () => {
    expect(slotAccepts('head', item('helmet-of-grit'), gameData)).toBe(true);
    expect(slotAccepts('ring2', item('ring-of-protection'), gameData)).toBe(true);
    expect(slotAccepts('amulet', item('ring-of-protection'), gameData)).toBe(false);
    expect(slotAccepts('meleeMain', item('shadow-blade'), gameData)).toBe(true);
    expect(slotAccepts('meleeOff', item('adamantine-shield'), gameData)).toBe(true);
    expect(slotAccepts('meleeMain', item('adamantine-shield'), gameData)).toBe(false);
    expect(slotAccepts('rangedMain', item('the-dead-shot'), gameData)).toBe(true);
    expect(slotAccepts('meleeMain', item('the-dead-shot'), gameData)).toBe(false);
  });

  it('lists every item for a slot', () => {
    const offHand = itemsForSlot('meleeOff', gameData);
    expect(offHand.some((i) => i.kind === 'shield')).toBe(true);
    expect(offHand.some((i) => i.id === 'rhapsody')).toBe(true);
    expect(itemsForSlot('cloak', gameData).every((i) => i.kind === 'cloak')).toBe(true);
  });
});

describe('equipmentIssues', () => {
  it('accepts a sensible loadout', () => {
    expect(
      issuesFor(
        withGear(hexknight, {
          meleeMain: 'shadow-blade',
          meleeOff: 'rhapsody',
          rangedMain: 'the-dead-shot',
          armour: 'adamantine-splint-armour',
          ring1: 'ring-of-protection',
          ring2: 'shadow-cloaked-ring',
        }),
      ),
    ).toEqual([]);
  });

  it('reports unknown items and items in the wrong slot', () => {
    expect(issuesFor(withGear(hexknight, { head: 'nope', amulet: 'ring-of-protection' }))).toEqual([
      { severity: 'error', slot: 'head', message: 'Unknown item "nope".' },
      {
        severity: 'error',
        slot: 'amulet',
        message: 'Ring of Protection does not go in the amulet slot.',
      },
    ]);
  });

  it('reports a unique item worn twice, but not a generic one', () => {
    expect(
      issuesFor(withGear(hexknight, { ring1: 'ring-of-protection', ring2: 'ring-of-protection' })),
    ).toEqual([
      {
        severity: 'error',
        slot: 'ring2',
        message: 'There is only one Ring of Protection, and it is already in Ring 1.',
      },
    ]);
    expect(issuesFor(withGear(hexknight, { meleeMain: 'dagger-1', meleeOff: 'dagger-1' }))).toEqual(
      [],
    );
  });

  it('keeps the off hand empty behind a two-handed weapon', () => {
    expect(
      issuesFor(
        withGear(hexknight, { meleeMain: 'drakethroat-glaive', meleeOff: 'adamantine-shield' }),
      ),
    ).toEqual([
      {
        severity: 'error',
        slot: 'meleeOff',
        message: 'Drakethroat Glaive needs both hands, so nothing can go in the off hand.',
      },
    ]);
    expect(issuesFor(withGear(hexknight, { meleeOff: 'drakethroat-glaive' }))).toEqual([
      {
        severity: 'error',
        slot: 'meleeOff',
        message: 'Drakethroat Glaive needs both hands, so it cannot be held in the off hand.',
      },
    ]);
  });

  it('needs light weapons or Dual Wielder to dual-wield', () => {
    const longswords = { meleeMain: 'longsword-1', meleeOff: 'shadow-blade' };
    expect(issuesFor(withGear(hexknight, longswords))).toEqual([
      {
        severity: 'error',
        slot: 'meleeOff',
        message:
          'Dual-wielding Shadow Blade needs the Dual Wielder feat, unless both weapons are light.',
      },
    ]);
    const dualWielder: Build = {
      ...hexknight,
      levels: hexknight.levels.map((level, i) =>
        i === 5
          ? { classId: 'fighter', answers: { 'class:0': ['dual-wielder'], 'feat:0': {} } }
          : level,
      ),
    };
    expect(issuesFor(withGear(dualWielder, longswords))).toEqual([]);
  });

  it('warns about gear the character is not proficient with', () => {
    // Not a Human: Humans are proficient with shields.
    const warlock = makeBuild({ raceId: 'half-orc', levels: classLevels('warlock', 1) });
    expect(
      issuesFor(
        withGear(warlock, {
          armour: 'adamantine-splint-armour',
          meleeMain: 'longsword-1',
          meleeOff: 'adamantine-shield',
        }),
      ).map((i) => [i.severity, i.slot, i.message.split(':')[0]]),
    ).toEqual([
      ['warning', 'armour', 'Not proficient with heavy armour'],
      ['warning', 'meleeMain', 'Not proficient with longswords'],
      ['warning', 'meleeOff', 'Not proficient with shields'],
    ]);
  });
});

describe('deriveCharacter with gear', () => {
  const gear = withGear(hexknight, {
    armour: 'adamantine-splint-armour',
    meleeOff: 'adamantine-shield',
    ring1: 'ring-of-protection',
    amulet: 'amulet-of-greater-health',
  });

  it('wears nothing unless an act is chosen', () => {
    const sheet = deriveCharacter(gear, gameData);
    expect(sheet.act).toBeUndefined();
    expect(sheet.armourClass).toBe(13); // 10 + Dexterity 17
    expect(sheet.hitPoints).toBe(99);
  });

  it('adds armour, shield, Defence and item bonuses to Armour Class', () => {
    const sheet = deriveCharacter(gear, gameData, { act: 'act3' });
    expect(sheet.armourClassParts).toEqual([
      { label: 'Adamantine Splint Armour', value: 18 },
      { label: 'Adamantine Shield', value: 2 },
      { label: 'Defence', value: 1 },
      { label: 'Ring of Protection', value: 1 },
    ]);
    expect(sheet.armourClass).toBe(22);
  });

  it('applies ability, saving throw and skill bonuses', () => {
    const plain = deriveCharacter(gear, gameData);
    const sheet = deriveCharacter(gear, gameData, { act: 'act3' });
    expect(sheet.abilityScores.constitution).toBe(23);
    expect(sheet.hitPoints).toBe(99 + 4 * 12); // Constitution modifier +2 → +6
    expect(sheet.savingThrowBonuses.wisdom).toBe(plain.savingThrowBonuses.wisdom + 1);
    const performance = withGear(hexknight, { amulet: 'absolute-confidence-amulet' });
    const skills = deriveCharacter(performance, gameData, { act: 'act3' }).skillBonuses;
    expect(skills.performance).toBe(plain.skillBonuses.performance + 1);
    expect(skills.intimidation).toBe(plain.skillBonuses.intimidation - 1);
  });

  it('caps Dexterity for medium armour, but not with Armour of Agility', () => {
    const dex = (armour: string) =>
      deriveCharacter(withGear(hexknight, { armour }), gameData, {
        act: 'act3',
      }).armourClassParts.find((p) => p.label === 'Dexterity')?.value;
    expect(dex('scale-mail-1')).toBe(2);
    expect(dex('armour-of-agility')).toBe(3);
    expect(dex('bhaalist-armour')).toBe(3);
    expect(dex('adamantine-splint-armour')).toBeUndefined();
  });
});

describe('applyAbilityEffects', () => {
  const scores = {
    strength: 8,
    dexterity: 17,
    constitution: 14,
    intelligence: 8,
    wisdom: 10,
    charisma: 21,
  };

  it('raises scores to "set" values and adds bonuses up to their cap', () => {
    expect(
      applyAbilityEffects(scores, {
        gloves: item('gloves-of-dexterity'),
        head: item('birthright'),
      }),
    ).toMatchObject({ dexterity: 18, charisma: 22 });
  });

  it('never lowers a score with a "set" item', () => {
    expect(
      applyAbilityEffects({ ...scores, dexterity: 20 }, { gloves: item('gloves-of-dexterity') })
        .dexterity,
    ).toBe(20);
  });
});

describe('itemConflicts and partyIssues', () => {
  const ring = (build: Build) =>
    withGear(build, { ring1: 'ring-of-protection', ring2: 'dagger-1' });

  it('finds unique items planned for two members in the same act', () => {
    const members = [
      { id: 'a', build: ring(hexknight) },
      { id: 'b', build: ring(makeBuild()) },
      { id: 'c', build: { ...makeBuild(), equipment: { act2: { ring1: 'ring-of-protection' } } } },
    ];
    expect(itemConflicts(members, gameData)).toEqual([
      { act: 'act3', itemId: 'ring-of-protection', memberIds: ['a', 'b'] },
    ]);
  });

  it('warns about clashes within the active party only', () => {
    let n = 0;
    const party = partyOf({ name: 'Tav', build: ring(hexknight) }, () => `m${++n}`);
    party.members.push(
      { id: 'm2', name: 'Karlach', build: ring(makeBuild()) },
      { id: 'm3', name: 'Gale', build: ring(makeBuild()) },
    );
    party.activeMemberIds.push('m2');
    const clash = (issues: ReturnType<typeof partyIssues>) =>
      issues.filter((i) => i.message.includes('only one'));
    expect(clash(partyIssues(party, gameData))).toEqual([
      {
        severity: 'warning',
        memberId: 'm2',
        message:
          'Act 3: Tav and Karlach both plan to use Ring of Protection, but there is only one.',
      },
    ]);
    party.activeMemberIds.push('m3');
    expect(clash(partyIssues(party, gameData))[0]?.message).toBe(
      'Act 3: Tav, Karlach and Gale all plan to use Ring of Protection, but there is only one.',
    );
  });
});
