<script src="./publication_panel.js"></script>
<template>
  <section class="surface confirmation_panel" aria-labelledby="publication_title">
    <h2 id="publication_title">Публикация задачи</h2>
    <div><span class="status_badge">{{ is_published ? 'Опубликована' : 'Ещё не опубликована' }}</span></div>
    <p aria-live="polite">{{ status_message }}</p>
    <p v-if="is_published && (is_dirty || has_unconfirmed_changes || !is_current)" class="field-help">Пока в каталоге остаётся предыдущая опубликованная версия.</p>
    <button class="btn btn-primary btn-block" type="button" :disabled="!can_publish" @click="$emit('publish')">{{ is_publishing ? 'Публикуем…' : is_published ? 'Обновить публикацию' : 'Опубликовать' }}</button>
    <RouterLink v-if="is_published" class="btn btn-outline btn-block" :to="{ name: 'task_detail', params: { id: task_id } }">Посмотреть в каталоге</RouterLink>
    <p v-else class="field-help">После публикации задача будет доступна всем командам. Низкий рейтинг не мешает публикации.</p>
  </section>
</template>
