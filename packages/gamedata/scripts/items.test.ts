import { describe, expect, it } from 'vitest';
import {
  type CargoEquipmentRow,
  type CargoWeaponRow,
  specialEffects,
  statEffects,
  toItems,
} from './items';
import { wikiToText } from './wikitext';

const icon = (name: string) =>
  `&lt;span class=&quot;bg3wiki-icontext-icon nowrap&quot; &gt;&lt;span class=&quot;bg3wiki-hidden-code&quot;&gt;&lt;/span&gt;[[File:${name} Icon.png|x25px|link=${name}|alt=[[${name}]]|class=bg3wiki-icon]]&lt;/span&gt;&amp;#8239;`;

const equipment = (overrides: Partial<CargoEquipmentRow>): CargoEquipmentRow => ({
  page: 'Ring of Protection',
  name: 'Ring of Protection',
  uid: 'MAG_PHB_Ring_Of_Protection',
  type: 'Rings',
  proficiency: null,
  'armour class': null,
  'armour class bonus': null,
  'stealth disadvantage': 0,
  rarity: 'rare',
  passives: [''],
  special: `* ${icon('Armour Class')}[[Armour Class|Armour Class]] +1\n* [[Saving Throw]]s +1`,
  legacy: null,
  ...overrides,
});

const weapon = (overrides: Partial<CargoWeaponRow>): CargoWeaponRow => ({
  page: 'Rhapsody',
  name: 'Rhapsody',
  uid: 'UNI_Cazador_RitualDagger',
  type: 'Daggers',
  rarity: 'very rare',
  enchantment: 1,
  damage: '1d4 + 1',
  'damage type': 'Piercing',
  'versatile damage': null,
  'extra damage': null,
  'extra damage type': null,
  finesse: 1,
  heavy: 0,
  light: 1,
  reach: 0,
  thrown: 1,
  'weapon passives': ['Scarlet Remittance', ' Sweet Bloodletting'],
  'special weapon actions': [''],
  special: '',
  legacy: null,
  ...overrides,
});

describe('wikiToText', () => {
  it('drops icons, links, markup and footnotes', () => {
    expect(
      wikiToText(
        `${icon('Saving Throw')}'''[[Saving Throw]]s''' +1&lt;sup&gt;&amp;#91;[[:X#Bugs|See: Bugs]]&amp;#93;&lt;/sup&gt;`,
      ),
    ).toBe('Saving Throws +1');
  });

  it('tidies brackets that icons leave behind', () => {
    expect(wikiToText(`Scarlet Feast (${icon('Action')})`)).toBe('Scarlet Feast');
    expect(wikiToText('Knock (&amp;plus; )')).toBe('Knock');
    expect(wikiToText('In combat. ( Recharge: [[Long rest]].)')).toBe(
      'In combat. (Recharge: Long rest.)',
    );
  });

  it('keeps words apart where an icon stood between them', () => {
    expect(wikiToText(`deal 2d8${icon('Fire')}Fire damage`)).toBe('deal 2d8 Fire damage');
  });

  it('decodes entities escaped several times', () => {
    expect(wikiToText('from &amp;amp;nbsp;Scarlet Remittance')).toBe('from Scarlet Remittance');
  });
});

describe('specialEffects', () => {
  it('splits bullets into lines', () => {
    expect(specialEffects(equipment({}).special)).toEqual(['Armour Class +1', 'Saving Throws +1']);
  });

  it('skips the "no special properties" filler', () => {
    expect(specialEffects('* No special properties, beyond the enchantment.')).toEqual([]);
    expect(specialEffects(null)).toEqual([]);
  });
});

describe('statEffects', () => {
  it('reads Armour Class, ability, saving throw and skill changes', () => {
    expect(
      statEffects([
        'Armour Class +2',
        "Sets the wearer's Constitution score to 23. The enchantment has no effect if higher.",
        "Set the wearer's Strength to 23.",
        'Charisma +2 (up to 22)',
        'Constitution +2, up to 20',
        'Wisdom -1',
        'Saving Throws +1',
        'Dexterity Saving Throws +1.',
        'Sleight of Hand +1',
        'Advantage on Constitution Saving Throws.',
      ]),
    ).toEqual({
      armourClassBonus: 2,
      abilityEffects: [
        { ability: 'constitution', set: 23 },
        { ability: 'strength', set: 23 },
        { ability: 'charisma', add: 2, max: 22 },
        { ability: 'constitution', add: 2, max: 20 },
        { ability: 'wisdom', add: -1 },
      ],
      savingThrowBonus: { all: 1, dexterity: 1 },
      skillBonus: { 'sleight-of-hand': 1 },
    });
  });

  it('returns nothing for effects it cannot read', () => {
    expect(statEffects(['Attackers cannot land critical hits on the wearer.'])).toEqual({});
  });
});

