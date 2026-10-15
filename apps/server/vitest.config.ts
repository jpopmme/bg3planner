import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    // node:sqlite is still flagged experimental on Node 22; the warning is noise in test output.
    execArgv: ['--disable-warning=ExperimentalWarning'],
  },
});
