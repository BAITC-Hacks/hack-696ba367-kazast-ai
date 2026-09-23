import { createStore } from 'vuex';
import proposals from './modules/proposals.js';
import app_status from './modules/app_status.js';
import tasks from './modules/tasks.js';
import catalog from './modules/catalog.js';
import published_task from './modules/published_task.js';

export const store = createStore({
  strict: import.meta.env.DEV,
  modules: {
    app_status,
    tasks,
    catalog,
    published_task,
    proposals,
  },
});
