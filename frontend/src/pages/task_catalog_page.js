import { computed, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import catalog_card from '../components/catalog_card/catalog_card.vue';
import page_pagination from '../components/page_pagination/page_pagination.vue';
import feedback_notice from '../components/feedback_notice/feedback_notice.vue';

export default {
  components: { 'catalog-card': catalog_card, 'page-pagination': page_pagination, 'feedback-notice': feedback_notice },
  setup() {
    const store = useStore();
    const route = useRoute();
    const router = useRouter();
    const catalog = computed(() => store.state.catalog);
    const current_filters = computed(() => ({
      page: typeof route.query.page === 'string' ? route.query.page : '1',
      industry: typeof route.query.industry === 'string' ? route.query.industry : '',
      readiness_level: typeof route.query.readiness_level === 'string' ? route.query.readiness_level : '',
    }));
    const has_filters = computed(() => Boolean(current_filters.value.industry || current_filters.value.readiness_level));
    const first_item = computed(() => (catalog.value.page - 1) * catalog.value.page_size + 1);
    const last_item = computed(() => Math.min(catalog.value.page * catalog.value.page_size, catalog.value.total));
    const load_catalog = async () => {
      if (route.name !== 'task_catalog') return;
      const original_query = route.fullPath;
      const result = await store.dispatch('catalog/load_catalog', current_filters.value);
      if (result && route.name === 'task_catalog' && original_query === route.fullPath && String(result.page) !== current_filters.value.page) {
        await router.replace({ name: 'task_catalog', query: { ...route.query, page: String(result.page) } });
      }
    };
    watch(() => route.fullPath, load_catalog, { immediate: true });
    const set_filter = (key, value) => {
      const query = { ...route.query, page: '1' };
      if (value) query[key] = value; else delete query[key];
      router.push({ name: 'task_catalog', query });
    };
    const change_page = page => router.push({ name: 'task_catalog', query: { ...route.query, page: String(page) } });
    const reset_filters = () => router.push({ name: 'task_catalog' });
    return { catalog, current_filters, has_filters, first_item, last_item, load_catalog, set_filter, change_page, reset_filters };
  },
};
