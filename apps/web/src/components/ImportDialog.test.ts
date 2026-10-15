import { gameData } from '@bg3planner/gamedata';
import { importGamestegyGuide } from '@bg3planner/importer';
import { entity, guidePage, overviewTable, simpleTable } from '@bg3planner/importer/test-helpers';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { routes } from '../router';
import { usePartyStore } from '../stores/party';
import PartyView from '../views/PartyView.vue';

const imported = importGamestegyGuide(
  guidePage(
    simpleTable('Races', ['Half-Orc']) +
      simpleTable('Background', ['Soldier']) +
      overviewTable([
        {
          level: 1,
          className: 'Warlock 1',
          lines: [
            'Subclass: The Hexblade',
            `Cantrips: ${entity('Eldritch Blast')}, Friends`,
            'Spells: any',
          ],
        },
      ]),
    'Hexblade Warlock - Test Build',
  ),
  gameData,
  { url: 'https://gamestegy.com/post/bg3/1/test' },
);

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  // happy-dom has no <dialog> modal support.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});
afterEach(() => vi.unstubAllGlobals());

describe('importing a guide', () => {
  it('reviews the import, then adds the character with its notes', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => new Response(JSON.stringify(imported), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push('/');
    const wrapper = mount(PartyView, { global: { plugins: [router] }, attachTo: document.body });

    await wrapper.find('[data-action="import-guide"]').trigger('click');
    await wrapper
      .find('[data-input="guide-url"]')
      .setValue('https://gamestegy.com/post/bg3/1/test');
    await wrapper.find('form.url').trigger('submit');
    await flushPromises();

    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({
      url: 'https://gamestegy.com/post/bg3/1/test',
    });
    expect(wrapper.find('#import-heading').text()).toBe('Hexblade Warlock');
    expect(wrapper.find('[data-summary]').text()).toContain('Level 1: 1 The Hexblade');
    expect(wrapper.find('.notes').text()).toContain('The guide leaves spells open here.');

    await wrapper.find('[data-action="add-imported"]').trigger('click');
    await flushPromises();
    const party = usePartyStore();
    const member = party.party.members.at(-1)!;
    expect(member.name).toBe('Hexblade Warlock');
    expect(member.build.source?.url).toBe('https://gamestegy.com/post/bg3/1/test');
    expect(party.party.activeMemberIds).toContain(member.id);
    expect(router.currentRoute.value.path).toBe(`/c/${member.id}`);
    wrapper.unmount();
  });

  it('shows why an import failed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: 'Gamestegy answered HTTP 403.' }), { status: 502 }),
      ),
    );
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push('/');
    const wrapper = mount(PartyView, { global: { plugins: [router] }, attachTo: document.body });
    await wrapper.find('[data-action="import-guide"]').trigger('click');
    await wrapper
      .find('[data-input="guide-url"]')
      .setValue('https://gamestegy.com/post/bg3/1/test');
    await wrapper.find('form.url').trigger('submit');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toBe('Gamestegy answered HTTP 403.');
    wrapper.unmount();
  });
});
