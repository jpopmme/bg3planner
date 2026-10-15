/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const apiTarget = process.env.API_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': apiTarget,
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
