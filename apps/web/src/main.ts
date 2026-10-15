import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { usePartyStore } from './stores/party';
import './style.css';

const app = createApp(App).use(createPinia()).use(router);
app.mount('#app');

// Pick up edits made on other devices, and retry saving when the connection returns.
const party = usePartyStore();
void party.refreshFromServer();
window.addEventListener('online', () => void party.sync());
