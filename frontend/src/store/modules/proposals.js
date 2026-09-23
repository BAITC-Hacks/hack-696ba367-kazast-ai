import { api_request } from '../../services/api.js';
function read_demo_role() {
  try { return globalThis.sessionStorage?.getItem('kazast_demo_role') === 'student' ? 'student' : 'business'; }
  catch { return 'business'; }
}
export const empty_proposal = () => ({ team_id: '', idea: '', plan: '', timeline: '', prototype_url: '' });
export const create_proposals_module = (request = api_request) => ({
  namespaced: true,
  state: () => ({ role: read_demo_role(), teams: [], items: [], drafts: {}, is_loading: false, pending_action: '', error: null, notice: '', request_id: 0 }),
  getters: {
    user_id: (state, getters, root_state) => state.role === 'business' ? root_state.tasks.user_id : '00000000-0000-4000-8000-020000000001',
    is_busy: state => state.is_loading || Boolean(state.pending_action),
  },
  mutations: {
    set_role(state, role) {
      if (!['business','student'].includes(role)) return;
      try { globalThis.sessionStorage?.setItem('kazast_demo_role',role); } catch { /* Storage may be disabled; role still works in memory. */ }
      state.role = role; state.request_id++; state.items = []; state.teams = []; state.error = null; state.notice = ''; state.is_loading = false; state.pending_action = '';
    },
    set_field(state, { task_id, key, value }) {
      if (!Object.hasOwn(empty_proposal(),key)) return;
      if (!state.drafts[task_id]) state.drafts[task_id] = empty_proposal();
      state.drafts[task_id][key] = value;
      state.notice = '';
    },
    begin(state, action) { state.request_id++; state.error = null; state.notice = ''; state.pending_action = action; },
    begin_load(state) { state.request_id++; state.items = []; state.teams = []; state.error = null; state.notice = ''; state.is_loading = true; state.pending_action = ''; },
    receive(state, { items, teams }) { state.items = items; state.teams = teams; },
    finish(state) { state.pending_action = ''; state.is_loading = false; },
    fail(state, error) { state.error = error; },
    submitted(state, { task_id, proposal }) {
      state.items.unshift(proposal);
      state.drafts[task_id] = { ...empty_proposal(), team_id: proposal.team_id };
      state.notice = 'Предложение отправлено. Решение появится в разделе «Мои отклики».';
    },
    decided(state, proposal) {
      state.items = state.items.map(item => item.id === proposal.id ? { ...item, ...proposal } : item);
      state.notice = proposal.status === 'accepted' ? 'Команда выбрана.' : 'Предложение отклонено.';
    },
  },
  actions: {
    async load({ state, getters, commit }, { task_id, mode }) {
      commit('begin_load');
      const request_id = state.request_id;
      const user_id = getters.user_id;
      try {
        let items, teams = [];
        if (state.role === 'student') {
          const results = await Promise.all([request('/teams/mine',{user_id}),request('/proposals/mine',{user_id})]);
          teams = results[0].items;
          items = mode === 'mine' ? results[1].items : results[1].items.filter(item => item.task_id === task_id);
        } else {
          items = (await request(`/tasks/${task_id}/proposals`,{user_id})).items;
        }
        if (state.request_id === request_id) {
          commit('receive',{items,teams});
          if (task_id && teams.length && !state.drafts[task_id]?.team_id) commit('set_field',{task_id,key:'team_id',value:teams[0].id});
        }
      } catch (error) { if (state.request_id === request_id) commit('fail',error); }
      finally { if (state.request_id === request_id) commit('finish'); }
    },
    async submit({state,getters,commit},task_id) {
      if (getters.is_busy || state.role !== 'student' || state.error?.code === 'NETWORK_ERROR') return;
      const body = {...state.drafts[task_id]};
      commit('begin','submit'); const request_id = state.request_id;
      try {
        const result = await request(`/tasks/${task_id}/proposals`,{method:'POST',body,user_id:getters.user_id});
        if (state.request_id === request_id) commit('submitted',{task_id,proposal:{...result.proposal,team_name:state.teams.find(team=>team.id===body.team_id)?.name}});
      } catch(error) { if(state.request_id===request_id) commit('fail',error); }
      finally { if(state.request_id===request_id) commit('finish'); }
    },
    async decide({state,getters,commit},{id,status}) {
      if(getters.is_busy || state.role!=='business') return;
      commit('begin',id); const request_id=state.request_id;
      try {
        const result=await request(`/proposals/${id}/status`,{method:'PATCH',body:{status},user_id:getters.user_id});
        if(state.request_id===request_id) commit('decided',result.proposal);
      } catch(error) { if(state.request_id===request_id) commit('fail',error); }
      finally { if(state.request_id===request_id) commit('finish'); }
    },
  },
});
export default create_proposals_module();
