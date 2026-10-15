<script setup lang="ts">
import { useTheme } from '../lib/theme';

const theme = useTheme();
</script>

<template>
  <footer class="app-footer">
    <p>
      Game data from <a href="https://bg3.wiki" target="_blank" rel="noopener">bg3.wiki</a>,
      <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener"
        >CC BY-NC-SA 4.0</a
      >. Baldur’s Gate 3 is © Larian Studios; this planner is unofficial.
    </p>
    <label class="theme">
      Theme
      <select v-model="theme" name="theme" data-input="theme">
        <option value="system">Same as system</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  </footer>
</template>

<style scoped>
.app-footer {
  max-width: 1240px;
  margin: 0 auto;
  padding: 20px 24px 32px;
  border-top: 1px solid var(--rule);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px 24px;
  font-size: 0.875rem;
  color: var(--ink-muted);
}

p {
  margin: 0;
  max-width: 70ch;
}

.theme {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

@media (max-width: 860px) {
  .app-footer {
    padding: 16px 16px 28px;
  }
}
</style>
