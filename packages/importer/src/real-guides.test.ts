import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gameData } from '@bg3planner/gamedata';
import { deriveCharacter, equipmentIssues } from '@bg3planner/rules';
import { describe, expect, it } from 'vitest';
import { importGamestegyGuide } from './index';

// Real guide pages are Gamestegy's content, so they stay out of the repository: save them under
// fixtures/private/ to run these checks. CI runs the synthetic guides in gamestegy.test.ts.
const fixture = (name: string) =>
  fileURLToPath(new URL(`../fixtures/private/${name}.html`, import.meta.url));
const load = (name: string) => importGamestegyGuide(readFileSync(fixture(name), 'utf8'), gameData);

describe.skipIf(!existsSync(fixture('eldritch-hexknight')))('Eldritch Hexknight guide', () => {
  const result = load('eldritch-hexknight');
  const { build } = result;
  const character = deriveCharacter(build, gameData);

  it('imports race, background and abilities', () => {
    expect(build).toMatchObject({ raceId: 'half-orc', backgroundId: 'noble' });
    expect(build.abilities).toEqual({
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

  it('imports twelve levels as 11 Eldritch Knight / 1 Hexblade', () => {
    expect(build.levels).toHaveLength(12);
    expect(character.classes.map((c) => [c.subclass?.id, c.level])).toEqual([
      ['eldritch-knight', 11],
      ['the-hexblade', 1],
    ]);
    expect(character.spellSlots).toEqual({ slots: [4, 3], pact: { count: 1, level: 1 } });
  });

  it('imports feats and spells', () => {
    expect(character.feats.map((f) => [f.id, f.characterLevel])).toEqual([
      ['savage-attacker', 4],
      ['ability-improvement', 6],
      ['actor', 8],
    ]);
    expect(character.abilityScores.charisma).toBe(20); // 17, +2 at level 6, +1 from Actor
    expect(character.spells.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        'shield',
        'longstrider',
        'darkness',
        'shadow-blade',
        'booming-blade',
      ]),
    );
  });

  it('lists what the guide leaves open', () => {
    const messages = result.notes.map((n) => `${n.level ?? '-'}: ${n.message}`);
    expect(messages).toContain('8: Replace a spell you rarely use with Misty Step.');
    expect(messages).toContain('4: The guide leaves spells open here.');
    expect(result.issues.every((i) => i.severity === 'warning')).toBe(true);
  });

  it('imports the gear of Acts 2 and 3, which the rules accept', () => {
    expect(build.equipment?.act1).toBeUndefined(); // the guide recommends none
    expect(build.equipment?.act2).toMatchObject({
      meleeMain: 'shadow-blade',
      meleeOff: 'knife-of-the-undermountain-king',
      armour: 'dark-justiciar-half-plate-very-rare',
      ring1: 'shadow-cloaked-ring',
      ring2: 'strange-conduit-ring',
    });
    expect(build.equipment?.act3).toMatchObject({
      meleeMain: 'shadow-blade',
      meleeOff: 'rhapsody',
      head: 'helmet-of-grit',
      amulet: 'amulet-of-greater-health',
    });
    expect(Object.keys(build.equipment?.act3 ?? {})).toHaveLength(11); // all but the ranged off hand
    expect(equipmentIssues(build, gameData, character)).toEqual([]);
    expect(deriveCharacter(build, gameData, { act: 'act3' }).hitPoints).toBe(147);
  });
});

describe.skipIf(!existsSync(fixture('hexblade-warlock')))('Hexblade Warlock guide', () => {
  const result = load('hexblade-warlock');
  const character = deriveCharacter(result.build, gameData);

  it('imports every level, invocation, replacement and the arcanum', () => {
    expect(character.classes).toEqual([
      expect.objectContaining({
        id: 'warlock',
        level: 12,
        subclass: expect.objectContaining({ id: 'the-hexblade' }),
      }),
    ]);
    expect(character.options['eldritch-invocations']).toEqual([
      'agonising-blast',
      'devils-sight',
      'repelling-blast',
      'fiendish-vigour',
      'beguiling-influence',
      'lifedrinker',
    ]);
    expect(character.spells.some((s) => s.id === 'create-undead' && s.kind === 'extra')).toBe(true);
    expect(character.spells.some((s) => s.id === 'hellish-rebuke')).toBe(false); // replaced
    expect(result.issues.map((i) => i.message)).toEqual(['Warlock – Cantrips: choose 1']);
  });

  it('imports all three acts of gear the Hexblade is proficient with', () => {
    expect(Object.keys(result.build.equipment ?? {})).toEqual(['act1', 'act2', 'act3']);
    expect(equipmentIssues(result.build, gameData, character)).toEqual([]);
  });
});

describe.skipIf(!existsSync(fixture('two-handed-eldritch-knight')))(
  'Two-handed Eldritch Knight guide',
  () => {
    const result = load('two-handed-eldritch-knight');

    it('uses the first of two ability setups', () => {
      expect(result.build.abilities.racialBonus).toEqual({ strength: 2, intelligence: 1 });
    });

    it('falls back to the next suggested feat when the first is taken', () => {
      expect(result.build.levels[7]!.answers).toMatchObject({
        'class:0': ['athlete'],
        'feat:0': { strength: 1 },
      });
    });
  },
);

/** Class, subclass and level of each class, in the order taken. */
const classesOf = (name: string) =>
  deriveCharacter(load(name).build, gameData).classes.map(
    (c) => `${c.id}/${c.subclass?.id ?? '-'} ${c.level}`,
  );
const notesOf = (name: string) => load(name).notes.map((n) => `${n.level ?? '-'}: ${n.message}`);

describe.skipIf(!existsSync(fixture('thief-build')))('Thief guide', () => {
  const result = load('thief-build');
  const character = deriveCharacter(result.build, gameData);

  it('takes the subclass from the title and the expertise from a Skills line', () => {
    expect(classesOf('thief-build')).toEqual(['rogue/thief 11', 'fighter/- 1']);
    expect(character.expertise).toEqual(['deception', 'persuasion']);
  });

  it('takes Alert where +2 Dexterity would pass 20', () => {
    expect(character.feats.map((f) => f.id)).toEqual([
      'ability-improvement',
      'sharpshooter',
      'alert',
    ]);
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });
});

describe.skipIf(!existsSync(fixture('arcane-trickster-build')))('Arcane Trickster guide', () => {
  it('starts with the Fighter level the guide respecs into', () => {
    expect(classesOf('arcane-trickster-build')).toEqual([
      'fighter/- 1',
      'rogue/arcane-trickster 11',
    ]);
    expect(notesOf('arcane-trickster-build')).toContain(
      '-: The guide respecs to take Fighter first, so the build starts with it.',
    );
  });
});

describe.skipIf(!existsSync(fixture('valour-bard-build')))('Valour Bard guide', () => {
  it('reads "Respec Character: Level 1 - Cleric 1" as a Cleric level first', () => {
    expect(classesOf('valour-bard-build')).toEqual([
      'cleric/light-domain 2',
      'bard/college-of-valour 10',
    ]);
    const spells = deriveCharacter(load('valour-bard-build').build, gameData).spells;
    expect(spells.filter((s) => s.kind === 'extra').map((s) => s.id)).toEqual([
      'counterspell',
      'spirit-guardians',
    ]);
  });
});

describe.skipIf(!existsSync(fixture('blaster-tempest-cleric-build')))(
  'Tempest Cleric guide',
  () => {
    const character = deriveCharacter(load('blaster-tempest-cleric-build').build, gameData);

    it('grants the domain spells and notes the spells to prepare', () => {
      expect(classesOf('blaster-tempest-cleric-build')).toEqual([
        'sorcerer/storm-sorcery 3',
        'cleric/tempest-domain 9',
      ]);
      expect(character.spells.filter((s) => s.kind === 'granted').map((s) => s.id)).toEqual(
        expect.arrayContaining(['thunderwave', 'fog-cloud', 'destructive-wave', 'insect-plague']),
      );
      expect(notesOf('blaster-tempest-cleric-build')).toContain(
        '2: Spells to prepare: Guiding Bolt, Command, Inflict Wounds, Sanctuary, Healing Word.',
      );
    });
  },
);

describe.skipIf(!existsSync(fixture('land-druid-build')))('Circle of the Land guide', () => {
  it('chooses a land at each circle-spell level', () => {
    const character = deriveCharacter(load('land-druid-build').build, gameData);
    expect(character.options).toMatchObject({
      'land-circle-spells-3': ['underdark'],
      'land-circle-spells-5': ['desert'],
      'land-circle-spells-7': ['underdark'],
      'land-circle-spells-9': ['arctic'],
    });
    expect(notesOf('land-druid-build')).toContain(
      '2: Spells to prepare: Healing Word, Create or Destroy Water, Ice Knife, Faerie Fire.',
    );
  });
});

describe.skipIf(!existsSync(fixture('hunter-ranger-archer-build')))('Hunter Ranger guide', () => {
  it('places favoured enemies, natural explorers and hunter options', () => {
    const character = deriveCharacter(load('hunter-ranger-archer-build').build, gameData);
    expect(classesOf('hunter-ranger-archer-build')).toEqual([
      'ranger/hunter 11',
      'cleric/war-domain 1',
    ]);
    expect(character.options).toEqual({
      'ranger-favoured-enemies': ['bounty-hunter', 'ranger-knight'],
      'ranger-natural-explorers': ['urban-tracker', 'wasteland-wanderer-fire'],
      'fighting-styles': ['archery'],
      'hunters-prey': ['horde-breaker'],
      'hunter-defensive-tactics': ['multiattack-defence'],
    });
  });
});

describe.skipIf(!existsSync(fixture('oath-of-crown-paladin-build')))(
  'Oath of the Crown guide',
  () => {
    it('grants the oath spells', () => {
      const character = deriveCharacter(load('oath-of-crown-paladin-build').build, gameData);
      expect(classesOf('oath-of-crown-paladin-build')).toEqual([
        'paladin/oath-of-the-crown 11',
        'warlock/the-hexblade 1',
      ]);
      expect(character.spells.filter((s) => s.kind === 'granted').map((s) => s.id)).toEqual([
        'command',
        'compelled-duel',
        'warding-bond',
        'spiritual-weapon',
        'spirit-guardians',
        'crusaders-mantle',
      ]);
    });
  },
);

describe.skipIf(!existsSync(fixture('draconic-bloodline-sorcerer-build')))(
  'Draconic Sorcerer guide',
  () => {
    it('places the ancestry and metamagic', () => {
      const character = deriveCharacter(load('draconic-bloodline-sorcerer-build').build, gameData);
      expect(character.options).toEqual({
        'sorcerer-draconic-ancestry': ['blue'],
        'sorcerer-metamagic': [
          'twinned-spell',
          'distant-spell',
          'quickened-spell',
          'heightened-spell',
        ],
      });
    });
  },
);

describe.skipIf(!existsSync(fixture('gale-evocation-wizard-build')))(
  'Evocation Wizard guide',
  () => {
    it('matches "Evocation" to the school and notes scrolls to copy', () => {
      expect(classesOf('gale-evocation-wizard-build')).toEqual([
        'cleric/tempest-domain 2',
        'wizard/evocation-school 10',
      ]);
      expect(notesOf('gale-evocation-wizard-build')).toContain(
        '4: Spells to copy from scrolls: Misty Step, See Invisibility, Blindness, Hold Person.',
      );
    });
  },
);

describe.skipIf(!existsSync(fixture('giant-barbarian-build')))('Giant Barbarian guide', () => {
  it('matches "Giant" to Path of Giants, whose Thaumaturgy is innate', () => {
    const character = deriveCharacter(load('giant-barbarian-build').build, gameData);
    expect(classesOf('giant-barbarian-build')).toEqual(['barbarian/giant 10', 'fighter/- 2']);
    expect(character.spells.map((s) => [s.id, s.kind])).toEqual([['thaumaturgy', 'innate']]);
  });
});

describe.skipIf(!existsSync(fixture('radiating-armored-monk')))('Radiating Monk guide', () => {
  it('follows the respec header to Sorcerer 1, Cleric 5, Monk 6', () => {
    expect(classesOf('radiating-armored-monk')).toEqual([
      'sorcerer/storm-sorcery 1',
      'cleric/light-domain 5',
      'monk/way-of-the-open-hand 6',
    ]);
    const character = deriveCharacter(load('radiating-armored-monk').build, gameData);
    expect(character.feats.map((f) => f.id)).toEqual([
      'ability-improvement',
      'ability-improvement',
    ]);
  });
});
