import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '../components/app_layout.vue';
import HomePage from '../pages/home_page.vue';
import TaskCatalogPage from '../pages/task_catalog_page.vue';
import TaskCreatePage from '../pages/task_create_page.vue';
import TaskDetailPage from '../pages/task_detail_page.vue';
import ProposalsPage from '../pages/proposals_page.vue';
import MyTasksPage from '../pages/my_tasks_page.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: 'tasks/mine', name: 'my_tasks', component: MyTasksPage },
        { path: 'proposals', name: 'my_proposals', component: ProposalsPage },
        { path: 'tasks/:id/proposals', name: 'task_proposals', component: ProposalsPage },
        {
          path: '',
          name: 'home',
          component: HomePage,
        },
        {
          path: 'tasks',
          name: 'task_catalog',
          component: TaskCatalogPage,
        },
        {
          path: 'tasks/new',
          name: 'task_create',
          component: TaskCreatePage,
        },
        {
          path: 'tasks/:id/edit',
          name: 'task_edit',
          component: TaskCreatePage,
        },
        {
          path: 'tasks/:id',
          name: 'task_detail',
          component: TaskDetailPage,
        },
      ],
    },
    {
      path: '/:path_match(.*)*',
      redirect: { name: 'home' },
    },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});
