import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { routes } from '../router';
import { usePartyStore } from '../stores/party';
import PartyView from './PartyView.vue';

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

async function mountParty() {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push('/');
  const wrapper = mount(PartyView, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe('PartyView', () => {
  it('shows the active party with empty places, and camp', async () => {
    const { wrapper } = await mountParty();
    expect(wrapper.findAll('[data-member]')).toHaveLength(1);
    expect(wrapper.findAll('.empty-slot')).toHaveLength(3);
    expect(wrapper.text()).toContain('Nobody is waiting at camp.');
  });

  it('adds a character and opens it', async () => {
    const { wrapper, router } = await mountParty();
    await wrapper.find('select[name="new-origin"]').setValue('shadowheart');
    await wrapper.find('form.add').trigger('submit');
    await flushPromises();
    const party = usePartyStore();
    const added = party.party.members.at(-1)!;
    expect(added.name).toBe('Shadowheart');
    expect(router.currentRoute.value.path).toBe(`/c/${added.id}`);
  });

  it('marks origins that are already in the roster', async () => {
    usePartyStore().addMember('minsc');
    const { wrapper } = await mountParty();
    const minsc = wrapper.find('select[name="new-origin"] option[value="minsc"]');
    expect(minsc.attributes('disabled')).toBeDefined();
    expect(minsc.text()).toContain('already in the roster');
  });

  it('compares the active party’s bonuses', async () => {
    const party = usePartyStore();
    party.addMember('laezel');
    party.addMember('gale');
    const { wrapper } = await mountParty();
    const header = wrapper.findAll('.overview thead th').map((th) => th.text());
    expect(header.slice(0, 4)).toEqual(['Skill', 'Unnamed', "Lae'zel", 'Gale']);
    expect(wrapper.find('.overview td.best').exists()).toBe(true);
    // Humans (the default custom character and Gale) lack darkvision; Lae'zel is githyanki.
    expect(wrapper.find('.darkvision').text()).toContain("Unnamed, Lae'zel, Gale");
  });

  it('hides editing controls while viewing someone else’s party', async () => {
    const party = usePartyStore();
    party.viewing = { party: party.party, source: 'link', key: 'x' };
    const { wrapper } = await mountParty();
    expect(wrapper.find('form.add').exists()).toBe(false);
    expect(wrapper.find('[data-action="toggle-active"]').exists()).toBe(false);
    expect(wrapper.find('[data-input="party-name"]').attributes('readonly')).toBeDefined();
  });
});
