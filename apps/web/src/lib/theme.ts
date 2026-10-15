import { ref, watch } from 'vue';

export type Theme = 'system' | 'light' | 'dark';

/** Same key as the inline script in index.html, which applies the theme before first paint. */
const KEY = 'bg3planner:theme';

function stored(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

const theme = ref<Theme>(stored());

watch(
  theme,
  (value) => {
    const root = document.documentElement;
    if (value === 'system') delete root.dataset.theme;
    else root.dataset.theme = value;
    try {
      if (value === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, value);
    } catch {
      // Storage can be blocked; the choice then lasts for this visit.
    }
  },
  { immediate: true },
);

/** The player's colour theme: the system's, or a fixed light or dark one. */
export const useTheme = () => theme;
