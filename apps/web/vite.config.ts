/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { precompress } from './build/precompress.ts';
import { serviceWorker } from './build/service-worker.ts';

const apiTarget = process.env.API_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [vue(), serviceWorker(), precompress()],
  server: {
    proxy: {
      '/api': apiTarget,
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
