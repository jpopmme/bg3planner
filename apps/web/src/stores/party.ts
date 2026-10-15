import { type Party, type PartyMember, migrateParty, partyOf } from '@bg3planner/rules';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import {
  ApiError,
  type RemoteParty,
  createParty,
  deleteParty,
  getParty,
  saveParty,
} from '../lib/api';
import { decodeParty, encodeParty } from '../lib/share';
import { newBuild } from './new-build';

const STORAGE_KEY = 'bg3planner:party';
/** Where the single-character planner (M3) kept its draft; read once and migrated. */
const LEGACY_DRAFT_KEY = 'bg3planner:draft';
const SYNC_DELAY_MS = 1500;

/** The server copy this device's party is linked to. */
export interface RemoteLink {
  id: string;
  editToken: string;
  /** Revision of the server copy our last sync was based on. */
  revision: number;
}

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'conflict';

/** Someone else's party opened from a link: shown read-only until copied. */
export interface Viewing {
  party: Party;
  source: 'server' | 'link';
}

interface Saved {
  party: Party;
  activeId: string;
  remote: RemoteLink | null;
  /** Changes not yet on the server. */
  dirty: boolean;
}

const freshParty = () => partyOf({ name: '', build: newBuild() });
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function readStorage(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

/** This device's saved party, upgraded if needed; falls back to the M3 draft, then to nothing. */
function loadSaved(): Saved | undefined {
  const saved = readStorage(STORAGE_KEY) as Partial<Saved> | undefined;
  if (saved) {
    const result = migrateParty(saved.party);
    if (result.ok) {
      const activeId = result.party.members.some((m) => m.id === saved.activeId)
        ? saved.activeId!
        : result.party.members[0]!.id;
      return {
        party: result.party,
        activeId,
        remote: saved.remote ?? null,
        dirty: saved.dirty ?? false,
      };
    }
  }
  const draft = readStorage(LEGACY_DRAFT_KEY);
  if (draft) {
    const result = migrateParty(draft);
    if (result.ok) {
      return {
        party: result.party,
        activeId: result.party.members[0]!.id,
        remote: null,
        dirty: false,
      };
    }
  }
  return undefined;
}

export const usePartyStore = defineStore('party', () => {
  const saved = loadSaved();
  const party = ref<Party>(saved?.party ?? freshParty());
  const activeId = ref(saved?.activeId ?? party.value.members[0]!.id);
  const remote = ref<RemoteLink | null>(saved?.remote ?? null);
  const dirty = ref(saved?.dirty ?? false);
  const status = ref<SyncStatus>(remote.value ? (dirty.value ? 'offline' : 'synced') : 'local');
  const conflict = ref<RemoteParty | null>(null);
  const viewing = ref<Viewing | null>(null);
  const lastError = ref<string | null>(null);

  /** The character being shown: the viewed party's first member, or our active one. */
  const currentMember = computed<PartyMember>(
    () =>
      viewing.value?.party.members[0] ??
      party.value.members.find((m) => m.id === activeId.value) ??
      party.value.members[0]!,
  );
  const readOnly = computed(() => viewing.value !== null);
  /** True when this device holds work that exists nowhere else and would be lost if replaced. */
  const hasUnsavedWork = computed(() => {
    if (remote.value) return false;
    const [only, ...others] = party.value.members;
    return (
      others.length > 0 ||
      !!only?.name ||
      JSON.stringify(only?.build) !== JSON.stringify(newBuild())
    );
  });

  // ---- Saving on this device ------------------------------------------------------------

  function persist() {
    try {
      const data: Saved = {
        party: party.value,
        activeId: activeId.value,
        remote: remote.value,
        dirty: dirty.value,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.removeItem(LEGACY_DRAFT_KEY);
    } catch {
      // Storage can be unavailable (private mode, quota); the planner still works for this visit.
    }
  }
  if (saved) persist(); // writes a migrated legacy draft in the new format

  /** Counts edits, so a sync can tell whether more happened while it was running. */
  let editCount = 0;
  let applyingRemote = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  watch(
    party,
    () => {
      if (applyingRemote) return;
      editCount++;
      if (remote.value) {
        dirty.value = true;
        // Say so straight away: "Saved online" would be untrue until the delayed save runs.
        if (status.value !== 'conflict') status.value = 'syncing';
        scheduleSync();
      }
      persist();
    },
    // Synchronous, so `applyingRemote` is still set while server data is being applied.
    { deep: true, flush: 'sync' },
  );
  watch([activeId, remote, dirty], persist, { deep: true });

  function replaceParty(next: Party, link: RemoteLink | null) {
    applyingRemote = true;
    party.value = next;
    applyingRemote = false;
    activeId.value = next.members[0]!.id;
    remote.value = link;
    dirty.value = false;
    conflict.value = null;
    status.value = link ? 'synced' : 'local';
    persist();
  }

  // ---- Syncing with the server ----------------------------------------------------------

  function scheduleSync() {
    clearTimeout(timer);
    timer = setTimeout(() => void sync(), SYNC_DELAY_MS);
  }

  let syncing: Promise<void> | null = null;

  /** Sends unsynced changes to the server. Safe to call at any time. */
  function sync(): Promise<void> {
    if (syncing) return syncing;
    const link = remote.value;
    if (!link || !dirty.value || status.value === 'conflict') return Promise.resolve();

    syncing = (async () => {
      status.value = 'syncing';
      const sentAt = editCount;
      try {
        const res = await saveParty(link.id, link.editToken, clone(party.value), link.revision);
        link.revision = res.revision;
        lastError.value = null;
        if (editCount === sentAt) {
          dirty.value = false;
          status.value = 'synced';
        } else {
          status.value = 'offline';
          scheduleSync(); // more edits arrived while saving
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 409 && error.body.current) {
          conflict.value = error.body.current;
          status.value = 'conflict';
        } else {
          lastError.value = error instanceof Error ? error.message : String(error);
          status.value = 'offline';
        }
      } finally {
        syncing = null;
        persist();
      }
    })();
    return syncing;
  }

  /** On start: pull edits made on other devices, or push ours if we have some. */
  async function refreshFromServer() {
    const link = remote.value;
    if (!link) return;
    try {
      const server = await getParty(link.id);
      if (server.revision === link.revision) {
        status.value = dirty.value ? 'offline' : 'synced';
        if (dirty.value) await sync();
      } else if (!dirty.value) {
        replaceParty(server.party, { ...link, revision: server.revision });
      } else {
        conflict.value = server;
        status.value = 'conflict';
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        // The online copy was deleted; keep working locally.
        remote.value = null;
        status.value = 'local';
      } else {
        status.value = 'offline';
      }
    }
  }

  function keepServerVersion() {
    const server = conflict.value;
    if (!server || !remote.value) return;
    replaceParty(server.party, { ...remote.value, revision: server.revision });
  }

  async function keepMyVersion() {
    const server = conflict.value;
    if (!server || !remote.value) return;
    remote.value.revision = server.revision;
    conflict.value = null;
    status.value = 'offline';
    dirty.value = true;
    await sync();
  }

  // ---- Sharing ------------------------------------------------------------------------------

  /** Puts the party online (once) so it can be opened from a link. */
  async function shareOnline(): Promise<RemoteLink> {
    if (remote.value) return remote.value;
    const created = await createParty(clone(party.value));
    remote.value = { id: created.id, editToken: created.editToken, revision: created.revision };
    dirty.value = false;
    status.value = 'synced';
    persist();
    return remote.value;
  }

  /** Deletes the online copy; the party stays on this device. */
  async function stopSharing() {
    const link = remote.value;
    if (!link) return;
    await deleteParty(link.id, link.editToken);
    remote.value = null;
    dirty.value = false;
    status.value = 'local';
  }

  const links = computed(() => {
    const origin = globalThis.location?.origin ?? '';
    return {
      view: remote.value ? `${origin}/p/${remote.value.id}` : undefined,
      edit: remote.value
        ? `${origin}/p/${remote.value.id}#edit=${remote.value.editToken}`
        : undefined,
      offline: `${origin}/s#${encodeParty(party.value)}`,
    };
  });

  /**
   * Opens a party link. An edit link makes it this device's party (returns 'edit');
   * a view or offline link shows it read-only (returns 'view').
   */
  async function openLink(
    link: { id: string; editToken?: string } | { encoded: string },
  ): Promise<'edit' | 'view' | 'own' | 'missing'> {
    if ('encoded' in link) {
      const decoded = decodeParty(link.encoded);
      if (!decoded) return 'missing';
      viewing.value = { party: decoded, source: 'link' };
      return 'view';
    }
    if (remote.value?.id === link.id) {
      if (link.editToken) remote.value.editToken = link.editToken;
      viewing.value = null;
      return 'own';
    }
    let server: RemoteParty;
    try {
      server = await getParty(link.id);
    } catch {
      return 'missing';
    }
    if (link.editToken) {
      replaceParty(server.party, {
        id: link.id,
        editToken: link.editToken,
        revision: server.revision,
      });
      viewing.value = null;
      return 'edit';
    }
    viewing.value = { party: server.party, source: 'server' };
    return 'view';
  }

  function stopViewing() {
    viewing.value = null;
  }

  /** Replaces this device's party with the one being viewed, as an unshared copy. */
  function copyViewed() {
    if (!viewing.value) return;
    replaceParty(clone(viewing.value.party), null);
    viewing.value = null;
  }

  // ---- Files ------------------------------------------------------------------------------

  function exportJson(): string {
    return JSON.stringify(party.value, null, 2);
  }

  /** Replaces this device's party with one from an exported file. Returns why it failed, if it did. */
  function importJson(text: string): string | undefined {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return 'This file is not a saved party (it is not valid JSON).';
    }
    const result = migrateParty(data);
    if (!result.ok) return result.issues.map((i) => i.message).join('\n');
    replaceParty(result.party, null);
    viewing.value = null;
    return undefined;
  }

  /** Starts over with a fresh party on this device; an online copy is left as it was. */
  function startOver() {
    replaceParty(freshParty(), null);
    viewing.value = null;
  }

  return {
    party,
    activeId,
    remote,
    dirty,
    status,
    conflict,
    viewing,
    lastError,
    currentMember,
    readOnly,
    hasUnsavedWork,
    links,
    sync,
    refreshFromServer,
    keepServerVersion,
    keepMyVersion,
    shareOnline,
    stopSharing,
    openLink,
    stopViewing,
    copyViewed,
    exportJson,
    importJson,
    startOver,
  };
});
