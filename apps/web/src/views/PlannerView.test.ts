import { hexknight } from '@bg3planner/rules/fixtures';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { routes } from '../router';
import { useBuildStore } from '../stores/build';
import PlannerView from './PlannerView.vue';

async function mountAt(path: string, options: { attachTo?: HTMLElement } = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  const wrapper = mount(PlannerView, { ...options, global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe('PlannerView', () => {
  it('shows a new character with what is left to choose', async () => {
    const wrapper = await mountAt('/');
    expect(wrapper.find('h1').text()).toBe('Unnamed character');
    expect(wrapper.find('.state').text()).toBe('5 choices left');
  });

  it('switches between creation and levels', async () => {
    const wrapper = await mountAt('/', { attachTo: document.body });
    const [creation, levels] = wrapper.findAll('[role="tabpanel"]');
    expect(creation!.isVisible()).toBe(true);
    expect(levels!.isVisible()).toBe(false);
    await wrapper.findAll('[role="tab"]')[1]!.trigger('click');
    expect(levels!.isVisible()).toBe(true);
    expect(levels!.findAll('[data-level]')).toHaveLength(1);
    wrapper.unmount();
  });

  it('shows a finished build’s sheet', async () => {
    const store = useBuildStore();
    store.name = 'Hexknight';
    store.build = structuredClone(hexknight);
    const wrapper = await mountAt('/');
    expect(wrapper.find('h1').text()).toBe('Hexknight');
    expect(wrapper.find('.state').text()).toBe('Every choice is made');
    expect(wrapper.find('.split .legend').text()).toContain('11 Fighter, Eldritch Knight');
    expect(wrapper.find('.vitals').text()).toContain('99');
  });
});
