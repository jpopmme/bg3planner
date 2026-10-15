import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePartyStore } from '../stores/party';

export const REPLACE_WARNING =
  'This replaces the party on this device, which is not saved anywhere else. ' +
  'Export it first if you want to keep it.';

/** Keeps the party store in step with the URL: which party is shown, and which character. */
export function useLinkRouting() {
  const route = useRoute();
  const router = useRouter();
  const party = usePartyStore();

  watch(
    () => route.fullPath,
    async () => {
      party.linkProblem = null;
      const name = String(route.name ?? '');
      const memberId = route.params.memberId ? String(route.params.memberId) : undefined;

      if (name.startsWith('online')) {
        const id = String(route.params.id);
        const editToken = new URLSearchParams(route.hash.slice(1)).get('edit') ?? undefined;
        if (
          editToken &&
          party.remote?.id !== id &&
          party.hasUnsavedWork &&
          !confirm(REPLACE_WARNING)
        ) {
          await router.replace('/');
          return;
        }
        const result = await party.openLink({ id, ...(editToken ? { editToken } : {}) });
        if (result === 'edit' || result === 'own') {
          // Now this device's party: continue at its own address, without the token in view.
          await router.replace(memberId ? `/c/${memberId}` : '/');
          return;
        }
        if (result === 'missing') {
          party.linkProblem = 'This link does not lead to a party. It may have been deleted.';
        }
      } else if (name.startsWith('snapshot')) {
        const result = await party.openLink({ encoded: route.hash.slice(1) });
        if (result === 'missing') party.linkProblem = 'This link is incomplete or damaged.';
      } else {
        party.stopViewing();
      }

      if (memberId) party.select(memberId);
    },
    { immediate: true },
  );
}
