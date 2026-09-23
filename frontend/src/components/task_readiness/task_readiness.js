import { rating_criteria } from '../../domain/task_fields.js';
export default {
  props: { confirmation: { type: Object, default: null }, has_changes: Boolean },
  data: () => ({ rating_criteria }),
  computed: {
    level_label() { return { draft: 'Требует уточнения', working: 'Рабочая', ready: 'Готовая', priority: 'Приоритетная' }[this.confirmation?.readiness_level] || 'Ещё не оценена'; },
  },
  methods: {
    focus_field(target) { document.getElementById(target)?.focus(); },
  },
};
