import { computed } from 'vue';
import { useStore } from 'vuex';
import form_field from '../form_field/form_field.vue';
import { task_fields } from '../../domain/task_fields.js';
export default {
  components: { 'form-field': form_field },
  setup() {
    const store = useStore();
    const state = computed(() => store.state.tasks);
    const session = computed(() => state.value.clarification);
    const is_busy = computed(() => store.getters['tasks/is_busy']);
    const is_dirty = computed(() => store.getters['tasks/is_dirty']);
    const answers_dirty = computed(() => store.getters['tasks/answers_dirty']);
    const is_stale = computed(() => store.getters['tasks/clarification_stale']);
    const is_blocked = computed(() => is_busy.value || is_dirty.value || state.value.error?.code === 'VERSION_CONFLICT');
    const has_answers = computed(() => session.value?.questions.some(q => q.answer?.trim()));
    const suggestion_fields = computed(() => task_fields.filter(f => f.key !== 'original_description').map(f => ({ ...f, value: session.value?.suggested_card?.[f.key] || '' })));
    const question_field = q => ({ key: `answer_${q.id}`, label: q.question, rows: 2,
      max_length: task_fields.find(f => f.key === q.field)?.max_length || 10000, hint: 'Если сведений пока нет, оставьте ответ пустым.' });
    const update_answer = (id, value) => store.commit('tasks/set_answer', { id, value });
    const clarify = kind => store.dispatch('tasks/clarify', kind);
    const apply_suggestion = () => store.dispatch('tasks/apply_suggestion');
    return { state, session, is_busy, is_dirty, answers_dirty, is_stale, is_blocked, has_answers, suggestion_fields, question_field, update_answer, clarify, apply_suggestion };
  },
};
