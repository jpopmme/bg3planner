import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import PartyView from '../views/PartyView.vue';
import PlannerView from '../views/PlannerView.vue';

// Every party, whether this device's own or opened from a link, has an overview page and one
// page per character. Online links add `#edit=<token>` to become editable on this device;
// snapshot links carry the whole party after `#`.
export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'party', component: PartyView },
  { path: '/c/:memberId', name: 'character', component: PlannerView },
  { path: '/p/:id', name: 'online-party', component: PartyView },
  { path: '/p/:id/c/:memberId', name: 'online-character', component: PlannerView },
  { path: '/s', name: 'snapshot-party', component: PartyView },
  { path: '/s/c/:memberId', name: 'snapshot-character', component: PlannerView },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
