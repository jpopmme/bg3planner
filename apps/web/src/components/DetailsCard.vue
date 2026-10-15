<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { describe } from '../lib/details';
import { useDetailsStore } from '../stores/details';

/**
 * The details card: opens next to the name that was clicked and grows out of it, or slides up
 * as a sheet on narrow screens. It does not block the page; Escape, a click elsewhere or the
 * close button dismiss it.
 */
const store = useDetailsStore();
const id = useId();
const card = ref<HTMLElement>();
const heading = ref<HTMLElement>();

const details = computed(() => (store.target ? describe(store.target, store.texts) : undefined));

const GUTTER = 16;
const WIDTH = 340;
const position = ref<Record<string, string>>({});

/** Below the trigger when it fits, else above; never outside the viewport. */
function place() {
  const anchor = store.anchor;
  const el = card.value;
  if (!anchor || !el || window.innerWidth < 560) {
    position.value = {};
    return;
  }
  const a = anchor.getBoundingClientRect();
  const height = el.offsetHeight;
  const below = a.bottom + 8 + height <= window.innerHeight - GUTTER;
  const top = below ? a.bottom + 8 : Math.max(GUTTER, a.top - 8 - height);
  const left = Math.min(Math.max(GUTTER, a.left), window.innerWidth - GUTTER - WIDTH);
  // Grow out of the trigger.
  const originX = Math.min(Math.max(a.left + a.width / 2 - left, 0), WIDTH);
  position.value = {
    top: `${top}px`,
    left: `${left}px`,
    transformOrigin: `${originX}px ${below ? '0' : '100%'}`,
  };
}

// Opening, or switching to something else, moves focus into the card.
watch(
  () => store.target,
  async (target) => {
    if (!target) return;
    await nextTick();
    place();
    heading.value?.focus();
  },
);
// The description arriving changes the card's height.
watch(
  () => details.value?.lines,
  async () => {
    await nextTick();
    place();
  },
);

function onPointerDown(event: PointerEvent) {
  const node = event.target as Node;
  if (!store.target || card.value?.contains(node) || store.anchor?.contains(node)) return;
  store.close({ restoreFocus: false });
}
function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && store.target) store.close();
}
onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, { passive: true, capture: true });
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown);
  document.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('resize', place);
  window.removeEventListener('scroll', place, { capture: true });
});
</script>

<template>
  <Transition name="details">
    <section
      v-if="details"
      ref="card"
      class="details-card"
      role="dialog"
      :aria-labelledby="`${id}-title`"
      :style="position"
      data-details-card
    >
      <header>
        <div>
          <h2 :id="`${id}-title`" ref="heading" tabindex="-1">{{ details.title }}</h2>
          <p class="subtitle">{{ details.subtitle }}</p>
        </div>
        <button type="button" class="close" aria-label="Close details" @click="store.close()">
          ×
        </button>
      </header>
      <ul class="lines">
        <li v-for="(line, i) in details.lines" :key="i" :class="{ bullet: line.startsWith('• ') }">
          {{ line.replace(/^• /, '') }}
        </li>
      </ul>
      <a :href="details.wikiUrl" target="_blank" rel="noopener" class="wiki"
        >Read more on bg3.wiki</a
      >
    </section>
  </Transition>
</template>

<style scoped>
.details-card {
  position: fixed;
  z-index: 50;
  width: 340px;
  max-height: min(60vh, 480px);
  overflow-y: auto;
  display: grid;
  gap: 10px;
  padding: 14px 16px 16px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-panel);
  background: var(--surface);
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.08),
    0 12px 32px rgb(0 0 0 / 0.16);
}

header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}

h2 {
  font-size: 1.0625rem;
  line-height: 1.25;
  letter-spacing: -0.005em;
  outline: none;
}

.subtitle {
  margin: 2px 0 0;
  font-size: 0.875rem;
  color: var(--ink-muted);
}

.close {
  flex: none;
  width: 30px;
  height: 30px;
  padding: 0;
  margin: -4px -6px 0 0;
  border: none;
  background: none;
  font-size: 1.375rem;
  line-height: 1;
  color: var(--ink-muted);
}

.close:hover {
  color: var(--ink);
}

.lines {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
  font-size: 0.9375rem;
}

.lines .bullet {
  padding-left: 14px;
  position: relative;
}

.lines .bullet::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 0.6em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
}

.wiki {
  font-size: 0.875rem;
  justify-self: start;
}

/* Grows out of its trigger; settles without overshoot. */
.details-enter-active {
  transition:
    opacity 160ms ease-out,
    transform 200ms cubic-bezier(0.2, 0.9, 0.3, 1);
}
.details-leave-active {
  transition:
    opacity 120ms ease-in,
    transform 120ms ease-in;
}
.details-enter-from,
.details-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

@media (max-width: 559px) {
  /* A sheet along the bottom edge, rising from where it lives. */
  .details-card {
    left: 0;
    right: 0;
    bottom: 0;
    width: auto;
    max-height: 65vh;
    border-radius: var(--radius-panel) var(--radius-panel) 0 0;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }
  .details-enter-from,
  .details-leave-to {
    transform: translateY(24px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .details-enter-active,
  .details-leave-active {
    transition: opacity 120ms ease;
  }
  .details-enter-from,
  .details-leave-to {
    transform: none;
  }
}
</style>
