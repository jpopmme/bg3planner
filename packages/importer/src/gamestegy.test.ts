import { gameData } from '@bg3planner/gamedata';
import { describe, expect, it } from 'vitest';
import { GuideFormatError, importGamestegyGuide, isGamestegyGuideUrl } from './index';
import { entity, gearTable, guidePage, overviewTable, simpleTable } from './test/guide-page';

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
      { level: 5, className: 'Artificer 1', lines: ['<strong>Expertise:</strong> Stealth'] },
    ]) +
    '<h2>Equipment Recommendations</h2>' +
    '<h3>Act 1</h3>' +
    gearTable([
      { slot: 'Melee (Two-Handed)', items: ['Drakethroat Glaive'] },
      { slot: 'Melee (One-Handed)', items: ['Shadow Blade'] },
      { slot: 'Shield', items: ['Adamantine Shield', 'Sentinel Shield'] },
      { slot: 'Armor', items: ['Dark Justiciar Half-Plate'] },
      { slot: 'Gloves', items: ['[Any good gloves]'] },
      {
        slot: 'Rings',
        items: ['Ring of Protection', '[Shadow-Cloaked Ring(BiS)]', 'Caustic Band'],
      },
    ]) +
    '<h3>Act 2 - mid-game</h3>' +
    '<h4>Setup A</h4>' +
    gearTable([{ slot: 'Head', items: ['Helmet of Grit'] }]) +
    '<h4>Setup B</h4>' +
    gearTable([{ slot: 'Head', items: ['Birthright'] }]) +
    '<h3>Act 3 - Final Build setup</h3>' +
    '<p>Keep what you have.</p>' +
    '<h2>Build Mechanics</h2>' +
    gearTable([{ slot: 'Head', items: ['Haste Helm'] }]),
);

describe('importGamestegyGuide', () => {
  const result = importGamestegyGuide(warlockGuide, gameData, {
    url: 'https://gamestegy.com/post/bg3/1/test',
    now: new Date('2026-10-15T12:00:00Z'),
  });
  const answers = (level: number) => result.build.levels[level - 1]!.answers;
  const notesAt = (level?: number) =>
    result.notes.filter((n) => n.level === level && !n.act).map((n) => n.message);
  const gearNotes = (act: string) =>
    result.notes.filter((n) => n.act === act).map((n) => n.message);

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
      'The class at level 5 ("Artificer") is not one the planner knows, so levels from 5 on were not imported.',
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

  it('fills each act with the first gear that fits, preferring a one-handed weapon', () => {
    expect(result.build.equipment?.act1).toEqual({
      meleeMain: 'shadow-blade',
      meleeOff: 'adamantine-shield',
      armour: 'dark-justiciar-half-plate-very-rare',
      ring1: 'ring-of-protection',
      ring2: 'shadow-cloaked-ring',
    });
    expect(gearNotes('act1')).toEqual([
      'Not in the item catalogue, so not placed: "Any good gloves".',
      'Melee main hand: the guide also suggests Drakethroat Glaive.',
      'Melee off hand: the guide also suggests Sentinel Shield.',
      'Rings: the guide also suggests Caustic Band.',
    ]);
  });

  it('uses the first setup and keeps earlier gear in slots an act leaves empty', () => {
    expect(result.build.equipment?.act2).toEqual({
      ...result.build.equipment?.act1,
      head: 'helmet-of-grit',
    });
    expect(gearNotes('act2')).toEqual([
      'The guide also describes Setup B; Setup A was used.',
      'Melee main hand, Melee off hand, Armour, Ring 1 and Ring 2: nothing new in the guide, so the earlier act’s gear is kept.',
    ]);
    expect(result.build.equipment?.act3).toEqual(result.build.equipment?.act2);
    expect(gearNotes('act3')).toEqual(['The guide lists no gear table for Act 3.']);
  });
});

const rogueLevel = (level: number, lines: string[] = []) => ({
  level,
  className: `Rogue ${level}`,
  lines,
});

