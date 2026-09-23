<script src="./my_tasks_page.js"></script>
<template>
  <section class="page_stack" :aria-busy="state.is_loading">
    <header class="task_page_heading"><div class="page_heading"><p class="section_kicker">КАБИНЕТ БИЗНЕСА</p><h1 class="page_title">Мои задачи</h1><p class="page_description">Управляйте черновиками, обновляйте публикации и выбирайте команды.</p></div><RouterLink v-if="is_business" class="btn btn-primary" :to="{name:'task_create'}">Создать задачу</RouterLink></header>
    <p v-if="!is_business" class="surface page_panel">Для доступа к своим задачам выберите демо-роль «Бизнес» в шапке.</p>
    <template v-else>
      <div class="surface catalog_filters"><div class="field"><label for="my_task_status" class="field-label">Статус задачи</label><select id="my_task_status" class="select" :value="status" @change="change_status($event.target.value)"><option value="">Все задачи</option><option value="draft">Черновики</option><option value="published">Опубликованные</option></select></div><button type="button" class="btn btn-ghost" :disabled="state.is_loading" @click="load">Обновить</button></div>
      <feedback-notice v-if="state.error" tone="error" :message="state.error.message"><button type="button" class="btn btn-outline" @click="load">Попробовать снова</button><button type="button" class="btn btn-ghost" @click="change_status('')">Сбросить фильтр</button></feedback-notice>
      <p v-else-if="state.is_loading" role="status">Загружаем ваши задачи…</p>
      <template v-else-if="state.items.length">
        <p aria-live="polite">Показаны {{ (state.page-1)*12+1 }}–{{ Math.min(state.page*12,state.total) }} из {{ state.total }} · Сначала недавно изменённые</p>
        <div class="catalog_grid"><owned-task-card v-for="task in state.items" :key="task.id" :task="task" /></div>
        <page-pagination :page="state.page" :total_pages="state.total_pages" @change="change_page" />
      </template>
      <div v-else class="surface page_panel empty_state"><h2>{{ status?'Задач с таким статусом пока нет':'У вас пока нет задач' }}</h2><p>Создайте черновик или выберите другой статус.</p><RouterLink class="btn btn-secondary" :to="{name:'task_create'}">Создать задачу</RouterLink></div>
    </template>
  </section>
</template>
