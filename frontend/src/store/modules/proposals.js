import { api_request } from '../../services/api.js';

export const create_proposals_module = (request = api_request) => ({
  namespaced: true,
  actions: {
    load_context({ rootState }, task_id) {
      return request(`/tasks/${encodeURIComponent(task_id)}/proposals/context`, { user_id: rootState.tasks.user_id });
    },
    async load_proposals({ rootState }, task_id) {
      const result = await request(`/tasks/${encodeURIComponent(task_id)}/proposals`, { user_id: rootState.tasks.user_id });
      return result.proposals;
    },
    async create_proposal({ rootState }, { task_id, fields }) {
      const result = await request(`/tasks/${encodeURIComponent(task_id)}/proposals`, {
        method: 'POST', user_id: rootState.tasks.user_id, body: fields,
      });
      return result.proposal;
    },
    async decide_proposal({ rootState }, { proposal_id, status }) {
      const result = await request(`/proposals/${encodeURIComponent(proposal_id)}/status`, {
        method: 'PATCH', user_id: rootState.tasks.user_id, body: { status },
      });
      return result.proposal;
    },
  },
});
export default create_proposals_module();
