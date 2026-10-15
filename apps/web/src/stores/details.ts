import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import { type DetailsTarget, descriptionsReady } from '../lib/details';

/** The one details card on screen: what it shows and the element that opened it. */
export const useDetailsStore = defineStore('details', () => {
  const target = shallowRef<DetailsTarget | null>(null);
  const anchor = shallowRef<HTMLElement | null>(null);
  /** Null until the descriptions have loaded. */
  const texts = shallowRef<Record<string, string> | null>(null);

  async function open(next: DetailsTarget, from: HTMLElement) {
    target.value = next;
    anchor.value = from;
    texts.value = await descriptionsReady();
  }

  /** Closes the card; focus goes back to what opened it unless the player moved on. */
  function close({ restoreFocus = true } = {}) {
    const from = anchor.value;
    target.value = null;
    anchor.value = null;
    if (restoreFocus) from?.focus();
  }

  return { target, anchor, texts, open, close };
});
