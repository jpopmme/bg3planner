import { gameData } from '@bg3planner/gamedata';
import { describe, expect, it } from 'vitest';
import { GuideFormatError, importGamestegyGuide, isGamestegyGuideUrl } from './index';
import { entity, guidePage, overviewTable, simpleTable } from './test/guide-page';

const races = simpleTable('Races', ['Wood Half-Elf', 'Half-Orc']);
const backgrounds = simpleTable('Background', ['Charlatan', 'Noble']);

const warlockGuide = guidePage(
  races +
    backgrounds +
    overviewTable([
      {
        level: 1,
        className: 'Warlock 1',
        lines: [
          `<strong>Cantrips:&nbsp;</strong>${entity('Eldritch Blast')}, ${entity('Booming Blade')}`,
          '<strong>Subclass: </strong>The Hexblade',
          `<strong>Spells:</strong> ${entity('Wrathful Smite')}, ${entity('Shield')}`,
          'STR - 8, DEX - 16, CON - 14, INT - 8, WIS - 10, CHA - 17',
          '<strong>Skills</strong>: Deception, Intimidation, Arcana',
        ],
      },
      {
        level: 2,
        className: 'Warlock 2',
        lines: [
          `<strong>Spells:</strong> ${entity('Hellish Rebuke')} or ${entity('Hex')}`,
          `<strong>Eldritch Invocations: </strong>${entity('Agonising Blast', 'passive-feature')}, ${entity("Devil's Sight", 'passive-feature')}`,
        ],
      },
      {
        level: 3,
        className: 'Warlock 3',
        lines: [
          `<strong>Spells:</strong> ${entity('Shadow Blade')}`,
          `<strong>Pact Boon:</strong> ${entity('Pact of the Blade', 'passive-feature')}`,
          `<strong>Replace Spell:</strong> ${entity('Hellish Rebuke')} -&gt; ${entity('Cloud of Daggers')}`,
        ],
      },
      {
        level: 4,
        className: 'Warlock 4',
        lines: [
          '<strong>Cantrips:</strong> any',
          '<strong>Spells:</strong> Darkness',
          '<strong>Feat:</strong> Ability Improvement - +2 Charisma',
          '<strong>Replace Spell:</strong> any unused spell -&gt; Misty Step',
          '<strong>Dance Moves:</strong> The Shuffle',
        ],
      },
      { level: 5, className: 'Rogue 1', lines: ['<strong>Expertise:</strong> Stealth'] },
    ]),
);

