import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBuildStore } from '../stores/build';
import ReplacePicker from './ReplacePicker.vue';

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe('ReplacePicker', () => {
  it('lists spells the character already knows as disabled replacements', () => {
    const store = useBuildStore();
    store.setLevelClass(0, 'sorcerer');
    for (let i = 0; i < 5; i++) store.addLevel('sorcerer');
    store.setAnswer(5, 'class:0', ['counterspell']);
    const slot = store.choices.find((c) => c.characterLevel === 6 && c.key === 'class:1')!;
    const wrapper = mount(ReplacePicker, { props: { choiceSlot: slot } });
    const known = wrapper.find('optgroup[label="Already known"] option[value="counterspell"]');
    expect(known.text()).toBe('Counterspell (Sorcerer)');
    expect(known.attributes('disabled')).toBeDefined();
    expect(wrapper.find('optgroup ~ option[value="counterspell"]').exists()).toBe(false);
  });
});
