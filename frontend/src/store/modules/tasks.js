import { api_request } from '../../services/api.js';
import { empty_draft, task_fields } from '../../domain/task_fields.js';

export const create_tasks_module = (request = api_request) => ({
  namespaced: true,
  state: () => ({
    task: null, draft: empty_draft(), confirmation: null,
    has_unconfirmed_changes: true, pending_action: '', error: null, notice: '',
    // Local demo identity only. Authentication will replace this selector later.
    user_id: import.meta.env?.VITE_DEMO_USER_ID || '00000000-0000-4000-8000-010000000001',
    request_id: 0,
  }),
  getters: {
    is_published: state => Boolean(state.task?.published_revision_id),
    is_publication_current: state => Boolean(state.confirmation && state.task?.published_revision_id === state.confirmation.id),
    can_publish: (state, getters) => Boolean(state.task && state.confirmation && !getters.is_busy
      && !getters.is_dirty && !state.has_unconfirmed_changes && !getters.is_publication_current
      && state.error?.code !== 'VERSION_CONFLICT'),
    is_busy: state => Boolean(state.pending_action),
    is_dirty: state => task_fields.some(({ key }) => state.draft[key] !== (state.task?.[key] ?? '')),
    can_confirm: (state, getters) => Boolean(state.task && !getters.is_busy && !getters.is_dirty
      && state.draft.title.trim() && state.has_unconfirmed_changes && state.error?.code !== 'VERSION_CONFLICT'),
  },
  mutations: {
    reset(state) {
      state.request_id++;
      Object.assign(state, { task: null, draft: empty_draft(), confirmation: null,
        has_unconfirmed_changes: true, pending_action: '', error: null, notice: '' });
    },
    set_field(state, { key, value }) {
      if (!Object.hasOwn(state.draft, key)) return;
      state.draft[key] = value;
      state.notice = '';
      if (state.error?.details?.[key]) {
        state.error = { ...state.error, details: { ...state.error.details, [key]: undefined } };
      }
    },
    begin_request(state, action) { state.request_id++; state.pending_action = action; state.error = null; state.notice = ''; },
    finish_request(state) { state.pending_action = ''; },
    set_error(state, error) { state.error = error; },
    set_notice(state, notice) { state.notice = notice; },
    receive_task(state, result) {
      state.task = result.task;
      state.draft = Object.fromEntries(task_fields.map(({ key }) => [key, result.task[key] ?? '']));
      state.confirmation = result.confirmation;
      state.has_unconfirmed_changes = result.has_unconfirmed_changes;
    },
  },
  actions: {
    async publish_task({ state, getters, commit }) {
      if (!getters.can_publish) return null;
      const is_update = getters.is_published;
      commit('begin_request', 'publish');
      const request_id = state.request_id;
      try {
        const result = await request(`/tasks/${state.task.id}/publish`, {
          method: 'POST', body: { expected_version: state.task.version }, user_id: state.user_id,
        });
        if (state.request_id === request_id) {
          commit('receive_task', result);
          commit('set_notice', is_update ? 'Опубликованная карточка обновлена.' : 'Задача опубликована и доступна в каталоге.');
        }
        return result;
      } catch (error) {
        if (state.request_id === request_id) commit('set_error', error);
        return null;
      } finally {
        if (state.request_id === request_id) commit('finish_request');
      }
    },
    async load_task({ state, commit }, id) {
      commit('reset');
      commit('begin_request', 'load');
      const request_id = state.request_id;
      try {
        const result = await request(`/tasks/${encodeURIComponent(id)}`, { user_id: state.user_id });
        if (state.request_id === request_id) commit('receive_task', result);
        return result;
      } catch (error) {
        if (state.request_id === request_id) commit('set_error', error);
        return null;
      } finally {
        if (state.request_id === request_id) commit('finish_request');
      }
    },
    async save_task({ state, getters, commit }) {
      if (getters.is_busy || state.error?.code === 'VERSION_CONFLICT') return null;
      const is_new = !state.task;
      const body = is_new ? { original_description: state.draft.original_description }
        : { ...state.draft, expected_version: state.task.version };
      commit('begin_request', 'save');
      const request_id = state.request_id;
      try {
        const result = await request(is_new ? '/tasks' : `/tasks/${state.task.id}`, {
          method: is_new ? 'POST' : 'PATCH', body, user_id: state.user_id,
        });
        if (state.request_id === request_id) {
          commit('receive_task', result);
          commit('set_notice', is_new ? 'Черновик создан. Теперь дополните карточку.' : 'Изменения сохранены.');
        }
        return result;
      } catch (error) {
        if (state.request_id === request_id) commit('set_error', error);
        return null;
      } finally {
        if (state.request_id === request_id) commit('finish_request');
      }
    },
    async confirm_task({ state, getters, commit }) {
      if (!getters.can_confirm) return null;
      commit('begin_request', 'confirm');
      const request_id = state.request_id;
      try {
        const result = await request(`/tasks/${state.task.id}/confirm`, {
          method: 'POST', body: { expected_version: state.task.version }, user_id: state.user_id,
        });
        if (state.request_id === request_id) {
          commit('receive_task', result);
          commit('set_notice', 'Карточка подтверждена. Рейтинг обновлён.');
        }
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
export default create_tasks_module();
