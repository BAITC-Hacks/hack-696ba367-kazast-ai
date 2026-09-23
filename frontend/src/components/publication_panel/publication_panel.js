export default {
  props: {
    task_id: { type: String, required: true }, is_published: Boolean, is_current: Boolean,
    is_dirty: Boolean, has_unconfirmed_changes: Boolean, can_publish: Boolean,
    is_publishing: Boolean, has_conflict: Boolean,
  },
  emits: ['publish'],
  computed: {
    status_message() {
      if (this.has_conflict) return 'Загрузите актуальную версию задачи перед публикацией.';
      if (this.is_dirty) return 'Сначала сохраните изменения и подтвердите карточку.';
      if (this.has_unconfirmed_changes) return 'Подтвердите сохранённую карточку перед публикацией.';
      if (this.is_current) return 'В каталоге показана актуальная подтверждённая карточка.';
      return this.is_published ? 'Новая версия подтверждена. Обновите карточку в каталоге.' : 'Карточка подтверждена и готова к публикации.';
    },
  },
};
