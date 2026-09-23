import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '../components/app_layout.vue';
import HomePage from '../pages/home_page.vue';
import TaskCatalogPage from '../pages/task_catalog_page.vue';
import TaskCreatePage from '../pages/task_create_page.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
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
