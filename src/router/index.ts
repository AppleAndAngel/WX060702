import { createRouter, createWebHistory } from 'vue-router';
import MainView from '@/views/MainView.vue';
import HistoryView from '@/views/HistoryView.vue';
import RuleSetsView from '@/views/RuleSetsView.vue';
import DualDreamView from '@/views/DualDreamView.vue';
import BranchingEndingsView from '@/views/BranchingEndingsView.vue';
import NightmarePurifierView from '@/views/NightmarePurifierView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'main',
      component: MainView,
    },
    {
      path: '/dual',
      name: 'dual',
      component: DualDreamView,
    },
    {
      path: '/branching',
      name: 'branching',
      component: BranchingEndingsView,
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
    {
      path: '/purifier',
      name: 'purifier',
      component: NightmarePurifierView,
    },
  ],
});

export default router;
