import { api_request } from '../../services/api.js';

export const create_published_task_module = (request = api_request) => ({
  namespaced: true,
  state: () => ({ task: null, is_loading: false, error: null, request_id: 0 }),
  mutations: {
    begin_request(state) { state.request_id++; state.task = null; state.error = null; state.is_loading = true; },
    receive_task(state, task) { state.task = task; },
    set_error(state, error) { state.error = error; },
    finish_request(state) { state.is_loading = false; },
  },
  actions: {
    async load_task({ state, commit }, id) {
      commit('begin_request');
      const request_id = state.request_id;
      try {
        const result = await request(`/tasks/${encodeURIComponent(id)}/published`);
        if (state.request_id === request_id) commit('receive_task', result.task);
      } catch (error) {
        if (state.request_id === request_id) commit('set_error', error);
      } finally {
        if (state.request_id === request_id) commit('finish_request');
      }
    },
  },
});
export default create_published_task_module();
