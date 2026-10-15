import { hexknight } from '@bg3planner/rules/fixtures';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBuildStore } from '../stores/build';
import PlannerView from './PlannerView.vue';

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe('PlannerView', () => {
  it('shows a new character with what is left to choose', () => {
    const wrapper = mount(PlannerView);
    expect(wrapper.find('h1').text()).toBe('Unnamed character');
    expect(wrapper.find('.state').text()).toBe('5 choices left');
  });

  it('switches between creation and levels', async () => {
    const wrapper = mount(PlannerView, { attachTo: document.body });
    const [creation, levels] = wrapper.findAll('[role="tabpanel"]');
    expect(creation!.isVisible()).toBe(true);
    expect(levels!.isVisible()).toBe(false);
    await wrapper.findAll('[role="tab"]')[1]!.trigger('click');
    expect(levels!.isVisible()).toBe(true);
    expect(levels!.findAll('[data-level]')).toHaveLength(1);
    wrapper.unmount();
  });

  it('shows a finished build’s sheet', () => {
    const store = useBuildStore();
    store.name = 'Hexknight';
    store.build = structuredClone(hexknight);
    const wrapper = mount(PlannerView);
    expect(wrapper.find('h1').text()).toBe('Hexknight');
    expect(wrapper.find('.state').text()).toBe('Every choice is made');
    expect(wrapper.find('.split .legend').text()).toContain('11 Fighter, Eldritch Knight');
    expect(wrapper.find('.vitals').text()).toContain('99');
  });
});
