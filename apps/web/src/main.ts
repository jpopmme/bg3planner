import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { usePartyStore } from './stores/party';
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import '@fontsource/atkinson-hyperlegible/latin-400-italic.css';
import '@fontsource/grenze-gotisch/latin-500.css';
import './style.css';

const app = createApp(App).use(createPinia()).use(router);
app.mount('#app');

// Pick up edits made on other devices, and retry saving when the connection returns.
const party = usePartyStore();
void party.refreshFromServer();
window.addEventListener('online', () => void party.sync());

// Works offline after the first visit (see build/service-worker.ts). Saving and sharing online
// still need the server; everything else is in the browser.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}
