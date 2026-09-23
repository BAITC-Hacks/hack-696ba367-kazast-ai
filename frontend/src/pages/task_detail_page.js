import { computed, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import task_information from '../components/task_information/task_information.vue';
import feedback_notice from '../components/feedback_notice/feedback_notice.vue';
import { field_groups, rating_criteria } from '../domain/task_fields.js';
import proposal_workspace from '../components/proposal_workspace/proposal_workspace.vue';

export default {
  components: { 'task-information': task_information, 'feedback-notice': feedback_notice, 'proposal-workspace': proposal_workspace },
  setup() {
    const store = useStore();
    const route = useRoute();
    const details = computed(() => store.state.published_task);
    const groups = field_groups.map(group => ({ ...group, fields: group.fields.filter(field => !['title', 'industry'].includes(field.key)) }));
    const level_label = computed(() => ({ draft: 'Требует уточнения', working: 'Рабочая', ready: 'Готовая', priority: 'Приоритетная' }[details.value.task?.readiness_level]));
    const catalog_location = computed(() => ({ name: 'task_catalog', query: Object.fromEntries(
      ['page', 'industry', 'readiness_level'].filter(key => typeof route.query[key] === 'string').map(key => [key, route.query[key]])
    ) }));
    const load_task = () => store.dispatch('published_task/load_task', route.params.id);
    watch(() => route.params.id, load_task, { immediate: true });
    return { details, groups, rating_criteria, level_label, catalog_location, load_task };
  },
};
