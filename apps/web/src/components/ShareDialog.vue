<script setup lang="ts">
import { ref } from 'vue';
import { usePartyStore } from '../stores/party';

const party = usePartyStore();
const dialog = ref<HTMLDialogElement>();
const busy = ref(false);
const problem = ref<string | null>(null);
const copied = ref<string | null>(null);

function open() {
  problem.value = null;
  copied.value = null;
  dialog.value?.showModal();
}
defineExpose({ open });

async function run(action: () => Promise<unknown>) {
  busy.value = true;
  problem.value = null;
  try {
    await action();
  } catch (error) {
    problem.value =
      error instanceof Error ? error.message : 'The server could not be reached. Try again later.';
  } finally {
    busy.value = false;
  }
}

async function copy(kind: string, text: string | undefined) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copied.value = kind;
  } catch {
    problem.value = 'Copying is blocked here; select the link and copy it yourself.';
  }
}

function stopSharing() {
  if (confirm('Delete the online copy? The links stop working; the party stays on this device.')) {
    void run(party.stopSharing);
  }
}
</script>

<template>
  <dialog ref="dialog" class="share" aria-labelledby="share-heading">
    <h2 id="share-heading">Share this party</h2>

    <template v-if="!party.remote">
      <p>
        Put the party online to get a link others can open, and an edit link for your other devices.
      </p>
      <button
        type="button"
        class="primary"
        data-action="share-online"
        :disabled="busy"
        @click="run(party.shareOnline)"
      >
        {{ busy ? 'Creating links…' : 'Create links' }}
      </button>
    </template>

    <template v-else>
      <div class="link">
        <label for="view-link">View link: anyone with it can look but not change anything.</label>
        <div class="row">
          <input id="view-link" readonly :value="party.links.view" data-link="view" />
          <button type="button" @click="copy('view', party.links.view)">
            {{ copied === 'view' ? 'Copied' : 'Copy' }}
          </button>
        </div>
      </div>
      <div class="link">
        <label for="edit-link">
          Edit link: keep it private. Open it on another device to keep editing there.
        </label>
        <div class="row">
          <input id="edit-link" readonly :value="party.links.edit" data-link="edit" />
          <button type="button" @click="copy('edit', party.links.edit)">
            {{ copied === 'edit' ? 'Copied' : 'Copy' }}
          </button>
        </div>
      </div>
      <button type="button" class="danger" :disabled="busy" @click="stopSharing">
        Stop sharing online
      </button>
    </template>

    <div class="link">
      <label for="offline-link">
        Snapshot link: the whole party packed into the link, so it works without the server. It does
        not update when you make changes.
      </label>
      <div class="row">
        <input id="offline-link" readonly :value="party.links.offline" data-link="offline" />
        <button type="button" @click="copy('offline', party.links.offline)">
          {{ copied === 'offline' ? 'Copied' : 'Copy' }}
        </button>
      </div>
    </div>

    <p v-if="problem" class="problem" role="alert">{{ problem }}</p>

    <form method="dialog">
      <button type="submit">Close</button>
    </form>
  </dialog>
</template>

<style scoped>
.share {
  width: min(560px, calc(100vw - 32px));
  border: 1px solid var(--rule);
  border-radius: var(--radius-panel);
  background: var(--ground);
  color: var(--ink);
  padding: 20px 22px;
}

.share::backdrop {
  background: rgb(10 12 18 / 0.45);
}

.share > * + * {
  margin-top: 14px;
}

p {
  margin: 0;
}

.link {
  display: grid;
  gap: 6px;
}

label {
  font-size: 0.875rem;
  color: var(--ink-muted);
}

.row {
  display: flex;
  gap: 6px;
}

.row input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-control);
  background: var(--surface);
  font-size: 0.875rem;
}

.danger {
  color: var(--error);
}

.problem {
  color: var(--error);
}

form {
  display: flex;
  justify-content: flex-end;
}
</style>
