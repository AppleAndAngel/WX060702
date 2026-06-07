import { createRouter, createWebHistory } from 'vue-router';
import MainView from '@/views/MainView.vue';
import HistoryView from '@/views/HistoryView.vue';
import RuleSetsView from '@/views/RuleSetsView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'main',
      component: MainView,
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryView,
    },
    {
      path: '/rulesets',
      name: 'rulesets',
      component: RuleSetsView,
    },
  ],
});

export default router;
