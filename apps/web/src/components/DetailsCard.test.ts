import { gameData } from '@bg3planner/gamedata';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { choiceTarget, describe as describeTarget, descriptionsReady } from '../lib/details';
import DetailsButton from './DetailsButton.vue';
import DetailsCard from './DetailsCard.vue';

beforeEach(() => setActivePinia(createPinia()));

describe('describe', () => {
  it('summarises spells, features, feats, options and items', async () => {
    const texts = await descriptionsReady();
    expect(describeTarget({ kind: 'spell', id: 'hex' }, texts)).toMatchObject({
      title: 'Hex',
      subtitle: 'Level 1 Enchantment · Bonus action · Concentration',
      wikiUrl: 'https://bg3.wiki/wiki/Hex',
    });
    expect(describeTarget({ kind: 'feature', id: 'action-surge' }, texts)).toMatchObject({
      subtitle: 'Action',
      lines: ['Immediately gain an extra Action to use this turn.'],
    });
    expect(describeTarget({ kind: 'feat', id: 'athlete' }, texts)!.lines[0]).toMatch(/^• Your/);
    expect(
      describeTarget({ kind: 'option', group: 'arcane-shots', id: 'banishing-arrow' }, texts),
    ).toMatchObject({ title: 'Banishing Arrow', subtitle: 'Arcane Shot' });
    expect(describeTarget({ kind: 'item', id: 'ring-of-protection' }, texts)).toMatchObject({
      subtitle: 'Rare · Ring · One of a kind',
      lines: ['Armour Class +1', 'Saving Throw +1'],
      wikiUrl: 'https://bg3.wiki/wiki/Ring_of_Protection',
    });
    expect(describeTarget({ kind: 'feat', id: 'nope' }, texts)).toBeUndefined();
  });

  it('says so while the descriptions load', () => {
    expect(describeTarget({ kind: 'spell', id: 'hex' }, null)!.lines).toEqual([
      'Loading the description…',
    ]);
  });

  it('maps picker choices to what they can describe', () => {
    const feat = gameData.classes[0]!.levels.flatMap((l) => l.choices).find(
      (c) => c.type === 'feat',
    )!;
    expect(choiceTarget(feat, 'alert')).toEqual({ kind: 'feat', id: 'alert' });
    expect(choiceTarget({ type: 'skill', count: 1 }, 'arcana')).toBeUndefined();
  });
});

describe('DetailsCard', () => {
  const Page = defineComponent(() => () => [
    h(DetailsButton, { target: { kind: 'spell', id: 'hex' } }, () => 'Hex'),
    h(DetailsButton, { target: { kind: 'feat', id: 'alert' } }, () => 'Alert'),
    h(DetailsCard),
  ]);

  it('opens beside a name, switches, and closes with Escape back to the name', async () => {
    const wrapper = mount(Page, { attachTo: document.body });
    const [hex, alert] = wrapper.findAll('button');
    await hex!.trigger('click');
    await flushPromises();
    const card = () => wrapper.find('[data-details-card]');
    expect(card().find('h2').text()).toBe('Hex');
    expect(card().text()).toContain('Disadvantage');
    expect(hex!.attributes('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(card().find('h2').element);

    await alert!.trigger('click');
    await flushPromises();
    expect(card().find('h2').text()).toBe('Alert');
    expect(hex!.attributes('aria-expanded')).toBe('false');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flushPromises();
    expect(card().exists()).toBe(false);
    expect(document.activeElement).toBe(alert!.element);
    wrapper.unmount();
  });

  it('closes when the player clicks elsewhere', async () => {
    const wrapper = mount(Page, { attachTo: document.body });
    await wrapper.find('button').trigger('click');
    await flushPromises();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await flushPromises();
    expect(wrapper.find('[data-details-card]').exists()).toBe(false);
    wrapper.unmount();
  });
});
