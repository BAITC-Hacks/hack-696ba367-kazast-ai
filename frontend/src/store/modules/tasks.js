import { api_request } from '../../services/api.js';
import { empty_draft, task_fields } from '../../domain/task_fields.js';

export const create_tasks_module = (request = api_request) => ({
  namespaced: true,
  state: () => ({
    task: null, draft: empty_draft(), confirmation: null, clarification: null, answers: {},
    has_unconfirmed_changes: true, pending_action: '', error: null, notice: '',
    // Local demo identity only. Authentication will replace this selector later.
    user_id: import.meta.env?.VITE_DEMO_USER_ID || '00000000-0000-4000-8000-010000000001',
    request_id: 0,
  }),
  getters: {
    answers_dirty: state => Boolean(state.clarification?.questions.some(q => (state.answers[q.id] || '') !== (q.answer || ''))),
    clarification_stale: state => Boolean(state.clarification && state.clarification.task_version !== state.task?.version),
    is_published: state => Boolean(state.task?.published_revision_id),
    is_publication_current: state => Boolean(state.confirmation && state.task?.published_revision_id === state.confirmation.id),
    can_publish: (state, getters) => Boolean(state.task && state.confirmation && !getters.is_busy
      && !getters.is_dirty && !getters.answers_dirty && !state.has_unconfirmed_changes && !getters.is_publication_current
      && state.error?.code !== 'VERSION_CONFLICT'),
    is_busy: state => Boolean(state.pending_action),
    is_dirty: state => task_fields.some(({ key }) => state.draft[key] !== (state.task?.[key] ?? '')),
    can_confirm: (state, getters) => Boolean(state.task && !getters.is_busy && !getters.is_dirty
      && !getters.answers_dirty && state.draft.title.trim() && state.has_unconfirmed_changes && state.error?.code !== 'VERSION_CONFLICT'),
  },
  mutations: {
    reset(state) {
      state.request_id++;
      Object.assign(state, { task: null, draft: empty_draft(), confirmation: null, clarification: null, answers: {},
        has_unconfirmed_changes: true, pending_action: '', error: null, notice: '' });
    },
    set_answer(state, { id, value }) { state.answers[id] = value; },
    apply_suggestion(state) {
      const session = state.clarification;
      if (!session?.suggested_card || session.task_version !== state.task?.version) return;
      Object.assign(state.draft, session.suggested_card);
      state.notice = 'Предложение перенесено в форму. Проверьте текст, сохраните и подтвердите карточку.';
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
      if (Object.hasOwn(result, 'clarification')) {
        state.clarification = result.clarification;
        state.answers = Object.fromEntries((result.clarification?.questions || []).map(q => [q.id, q.answer || '']));
      }
      state.task = result.task;
      state.draft = Object.fromEntries(task_fields.map(({ key }) => [key, result.task[key] ?? '']));
      state.confirmation = result.confirmation;
      state.has_unconfirmed_changes = result.has_unconfirmed_changes;
    },
  },
  actions: {
    apply_suggestion({ state, getters, commit }) {
      if (getters.is_busy || getters.is_dirty || getters.answers_dirty || getters.clarification_stale || !state.clarification?.suggested_card) return;
      commit('apply_suggestion');
    },
    async clarify({ state, getters, commit }, kind) {
      if (!['questions','answers','card'].includes(kind) || !state.task || getters.is_busy || getters.is_dirty || state.error?.code === 'VERSION_CONFLICT') return null;
      if (kind !== 'questions' && (!state.clarification || getters.clarification_stale)) return null;
      if (kind !== 'answers' && getters.answers_dirty) return null;
      const body = { expected_version: state.task.version };
      if (kind !== 'questions') body.session_id = state.clarification.id;
      if (kind === 'answers') body.answers = state.clarification.questions.map(q => ({ id: q.id, answer: state.answers[q.id] || '' }));
      commit('begin_request', `clarify_${kind}`);
      const request_id = state.request_id;
      try {
        const result = await request(`/tasks/${state.task.id}/clarification/${kind}`, {
          method: kind === 'answers' ? 'PATCH' : 'POST', body, user_id: state.user_id, timeout_ms: 60000,
        });
        if (state.request_id !== request_id) return null;
        commit('receive_task', result);
        commit('set_notice', { questions: 'Вопросы готовы. Дополните известные сведения.', answers: 'Ответы сохранены.', card: 'Предложение готово. Проверьте его перед переносом в форму.' }[kind]);
        return result;
      } catch (error) {
        if (state.request_id === request_id) commit('set_error', error);
        return null;
      } finally {
        if (state.request_id === request_id) commit('finish_request');
      }
    },
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
      if (getters.is_busy || getters.answers_dirty || state.error?.code === 'VERSION_CONFLICT') return null;
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
