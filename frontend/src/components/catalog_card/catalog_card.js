export default {
  props: { task: { type: Object, required: true } },
  computed: {
    level_label() { return { draft: 'Требует уточнения', working: 'Рабочая', ready: 'Готовая', priority: 'Приоритетная' }[this.task.readiness_level]; },
  },
};
