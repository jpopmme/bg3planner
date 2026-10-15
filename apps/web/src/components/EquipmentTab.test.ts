import { hexknight } from '@bg3planner/rules/fixtures';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBuildStore } from '../stores/build';
import { usePartyStore } from '../stores/party';
import EquipmentTab from './EquipmentTab.vue';

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

function setup() {
  const store = useBuildStore();
  store.name = 'Hexknight';
  store.build = structuredClone(hexknight);
  return store;
}

const slot = (wrapper: ReturnType<typeof mount>, name: string) =>
  wrapper.get(`[data-slot="${name}"]`);

describe('build store equipment', () => {
  it('sets and clears items, dropping empty acts', () => {
    const store = setup();
    store.setItem('act2', 'ring1', 'ring-of-protection');
    expect(store.build.equipment).toEqual({ act2: { ring1: 'ring-of-protection' } });
    store.setItem('act2', 'ring1', undefined);
    expect(store.build.equipment).toBeUndefined();
  });

  it('copies one act’s loadout into another', () => {
    const store = setup();
    store.setItem('act1', 'head', 'helmet-of-grit');
    store.copyLoadout('act1', 'act2');
    store.setItem('act2', 'head', 'birthright');
    expect(store.build.equipment).toEqual({
      act1: { head: 'helmet-of-grit' },
      act2: { head: 'birthright' },
    });
  });

  it('shows the sheet with the chosen act’s gear', () => {
    const store = setup();
    store.setItem('act3', 'armour', 'adamantine-splint-armour');
    expect(store.character.armourClass).toBe(13);
    store.act = 'act3';
    expect(store.character.armourClass).toBe(19); // 18 + Defence
  });

  it('keeps gear out of the scores used for point buy and feats', () => {
    const store = setup();
    store.setItem('act3', 'amulet', 'amulet-of-greater-health');
    store.act = 'act3';
    expect(store.character.abilityScores.constitution).toBe(23);
    expect(store.bareCharacter.abilityScores.constitution).toBe(14);
  });
});

describe('EquipmentTab', () => {
  it('picks an item by searching for it', async () => {
    const store = setup();
    const wrapper = mount(EquipmentTab);
    const rings = slot(wrapper, 'ring1');
    expect(rings.text()).toContain('Nothing planned');

    await rings.get('[data-action="pick-item"]').trigger('click');
    await rings.get('[data-input="item-search"]').setValue('protection');
    expect(rings.findAll('[data-item]').map((b) => b.attributes('data-item'))).toEqual([
      'ring-of-protection',
    ]);
    await rings.get('[data-item="ring-of-protection"]').trigger('click');

    expect(store.build.equipment?.act1?.ring1).toBe('ring-of-protection');
    expect(slot(wrapper, 'ring1').text()).toContain('Ring of Protection');
    expect(slot(wrapper, 'ring1').text()).toContain('Rare · Ring · one of a kind');
    expect(wrapper.get('[data-summary="armour-class"]').text()).toBe(
      'Armour Class 14 = 10 Unarmoured + 3 Dexterity + 1 Ring of Protection',
    );
  });

  it('shows rule problems next to the slot', async () => {
    const store = setup();
    store.setItem('act1', 'meleeMain', 'drakethroat-glaive');
    store.setItem('act1', 'meleeOff', 'adamantine-shield');
    const wrapper = mount(EquipmentTab);
    expect(slot(wrapper, 'meleeOff').get('.problems').text()).toBe(
      'Drakethroat Glaive needs both hands, so nothing can go in the off hand.',
    );
  });

  it('offers to start an act from the previous act’s gear', async () => {
    const store = setup();
    store.setItem('act1', 'head', 'helmet-of-grit');
    const wrapper = mount(EquipmentTab);
    expect(wrapper.find('[data-action="copy-loadout"]').exists()).toBe(false);
    await wrapper.get('[data-act="act2"]').trigger('click');
    await wrapper.get('[data-action="copy-loadout"]').trigger('click');
    expect(store.build.equipment?.act2).toEqual({ head: 'helmet-of-grit' });
  });

  it('warns when another active member plans the same unique item', async () => {
    const party = usePartyStore();
    const store = setup();
    const me = party.currentMember.id;
    const karlach = party.addMember('karlach')!;
    party.select(karlach);
    store.setItem('act1', 'amulet', 'broodmothers-revenge');
    party.select(me);
    store.setItem('act1', 'amulet', 'broodmothers-revenge');

    const wrapper = mount(EquipmentTab);
    expect(slot(wrapper, 'amulet').get('.problems').text()).toBe(
      'Karlach also plans to use it in this act, and there is only one.',
    );
    await slot(wrapper, 'amulet').get('[data-action="pick-item"]').trigger('click');
    await slot(wrapper, 'amulet').get('[data-input="item-search"]').setValue('broodmother');
    expect(slot(wrapper, 'amulet').get('[data-item]').text()).toContain('used by Karlach');
  });
});
