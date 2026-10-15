import { gameData } from '@bg3planner/gamedata';
import { describe, expect, it } from 'vitest';
import type { Build } from './build';
import { parseBuild, validateBuild } from './choices';
import { classLevels, makeBuild } from './fixtures/builds';

const messages = (build: Build) =>
  validateBuild(build, gameData).map((i) => `${i.severity}@${i.characterLevel}: ${i.message}`);

describe('validateBuild', () => {
  it('accepts the complete default build', () => {
    expect(messages(makeBuild())).toEqual([]);
  });

  it('reports unknown race, background and class', () => {
    const build = makeBuild({ raceId: 'orc', backgroundId: 'pirate' });
    build.levels.push({ classId: 'necromancer', answers: {} });
    expect(messages(build)).toEqual(
      expect.arrayContaining([
        'error@1: Unknown race "orc"',
        'error@1: Unknown background "pirate"',
        'error@2: Unknown class "necromancer"',
      ]),
    );
  });

  it('asks for a subrace and rejects one from another race', () => {
    expect(messages(makeBuild({ raceId: 'elf' }))).toContain('warning@1: Choose a Elf subrace');
    expect(messages(makeBuild({ raceId: 'elf', subraceId: 'duergar' }))).toContain(
      'error@1: Elf has no subrace "duergar"',
    );
  });

  it('warns when the build was made with another dataset', () => {
    expect(messages(makeBuild({ gameDataVersion: 'patch-7' }))).toContain(
      'warning@1: Build was made with game data patch-7; current data is patch-8',
    );
  });

  describe('abilities', () => {
    const withAbilities = (base: Partial<Build['abilities']['base']>, racialBonus = {}) => {
      const build = makeBuild();
      build.abilities = { base: { ...build.abilities.base, ...base }, racialBonus };
      return messages(build);
    };

    it('rejects scores outside 8–15', () => {
      expect(withAbilities({ strength: 16 }, { strength: 2, wisdom: 1 })).toContain(
        'error@1: Base strength must be 8–15, got 16',
      );
    });

    it('rejects overspending and flags unspent points', () => {
      expect(withAbilities({ charisma: 10 }, { strength: 2, wisdom: 1 })).toContain(
        'error@1: Point buy spends 29 points; the budget is 27',
      );
      expect(withAbilities({ strength: 13 }, { strength: 2, wisdom: 1 })).toContain(
        'warning@1: 4 point-buy points unspent',
      );
    });

    it('needs exactly one +2 and one +1', () => {
      expect(withAbilities({})).toContain('warning@1: Assign the racial +2 and +1 ability bonuses');
      expect(withAbilities({}, { strength: 2, wisdom: 2 })).toContain(
        'error@1: Racial bonuses must be +2 to one ability and +1 to another',
      );
    });
  });

  describe('list answers', () => {
    const level1 = (answers: Record<string, unknown>) => {
      const build = makeBuild();
      build.levels[0]!.answers = { ...build.levels[0]!.answers, ...answers } as never;
      return messages(build);
    };

    it('warns about unanswered and partly answered choices', () => {
      const build = makeBuild();
      delete build.levels[0]!.answers['class:0'];
      expect(messages(build)).toEqual(['warning@1: Fighter – Fighting Style: choose 1']);
      expect(level1({ 'class-skills': ['acrobatics'] })).toEqual([
        'warning@1: Fighter – Skills: 1 of 2 chosen',
      ]);
    });

    it('rejects picks that are not allowed, repeated or too many', () => {
      expect(level1({ 'class:0': ['agonising-blast'] })).toContain(
        'error@1: Fighter – Fighting Style: "agonising-blast" is not an allowed choice',
      );
      expect(level1({ 'class-skills': ['acrobatics', 'acrobatics'] })).toContain(
        'error@1: Fighter – Skills: "acrobatics" is picked twice',
      );
      expect(level1({ 'class:0': ['defence', 'archery'] })).toContain(
        'error@1: Fighter – Fighting Style: 2 picked, only 1 allowed',
      );
      expect(level1({ 'class:0': { from: 'a', to: 'b' } })).toContain(
        'error@1: Fighter – Fighting Style: expected a list of picks',
      );
    });

    it('rejects background skills as class skills', () => {
      expect(level1({ 'class-skills': ['athletics', 'perception'] })).toContain(
        'error@1: Fighter – Skills: "athletics" is not an allowed choice',
      );
    });

    it('flags answers that match no choice', () => {
      expect(level1({ 'subclass:0': ['champion'] })).toContain(
        'warning@1: Answer "subclass:0" does not match any choice at this level',
      );
    });
  });

  describe('ability increases', () => {
    const atLevel4 = (featAnswer: unknown) =>
      messages(
        makeBuild({
          levels: [
            ...makeBuild().levels,
            ...classLevels('fighter', 4, {
              3: { 'class:0': ['champion'] },
              4: { 'class:0': ['ability-improvement'], 'feat:0': featAnswer as never },
            }).slice(1),
          ],
        }),
      );

    it('accepts +2 to one or +1 to two abilities', () => {
      expect(atLevel4({ dexterity: 2 })).toEqual([]);
      expect(atLevel4({ dexterity: 1, wisdom: 1 })).toEqual([]);
    });

    it('rejects too many points', () => {
      expect(atLevel4({ dexterity: 2, wisdom: 1 })).toContain(
        'error@4: Ability Improvement – Ability points: 3 points assigned, only 2 available',
      );
    });

    it('warns about unassigned points and rejects other shapes', () => {
      expect(atLevel4({ wisdom: 1 })).toContain(
        'warning@4: Ability Improvement – Ability points: 1 of 2 points assigned',
      );
      expect(atLevel4(undefined)).toContain(
        'warning@4: Ability Improvement – Ability points: assign 2 ability point(s)',
      );
      expect(atLevel4(['wisdom'])).toContain(
        'error@4: Ability Improvement – Ability points: expected points per ability',
      );
    });
  });

  it('rejects raising a score above 20', () => {
    // Strength 15 + 2 racial = 17; +2 at level 4 = 19; +2 more at level 6 would be 21.
    const build = makeBuild({
      levels: classLevels('fighter', 6, {
        1: {
          'class-skills': ['acrobatics', 'perception'],
          'class:0': ['defence'],
          'race:0': ['stealth'],
        },
        3: { 'class:0': ['champion'] },
        4: { 'class:0': ['ability-improvement'], 'feat:0': { strength: 2 } },
        6: { 'class:0': ['ability-improvement'], 'feat:0': { strength: 2 } },
      }),
    });
    expect(messages(build)).toEqual([
      'error@6: Ability Improvement – Ability points: strength would exceed 20',
    ]);
  });

  it('caps each ability and only allows the listed ones', () => {
    const build = makeBuild({
      levels: classLevels('fighter', 4, {
        1: {
          'class-skills': ['acrobatics', 'perception'],
          'class:0': ['defence'],
          'race:0': ['stealth'],
        },
        3: { 'class:0': ['champion'] },
        4: { 'class:0': ['athlete'], 'feat:0': { strength: 1, charisma: 1 } },
      }),
    });
    expect(messages(build)).toEqual(
      expect.arrayContaining([
        'error@4: Athlete – Ability points: cannot increase charisma',
        'error@4: Athlete – Ability points: 2 points assigned, only 1 available',
      ]),
    );
  });

  describe('spell replacement', () => {
    const warlock = (level2: Record<string, unknown>) =>
      messages(
        makeBuild({
          raceId: 'half-orc',
          levels: classLevels('warlock', 2, {
            1: {
              'class-skills': ['arcana', 'deception'],
              'class:0': ['the-fiend'],
              'class:1': ['eldritch-blast', 'bone-chill'],
              'class:2': ['hex', 'burning-hands'],
            },
            2: {
              'class:0': ['agonising-blast', 'devils-sight'],
              'class:1': ['armour-of-agathys'],
              ...level2,
            },
          }),
        }),
      );

    it('accepts swapping a known spell', () => {
      expect(warlock({ 'class:2': { from: 'hex', to: 'command' } })).not.toContainEqual(
        expect.stringContaining('Warlock –'),
      );
    });

    it('rejects swapping an unknown spell or to a disallowed one', () => {
      expect(warlock({ 'class:2': { from: 'fireball', to: 'command' } })).toContain(
        'error@2: Warlock – Spell replacement: "fireball" is not a known spell to replace',
      );
      expect(warlock({ 'class:2': { from: 'hex', to: 'fireball' } })).toContain(
        'error@2: Warlock – Spell replacement: "fireball" is not an allowed replacement',
      );
      expect(warlock({ 'class:2': ['hex'] })).toContain(
        'error@2: Warlock – Spell replacement: expected a spell to replace and its replacement',
      );
    });
  });
});

describe('parseBuild', () => {
  it('accepts a valid build', () => {
    const build = makeBuild();
    expect(parseBuild(JSON.parse(JSON.stringify(build)))).toEqual({ ok: true, build });
  });

  it('reports schema errors with their path', () => {
    const result = parseBuild({ ...makeBuild(), levels: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        expect.objectContaining({ severity: 'error', message: expect.stringMatching(/^levels:/) }),
      ]);
    }
  });
});
