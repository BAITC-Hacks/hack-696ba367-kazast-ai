import clarification_panel from '../components/clarification_panel/clarification_panel.vue';
import { computed, watch, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import form_field from '../components/form_field/form_field.vue';
import form_section from '../components/form_section/form_section.vue';
import feedback_notice from '../components/feedback_notice/feedback_notice.vue';
import task_readiness from '../components/task_readiness/task_readiness.vue';
import publication_panel from '../components/publication_panel/publication_panel.vue';
import { field_groups, original_field } from '../domain/task_fields.js';

export default {
  components: { 'clarification-panel': clarification_panel, 'form-field': form_field, 'form-section': form_section, 'feedback-notice': feedback_notice, 'task-readiness': task_readiness, 'publication-panel': publication_panel },
  setup() {
    const store = useStore();
    // Opening the business editor explicitly enters the business demo workspace.
    if (store.state.proposals.role !== 'business') store.commit('proposals/set_role','business');
    const route = useRoute();
    const router = useRouter();
    const task_state = computed(() => store.state.tasks);
    const is_busy = computed(() => store.getters['tasks/is_busy']);
    const is_dirty = computed(() => store.getters['tasks/is_dirty']);
    const answers_dirty = computed(() => store.getters['tasks/answers_dirty']);
    const can_confirm = computed(() => store.getters['tasks/can_confirm']);
    const can_publish = computed(() => store.getters['tasks/can_publish']);
    const is_published = computed(() => store.getters['tasks/is_published']);
    const is_publication_current = computed(() => store.getters['tasks/is_publication_current']);
    const publish_task = () => store.dispatch('tasks/publish_task');
    const has_conflict = computed(() => task_state.value.error?.code === 'VERSION_CONFLICT');
    const can_save = computed(() => !is_busy.value && !answers_dirty.value && is_dirty.value && !has_conflict.value && Boolean(task_state.value.draft.original_description.trim()));
    const update_field = (key, value) => store.commit('tasks/set_field', { key, value });
    const allow_leave = () => !is_busy.value && (!(is_dirty.value || answers_dirty.value) || window.confirm('Есть несохранённые изменения. Покинуть страницу и потерять их?'));
    onBeforeRouteLeave(allow_leave);
    onBeforeRouteUpdate((to, from) => to.params.id === from.params.id && to.name === from.name ? true : allow_leave());
    const warn_before_unload = event => {
      if (is_dirty.value || answers_dirty.value || is_busy.value) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn_before_unload);
    onBeforeUnmount(() => {
      window.removeEventListener('beforeunload', warn_before_unload);
      store.commit('tasks/reset');
    });
    watch(() => [route.name, route.params.id], async () => {
      if (route.params.id) {
        if (task_state.value.task?.id !== route.params.id) await store.dispatch('tasks/load_task', route.params.id);
      } else store.commit('tasks/reset');
    }, { immediate: true });
    const save_task = async () => {
      const result = await store.dispatch('tasks/save_task');
      if (result && route.name === 'task_create') await router.replace({ name: 'task_edit', params: { id: result.task.id } });
    };
    const reload_task = () => {
      if ((is_dirty.value || answers_dirty.value) && !window.confirm('Загрузить сохранённую версию? Несохранённый текст будет потерян.')) return;
      store.dispatch('tasks/load_task', route.params.id);
    };
    const confirm_task = () => store.dispatch('tasks/confirm_task');
    return { task_state, is_busy, is_dirty, answers_dirty, can_confirm, has_conflict, can_save, can_publish, is_published, is_publication_current, publish_task,
      field_groups, original_field, update_field, save_task, reload_task, confirm_task };
  },
};