const thiefGuide = guidePage(
  simpleTable('Races', ['Lightfoot Halfling']) +
    simpleTable('Background', ['Charlatan']) +
    overviewTable([
      rogueLevel(1, [
        'STR - 8, DEX - 17 (15+2), CON - 14, INT - 16 (15+1), WIS - 10, CHA - 8',
        '<strong>Skills:</strong> Stealth, Acrobatics, Perception, Investigation',
      ]),
      rogueLevel(2),
      rogueLevel(3),
      rogueLevel(4, ['<strong>Feat:</strong> Ability Improvement - +2 Dexterity']),
      rogueLevel(5),
      rogueLevel(6, ['<strong>Skills:</strong> Stealth/Acrobatics']),
      rogueLevel(7),
      rogueLevel(8, ['<strong>Feat:</strong> Ability Improvement - +2 Dexterity OR Alert']),
      {
        level: 9,
        className: 'Fighter 1(respec as first level)',
        lines: ['<strong>Fighting Style:</strong> Archery'],
      },
    ]),
  'Thief Rogue Build - Test',
);

describe('a single-subclass guide with a respec', () => {
  const result = importGamestegyGuide(thiefGuide, gameData);
  const answers = (level: number) => result.build.levels[level - 1]!.answers;
  const notesAt = (level?: number) =>
    result.notes.filter((n) => n.level === level && !n.act).map((n) => n.message);

  it('moves the respec class to level 1', () => {
    expect(result.build.levels.map((l) => l.classId)).toEqual([
      'fighter',
      ...Array(8).fill('rogue'),
    ]);
    expect(notesAt(undefined)).toContain(
      'The guide respecs to take Fighter first, so the build starts with it.',
    );
    expect(answers(1)).toEqual({
      'class:0': ['archery'],
      'class-skills': ['acrobatics', 'perception'],
    });
    expect(answers(2)['multiclass-skills']).toEqual(['stealth']);
    expect(notesAt(2)).toEqual(['Also suggested (skills): Investigation.']);
  });

  it('takes the subclass from the title when the overview never names it', () => {
    expect(answers(4)['class:0']).toEqual(['thief']);
    expect(notesAt(4)).toEqual(["Thief, from the guide's title."]);
  });

  it('reads a Skills line where only expertise is chosen as expertise', () => {
    expect(answers(7)['class:0']).toEqual(['stealth', 'acrobatics']);
  });

  it('falls back to the next feat when an ability would pass 20', () => {
    expect(answers(9)['class:0']).toEqual(['alert']);
    expect(notesAt(9)).toEqual([
      'Other feats the guide suggests: Ability Improvement - +2 Dexterity.',
    ]);
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });
});

describe('a guide with a respec plan', () => {
  const clericLevel = (level: number, lines: string[] = []) => ({
    level,
    className: `Cleric ${level}`,
    lines,
  });
  const result = importGamestegyGuide(
    guidePage(
      simpleTable('Races', ['Wood Half-Elf']) +
        overviewTable([
          clericLevel(1, [
            '<strong>Subclass:</strong> Light Domain',
            'STR - 8, DEX - 16, CON - 15, INT - 8, WIS - 17, CHA - 8',
          ]),
          clericLevel(2),
          clericLevel(3),
          clericLevel(4, [
            '<strong>Feat:</strong> Ability Improvement - +1 Wisdom, +1 Constitution',
          ]),
          {
            level: 5,
            className: 'Sorcerer 1',
            lines: ['<strong>Subclass:</strong> Storm Sorcery'],
          },
          {
            level: 6,
            className: 'Respec Character:Level 1 - SorcererLevel 2-5 - ClericLevel 6 - Monk',
            lines: [],
          },
          { level: 7, className: 'Monk 2', lines: [] },
        ]),
      'Radiant Monk Build - Test',
    ),
    gameData,
  );

  it('puts the levels in the order the respec header gives', () => {
    expect(result.build.levels.map((l) => l.classId)).toEqual([
      'sorcerer',
      'cleric',
      'cleric',
      'cleric',
      'cleric',
      'monk',
      'monk',
    ]);
    expect(result.build.levels[1]!.answers['class:0']).toEqual(['light-domain']);
  });

  it('reads "+1 Wisdom, +1 Constitution" as one feat', () => {
    expect(result.build.levels[4]!.answers).toMatchObject({
      'class:0': ['ability-improvement'],
      'feat:0': { wisdom: 1, constitution: 1 },
    });
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
      'The guide has no gear recommendations by act, so no equipment was imported.',
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
