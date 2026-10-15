import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import PlannerView from '../views/PlannerView.vue';

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'planner', component: PlannerView },
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
