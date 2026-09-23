const api_url = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default {
  namespaced: true,
  state: () => ({
    api_status: 'Проверяем API…',
  }),
  mutations: {
    set_api_status(state, api_status) {
      state.api_status = api_status;
    },
  },
  actions: {
    async check_api_status({ commit }) {
      try {
        const response = await fetch(`${api_url}/api/health`);
        if (!response.ok) throw new Error('API unavailable');

        const data = await response.json();
        commit('set_api_status', data.status === 'ok' ? 'API доступен' : 'API ответил');
      } catch {
        commit('set_api_status', 'API пока недоступен');
      }
    },
  },
};
