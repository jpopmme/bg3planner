import { computed } from 'vue';
import { useRoute } from 'vue-router';

/** Paths within the party currently on screen (own, online link or snapshot). */
export function usePartyPaths() {
  const route = useRoute();
  const kind = computed(() => {
    const name = String(route.name ?? '');
    return name.startsWith('online') ? 'online' : name.startsWith('snapshot') ? 'snapshot' : 'own';
  });
  const base = computed(() =>
    kind.value === 'online'
      ? `/p/${String(route.params.id)}`
      : kind.value === 'snapshot'
        ? '/s'
        : '',
  );
  // Snapshot links keep the packed party in the hash, so it travels with every link.
  const hash = computed(() => (kind.value === 'snapshot' ? route.hash : ''));

  return {
    kind,
    partyPath: computed(() => `${base.value || '/'}${hash.value}`),
    memberPath: (memberId: string) => `${base.value}/c/${memberId}${hash.value}`,
  };
}
