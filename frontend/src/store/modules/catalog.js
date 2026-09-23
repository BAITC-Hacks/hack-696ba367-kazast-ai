import { api_request } from '../../services/api.js';

export const create_catalog_module = (request = api_request) => ({
  namespaced: true,
  state: () => ({ items: [], industries: [], page: 1, page_size: 12, total: 0, total_pages: 0,
    filters: { industry: '', readiness_level: '' }, is_loading: false, error: null, request_id: 0 }),
  mutations: {
    begin_request(state) { state.request_id++; state.is_loading = true; state.error = null; state.items = []; },
    receive_catalog(state, result) { Object.assign(state, result); },
    finish_request(state) { state.is_loading = false; },
    set_error(state, error) { state.error = error; },
  },
  actions: {
    async load_catalog({ state, commit }, filters = {}) {
      commit('begin_request');
      const request_id = state.request_id;
      const query = new URLSearchParams({ page: String(filters.page || 1) });
      if (filters.industry) query.set('industry', filters.industry);
      if (filters.readiness_level) query.set('readiness_level', filters.readiness_level);
      try {
        const result = await request(`/tasks?${query}`);
        if (state.request_id !== request_id) return null;
        commit('receive_catalog', result);
        return result;
      } catch (error) {
        if (state.request_id === request_id) commit('set_error', error);
        return null;
      } finally {
        if (state.request_id === request_id) commit('finish_request');
      }
    },
  },
});
export default create_catalog_module();
