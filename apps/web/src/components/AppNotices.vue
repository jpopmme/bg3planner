<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router';
import { REPLACE_WARNING } from '../lib/link-routing';
import { usePartyStore } from '../stores/party';

const party = usePartyStore();
const router = useRouter();

function keepCopy() {
  if (party.hasUnsavedWork && !confirm(REPLACE_WARNING)) return;
  party.copyViewed();
  void router.push('/');
}
</script>

<template>
  <div v-if="party.linkProblem || party.viewing || party.status === 'conflict'" class="notices">
    <div v-if="party.linkProblem" class="banner problem" role="alert">
      <p>{{ party.linkProblem }}</p>
      <RouterLink to="/">Back to your party</RouterLink>
    </div>

    <div v-if="party.viewing" class="banner viewing" data-banner="viewing">
      <p>You are looking at a shared party. Changes are off; keep a copy to make it your own.</p>
      <div class="actions">
        <button type="button" class="primary" data-action="keep-copy" @click="keepCopy">
          Keep a copy
        </button>
        <RouterLink to="/">Back to your party</RouterLink>
      </div>
    </div>

    <div v-if="party.status === 'conflict'" class="banner conflict" data-banner="conflict">
      <p>
        This party was changed on another device since this one last saved online. Pick which
        version to keep; the other is discarded.
      </p>
      <div class="actions">
        <button type="button" data-action="keep-server" @click="party.keepServerVersion()">
          Use the other device's version
        </button>
        <button type="button" data-action="keep-mine" @click="party.keepMyVersion()">
          Keep this device's version
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notices {
  display: grid;
  gap: 10px;
  max-width: 1240px;
  margin: 0 auto;
  padding: 20px 24px 0;
}

.banner {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: var(--radius-panel);
  border: 1px solid var(--rule);
  background: var(--surface);
}

.banner p {
  margin: 0;
  max-width: 70ch;
}

.viewing {
  border-color: var(--accent);
}

.conflict,
.problem {
  border-color: var(--warning);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

@media (max-width: 860px) {
  .notices {
    padding: 16px 16px 0;
  }
}
</style>