describe('importGamestegyGuide', () => {
  const result = importGamestegyGuide(warlockGuide, gameData, {
    url: 'https://gamestegy.com/post/bg3/1/test',
    now: new Date('2026-10-15T12:00:00Z'),
  });
  const answers = (level: number) => result.build.levels[level - 1]!.answers;
  const notesAt = (level?: number) =>
    result.notes.filter((n) => n.level === level).map((n) => n.message);

  it('names the character after the guide', () => {
    expect(result.name).toBe('Test Guide');
  });

  it('takes the first race and background, noting the others', () => {
    expect(result.build).toMatchObject({
      raceId: 'half-elf',
      subraceId: 'wood-half-elf',
      backgroundId: 'charlatan',
    });
    expect(notesAt(undefined)).toEqual([
      'Other races the guide suggests: Half-Orc.',
      'Other backgrounds the guide suggests: Noble.',
    ]);
  });

  it('works out point-buy bases and racial bonuses from final scores', () => {
    expect(result.build.abilities).toEqual({
      base: {
        strength: 8,
        dexterity: 15,
        constitution: 14,
        intelligence: 8,
        wisdom: 10,
        charisma: 15,
      },
      racialBonus: { dexterity: 1, charisma: 2 },
    });
  });

  it('places level 1 picks into the right choices', () => {
    expect(answers(1)).toEqual({
      'class:0': ['the-hexblade'],
      'class:1': ['eldritch-blast', 'booming-blade'],
      'class:2': ['wrathful-smite', 'shield'], // Shield comes from the Hexblade's expanded list
      // Deception is a Charlatan skill already, so the Warlock picks Intimidation and Arcana.
      'class-skills': ['intimidation', 'arcana'],
    });
  });

  it('takes the first of "A or B" and notes the other', () => {
    expect(answers(2)['class:1']).toEqual(['hellish-rebuke']);
    expect(notesAt(2)).toEqual(['Also suggested (spells): Hex.']);
  });

  it('places options and replacements naming both spells', () => {
    expect(answers(2)['class:0']).toEqual(['agonising-blast', 'devils-sight']);
    expect(answers(3)).toMatchObject({
      'class:0': ['pact-of-the-blade'],
      'class:2': { from: 'hellish-rebuke', to: 'cloud-of-daggers' },
    });
  });

  it('takes feats with their ability increases', () => {
    expect(answers(4)).toMatchObject({
      'class:0': ['ability-improvement'],
      'feat:0': { charisma: 2 },
    });
  });

  it('notes what it cannot settle', () => {
    expect(notesAt(4)).toEqual([
      'The guide leaves cantrips open here.',
      'Not understood: "Dance Moves: The Shuffle".',
      'Replace a spell you rarely use with Misty Step.',
    ]);
  });

  it('stops at a class the planner does not have', () => {
    expect(result.build.levels).toHaveLength(4);
    expect(notesAt(5)).toEqual([
      'Rogue is not in the planner yet, so levels from 5 on were not imported.',
    ]);
  });

  it('records the source and validates the result', () => {
    expect(result.build.source).toMatchObject({
      kind: 'gamestegy',
      url: 'https://gamestegy.com/post/bg3/1/test',
      title: 'Test Guide - Example Build',
      importedAt: '2026-10-15T12:00:00.000Z',
    });
    expect(result.build.source!.notes).toEqual(result.notes);
    expect(result.issues.map((i) => i.message)).toEqual(['Warlock – Cantrips: choose 1']);
  });
});

describe('guides the importer cannot fully read', () => {
  it('falls back to defaults without an overview, races or abilities', () => {
    const result = importGamestegyGuide(guidePage('<p>Just prose.</p>'), gameData);
    expect(result.build.raceId).toBe('human');
    expect(result.build.levels).toHaveLength(1);
    expect(result.notes.map((n) => n.message)).toEqual([
      'The guide names no race the planner knows; Human was used.',
      'The guide names no background; Acolyte was used.',
      'The guide gives no ability scores; all were left at 8.',
      'The guide has no levelling overview table, so no levels were imported.',
    ]);
  });

  it('asks for a subrace when the guide names only the race', () => {
    const result = importGamestegyGuide(guidePage(simpleTable('Races', ['Drow'])), gameData);
    expect(result.notes[0]!.message).toBe('The guide suggests Drow without a subrace; choose one.');
  });

  it('rejects pages that are not guides', () => {
    expect(() => importGamestegyGuide('<html></html>', gameData)).toThrow(GuideFormatError);
    expect(() =>
      importGamestegyGuide('<script id="__NUXT_DATA__">not json</script>', gameData),
    ).toThrow('could not be read');
  });
});

describe('isGamestegyGuideUrl', () => {
  it.each([
    ['https://gamestegy.com/post/bg3/1604/eldritch-hexknight-build', true],
    ['https://www.gamestegy.com/post/bg3/1604/eldritch-hexknight-build/', true],
    ['http://gamestegy.com/post/bg3/1604/x', false],
    ['https://gamestegy.com/bg3/build-planner', false],
    ['https://evil.example/post/bg3/1/x', false],
    ['https://gamestegy.com.evil.example/post/bg3/1/x', false],
  ])('%s → %s', (url, expected) => {
    expect(isGamestegyGuideUrl(new URL(url))).toBe(expected);
  });
});
