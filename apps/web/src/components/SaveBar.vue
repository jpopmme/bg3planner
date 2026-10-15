<script setup lang="ts">
import { computed, ref } from 'vue';
import { exportFileName } from '../lib/share';
import { usePartyStore } from '../stores/party';
import ShareDialog from './ShareDialog.vue';

const party = usePartyStore();
const fileInput = ref<HTMLInputElement>();
const shareDialog = ref<InstanceType<typeof ShareDialog>>();
const importError = ref<string | null>(null);

const statusText = computed(() => {
  switch (party.status) {
    case 'local':
      return 'Saved on this device';
    case 'syncing':
      return 'Saving online…';
    case 'synced':
      return 'Saved online';
    case 'offline':
      return 'Saved on this device, not yet online';
    case 'conflict':
      return 'Changed on another device';
  }
  return '';
});

function exportFile() {
  const blob = new Blob([party.exportJson()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName(party.currentMember.name);
  a.click();
  URL.revokeObjectURL(url);
}

async function importFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (
    party.hasUnsavedWork &&
    !confirm('Importing replaces the character on this device. Export it first to keep a copy.')
  ) {
    return;
  }
  importError.value = party.importJson(await file.text()) ?? null;
}
</script>

<template>
  <div class="save-bar">
    <p class="status" :class="party.status" role="status">
      {{ statusText }}
      <button v-if="party.status === 'offline'" type="button" class="link" @click="party.sync()">
        Try again
      </button>
    </p>
    <div class="actions">
      <button type="button" data-action="share" @click="shareDialog?.open()">Share</button>
      <button type="button" data-action="export" @click="exportFile">Export file</button>
      <button type="button" data-action="import" @click="fileInput?.click()">Import file</button>
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        class="visually-hidden"
        tabindex="-1"
        aria-hidden="true"
        data-input="import"
        @change="importFile"
      />
    </div>
    <p v-if="importError" class="import-error" role="alert">
      The file could not be imported. {{ importError }}
    </p>
    <ShareDialog ref="shareDialog" />
  </div>
</template>

<style scoped>
.save-bar {
  display: grid;
  justify-items: end;
  gap: 6px;
}

.status {
  margin: 0;
  font-size: 0.875rem;
  color: var(--ink-muted);
}

.status.offline,
.status.conflict {
  color: var(--warning);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.link {
  border: none;
  background: none;
  padding: 0 0 0 6px;
  color: var(--accent);
  text-decoration: underline;
}

.import-error {
  margin: 0;
  max-width: 40ch;
  color: var(--error);
  font-size: 0.875rem;
  white-space: pre-line;
}

@media (max-width: 860px) {
  .save-bar {
    justify-items: start;
  }

  .actions {
    justify-content: flex-start;
  }
}
</style>
