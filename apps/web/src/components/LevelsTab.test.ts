import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBuildStore } from '../stores/build';
import LevelsTab from './LevelsTab.vue';

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe('LevelsTab', () => {
  it('offers the last level’s class for the next level, and still lets you pick another', async () => {
    const store = useBuildStore();
    const wrapper = mount(LevelsTab);
    const next = () => wrapper.find<HTMLSelectElement>('select[name="next-class"]');

    // Changing level 1's class (no level added) moves the default with it.
    store.setLevelClass(0, 'sorcerer');
    await wrapper.vm.$nextTick();
    expect(next().element.value).toBe('sorcerer');

    await wrapper.find('[data-action="add-level"]').trigger('click');
    expect(store.build.levels.map((l) => l.classId)).toEqual(['sorcerer', 'sorcerer']);

    await next().setValue('wizard');
    await wrapper.find('[data-action="add-level"]').trigger('click');
    expect(store.build.levels.at(-1)!.classId).toBe('wizard');
    expect(next().element.value).toBe('wizard');
  });
});
