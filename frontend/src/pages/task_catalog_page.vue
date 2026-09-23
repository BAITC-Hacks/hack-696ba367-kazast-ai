<script src="./task_catalog_page.js"></script>
<template>
  <section class="page_stack" :aria-busy="catalog.is_loading">
    <header class="task_page_heading">
      <div class="page_heading">
        <p class="section_kicker">ОТКРЫТЫЕ ВОЗМОЖНОСТИ</p>
        <h1 class="page_title">Каталог задач</h1>
        <p class="page_description">Найдите задачу, в которой ваша команда сможет принести пользу. Все опубликованные задачи открыты — выбирайте по интересам и готовности к работе.</p>
      </div>
      <RouterLink class="btn btn-primary" :to="{ name: 'task_create' }">Предложить задачу</RouterLink>
    </header>
    <div class="surface catalog_filters">
      <div class="field"><label class="field-label" for="catalog_industry">Тема или отрасль</label>
        <select id="catalog_industry" class="select" :value="current_filters.industry" @change="set_filter('industry', $event.target.value)">
          <option value="">Все темы</option>
          <option v-if="current_filters.industry && !catalog.industries.includes(current_filters.industry)" :value="current_filters.industry">{{ current_filters.industry }}</option>
          <option v-for="industry in catalog.industries" :key="industry" :value="industry">{{ industry }}</option>
        </select>
      </div>
      <div class="field"><label class="field-label" for="catalog_readiness">Готовность задачи</label>
        <select id="catalog_readiness" class="select" :value="current_filters.readiness_level" @change="set_filter('readiness_level', $event.target.value)">
          <option value="">Все уровни</option><option value="draft">Требует уточнения · 0–39</option>
          <option value="working">Рабочая · 40–69</option><option value="ready">Готовая · 70–89</option><option value="priority">Приоритетная · 90–100</option>
        </select>
      </div>
      <button v-if="has_filters || catalog.error" type="button" class="btn btn-ghost" @click="reset_filters">Сбросить фильтры</button>
    </div>
    <div class="catalog_summary" aria-live="polite">
      <p>{{ catalog.is_loading ? 'Загружаем задачи…' : catalog.error ? 'Не удалось загрузить каталог' : catalog.total ? `Показаны ${first_item}–${last_item} из ${catalog.total}` : 'Задачи не найдены' }}</p>
      <p class="field-help">Сначала высокий рейтинг · по 12 на странице</p>
    </div>
    <feedback-notice v-if="catalog.error" tone="error" :message="catalog.error.message">
      <button class="btn btn-outline btn-sm" type="button" @click="load_catalog">Попробовать снова</button>
    </feedback-notice>
    <div v-else-if="catalog.is_loading" class="surface page_panel" role="status">Загружаем опубликованные карточки…</div>
    <template v-else-if="catalog.items.length">
      <div class="catalog_grid"><catalog-card v-for="task in catalog.items" :key="task.id" :task="task" /></div>
      <page-pagination :page="catalog.page" :total_pages="catalog.total_pages" :is_disabled="catalog.is_loading" @change="change_page" />
    </template>
    <div v-else class="surface page_panel empty_state">
      <h2 class="feature_title">{{ has_filters ? 'Нет задач с такими условиями' : 'Пока нет опубликованных задач' }}</h2>
      <p>{{ has_filters ? 'Попробуйте другую тему или уровень готовности.' : 'Здесь появятся карточки, которые бизнес подтвердил и опубликовал.' }}</p>
      <button v-if="has_filters" class="btn btn-secondary" type="button" @click="reset_filters">Показать все задачи</button>
    </div>
  </section>
</template>