describe('toItems', () => {
  it('maps accessories and their Armour Class bonus', () => {
    expect(toItems([equipment({})], [])).toEqual([
      {
        id: 'ring-of-protection',
        name: 'Ring of Protection',
        kind: 'ring',
        rarity: 'rare',
        unique: true,
        armourClassBonus: 1,
        savingThrowBonus: { all: 1 },
        effects: ['Armour Class +1', 'Saving Throws +1'],
        passives: [],
        wikiPage: 'Ring of Protection',
      },
    ]);
  });

  it('maps armour, robes and shields', () => {
    const [shield, armour, robe] = toItems(
      [
        equipment({
          page: 'Armour of Agility',
          name: 'Armour of Agility',
          type: 'Medium Armour',
          'armour class': 17,
          passives: ['Exotic Material'],
          special: '',
        }),
        equipment({
          page: 'Potent Robe',
          name: 'Potent Robe',
          type: 'Clothing',
          'armour class': 10,
        }),
        equipment({
          page: 'Shield +1',
          name: 'Shield +1',
          type: 'Shields',
          rarity: 'uncommon',
          'armour class bonus': 3,
        }),
      ],
      [],
    ).sort((a, b) => b.kind.localeCompare(a.kind));
    expect(armour).toMatchObject({
      kind: 'armour',
      proficiency: 'medium',
      armourClass: 17,
      noDexterityCap: true,
      stealthDisadvantage: false,
    });
    expect(armour).not.toHaveProperty('armourClassBonus');
    expect(robe).toMatchObject({ kind: 'armour', proficiency: null, armourClassBonus: 1 });
    expect(shield).toMatchObject({ kind: 'shield', shieldBonus: 3, unique: false });
  });

  it('maps weapons', () => {
    expect(toItems([], [weapon({ 'extra damage': '1d4', 'extra damage type': 'Fire' })])).toEqual([
      {
        id: 'rhapsody',
        name: 'Rhapsody',
        kind: 'weapon',
        rarity: 'very rare',
        unique: true,
        weaponType: 'daggers',
        enchantment: 1,
        damage: '1d4 + 1 Piercing + 1d4 Fire',
        properties: ['finesse', 'light', 'thrown'],
        effects: [],
        passives: ['Scarlet Remittance', 'Sweet Bloodletting'],
        wikiPage: 'Rhapsody',
      },
    ]);
  });

  it('leaves out items players cannot get, vanity slots and repeated pages', () => {
    const items = toItems(
      [
        equipment({}),
        equipment({ uid: 'other' }),
        equipment({ page: 'Old Ring', name: 'Old Ring', legacy: 'unobtainable' }),
        equipment({ page: 'Lute', name: 'Lute', type: 'Musical Instruments' }),
      ],
      [],
    );
    expect(items.map((i) => i.id)).toEqual(['ring-of-protection']);
  });

  it('keys items that share a name by their page title', () => {
    const items = toItems(
      [
        equipment({
          page: 'Dark Justiciar Gauntlets (Rare)',
          name: 'Dark Justiciar Gauntlets',
          type: 'Gloves',
        }),
        equipment({
          page: 'Dark Justiciar Gauntlets (Uncommon)',
          name: 'Dark Justiciar Gauntlets',
          type: 'Gloves',
        }),
      ],
      [],
    );
    expect(items.map((i) => [i.id, i.name])).toEqual([
      ['dark-justiciar-gauntlets-rare', 'Dark Justiciar Gauntlets (Rare)'],
      ['dark-justiciar-gauntlets-uncommon', 'Dark Justiciar Gauntlets (Uncommon)'],
    ]);
  });

  it('treats common, generic, summoned and widespread items as not unique', () => {
    const unique = (rows: CargoWeaponRow[], locations = 0) =>
      toItems(
        [],
        rows,
        Array.from({ length: locations }, () => ({ uid: rows[0]!.uid })),
      ).map((i) => i.unique);
    expect(unique([weapon({})], 1)).toEqual([true]);
    expect(unique([weapon({})], 5)).toEqual([false]);
    expect(unique([weapon({ rarity: 'common' })])).toEqual([false]);
    expect(unique([weapon({ page: 'Dagger +1', name: 'Dagger +1', rarity: 'uncommon' })])).toEqual([
      false,
    ]);
    expect(unique([weapon({ page: 'Shadow Blade (weapon)', name: 'Shadow Blade' })])).toEqual([
      false,
    ]);
  });

  it('rejects unknown rarities and id clashes', () => {
    expect(() => toItems([equipment({ rarity: 'mythic' })], [])).toThrow(/rarity "mythic"/);
    expect(() =>
      toItems(
        [equipment({}), equipment({ page: 'Ring of Protection!', name: 'Ring of Protection!' })],
        [],
      ),
    ).toThrow(/Item id "ring-of-protection"/);
  });
});
