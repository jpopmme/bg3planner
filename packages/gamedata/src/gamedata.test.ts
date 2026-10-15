import { describe, expect, it } from 'vitest';
import { findIntegrityIssues, gameData, gameDataSchema, type GameData } from './index';

/** A deep copy that a test can break without touching the shared dataset. */
const copy = (): GameData => structuredClone(gameData);

describe('gameData', () => {
  it('matches the schema', () => {
    expect(() => gameDataSchema.parse(gameData)).not.toThrow();
  });

  it('has no integrity issues', () => {
    expect(findIntegrityIssues(gameData)).toEqual([]);
  });

  it('covers every class spell list the planner needs so far', () => {
    const lists = new Set(gameData.spells.flatMap((s) => s.classes));
    expect(lists).toContain('wizard');
    expect(lists).toContain('warlock');
  });
});

describe('findIntegrityIssues', () => {
  it('reports unknown features', () => {
    const data = copy();
    data.classes[0]!.levels[0]!.features.push('not-a-feature');
    expect(findIntegrityIssues(data)).toContain('Fighter level 1: unknown feature "not-a-feature"');
  });

  it('reports features that nothing grants', () => {
    const data = copy();
    data.features.push({ id: 'orphan', name: 'Orphan', kind: 'passive' });
    expect(findIntegrityIssues(data)).toContain('feature "orphan" is never granted');
  });

  it('reports unknown expanded spells', () => {
    const data = copy();
    data.subclasses.find((s) => s.id === 'the-fiend')!.expandedSpells![0]!.spells.push('nope');
    expect(findIntegrityIssues(data)).toContain(
      'The Fiend expanded spells at level 1: unknown spell "nope"',
    );
  });

  it('reports expanded spells above the castable level', () => {
    const data = copy();
    data.subclasses.find((s) => s.id === 'the-fiend')!.expandedSpells![0]!.spells.push('fireball');
    expect(findIntegrityIssues(data)).toContain(
      'The Fiend expanded spells at level 1: "fireball" is level 3, not castable yet',
    );
  });

  it('reports spell picks that disagree with the spells-known table', () => {
    const data = copy();
    const warlock = data.classes.find((c) => c.id === 'warlock')!;
    warlock.levels[5]!.choices = warlock.levels[5]!.choices.filter((c) => c.type !== 'spell');
    const issues = findIntegrityIssues(data);
    expect(issues).toContain('Warlock level 6: 6 spell picks so far, table says 7');
    expect(issues).toContain('Warlock level 12: 12 spell picks so far, table says 13');
  });

  it('reports spell choices above the castable level', () => {
    const data = copy();
    const choice = data.classes.find((c) => c.id === 'warlock')!.levels[0]!.choices[2]!;
    if (choice.type !== 'spell') throw new Error('expected the level 1 spell choice');
    choice.maxLevel = 2;
    expect(findIntegrityIssues(data)).toContain(
      'Warlock level 1 choice 3 (spell): allows level 2 spells but slots reach 1',
    );
  });

  it('reports option picks larger than what the level unlocks', () => {
    const data = copy();
    const choice = data.classes.find((c) => c.id === 'warlock')!.levels[1]!.choices[0]!;
    if (choice.type !== 'option') throw new Error('expected the invocation choice');
    choice.count = 11;
    expect(findIntegrityIssues(data)).toContain(
      'Warlock level 2 choice 1 (option): picks 11 from "eldritch-invocations" but only 10 are available',
    );
  });

  it('reports a misplaced subclass choice', () => {
    const data = copy();
    data.classes[0]!.levels[2]!.choices = [];
    expect(findIntegrityIssues(data)).toContain(
      'Fighter: subclass must be chosen exactly once, at level 3 (found at none)',
    );
  });

  it('reports unknown weapon types and innate spells on races', () => {
    const data = copy();
    const elf = data.races.find((r) => r.id === 'elf')!;
    elf.weaponTypes!.push('lightsabers');
    elf.innateSpells = [{ characterLevel: 3, spell: 'nope' }];
    const issues = findIntegrityIssues(data);
    expect(issues).toContain('Elf: unknown weapon type "lightsabers"');
    expect(issues).toContain('Elf: unknown spell "nope" at level 3');
  });

  it('reports feats that add unknown resources or class-only choices', () => {
    const data = copy();
    const feat = data.feats.find((f) => f.id === 'martial-adept')!;
    feat.resources = { 'mana-points': 1 };
    feat.choices!.push({ type: 'subclass' });
    const issues = findIntegrityIssues(data);
    expect(issues).toContain('Feat Martial Adept: unknown resource "mana-points"');
    expect(issues).toContain(
      'Feat Martial Adept choice 2: "subclass" only makes sense on a class level',
    );
  });

  it('reports ability increases that cannot be spent', () => {
    const data = copy();
    data.feats.find((f) => f.id === 'athlete')!.choices = [
      { type: 'ability-increase', points: 2, maxPerAbility: 1, from: ['strength'] },
    ];
    expect(findIntegrityIssues(data)).toContain(
      'Feat Athlete choice 1 (ability-increase): cannot spend 2 points on the listed abilities',
    );
  });

  it('reports duplicate ids', () => {
    const data = copy();
    data.spells.push(data.spells[0]!);
    data.races[1]!.subraces[0]!.id = data.races[3]!.subraces[0]!.id;
    const issues = findIntegrityIssues(data);
    expect(issues).toContain(`duplicate spell id "${data.spells[0]!.id}"`);
    expect(issues).toContain(`duplicate subrace id "${data.races[3]!.subraces[0]!.id}"`);
  });
});
