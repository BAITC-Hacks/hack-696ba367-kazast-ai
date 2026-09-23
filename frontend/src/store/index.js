import { createStore } from 'vuex';
import app_status from './modules/app_status.js';

export const store = createStore({
  strict: import.meta.env.DEV,
  modules: {
    app_status,
  },
});
