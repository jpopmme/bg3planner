import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBuildStore } from '../stores/build';
import IdPicker from './IdPicker.vue';

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

const slotFor = (key: string) => useBuildStore().choices.find((c) => c.key === key)!;

describe('IdPicker', () => {
  it('offers a single choice as radio buttons and records the pick', async () => {
    const wrapper = mount(IdPicker, { props: { choiceSlot: slotFor('class:0') } });
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(6);
    await wrapper.find('input[value="defence"]').setValue(true);
    expect(useBuildStore().build.levels[0]!.answers['class:0']).toEqual(['defence']);
  });

  it('disables further picks once the count is reached', async () => {
    const store = useBuildStore();
    store.setAnswer(1, 'class-skills', ['acrobatics', 'history']);
    const wrapper = mount(IdPicker, { props: { choiceSlot: slotFor('class-skills') } });
    expect(wrapper.find('legend').text()).toContain('2 of 2');
    expect(wrapper.find('input[value="perception"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('input[value="history"]').attributes('disabled')).toBeUndefined();
  });

  it('filters long lists by name', async () => {
    const wrapper = mount(IdPicker, { props: { choiceSlot: slotFor('race:0') } });
    await wrapper.find('input[type="search"]').setValue('sleight');
    expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['Sleight of Hand']);
  });

  it('keeps a pick that is no longer allowed visible so it can be removed', async () => {
    const store = useBuildStore();
    store.build.levels[0]!.answers['class:0'] = ['agonising-blast'];
    const wrapper = mount(IdPicker, { props: { choiceSlot: slotFor('class:0') } });
    const invalid = wrapper.find('li.invalid');
    expect(invalid.text()).toContain('No longer allowed here');
    await invalid.find('input').setValue(false);
    expect(store.build.levels[0]!.answers['class:0']).toBeUndefined();
  });
});
