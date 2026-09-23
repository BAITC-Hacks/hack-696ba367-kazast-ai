<script src="./task_detail_page.js"></script>
<template>
  <section class="page_stack" :aria-busy="details.is_loading">
    <div><RouterLink class="btn btn-ghost btn-sm" :to="catalog_location">← Назад в каталог</RouterLink></div>
    <p v-if="details.is_loading" role="status">Загружаем карточку задачи…</p>
    <feedback-notice v-else-if="details.error" tone="error" :message="details.error.message">
      <button v-if="details.error.status !== 404" type="button" class="btn btn-outline btn-sm" @click="load_task">Попробовать снова</button>
    </feedback-notice>
    <template v-else-if="details.task">
      <header class="page_heading task_detail_heading">
        <p class="section_kicker">{{ details.task.industry || 'БИЗНЕС-ЗАДАЧА' }}</p>
        <h1 class="page_title">{{ details.task.card.title }}</h1>
        <span class="status_badge" :class="`readiness_${details.task.readiness_level}`">{{ level_label }}</span>
      </header>
      <div class="task_columns">
        <div class="task_form"><task-information v-for="group in groups" :key="group.title" :title="group.title" :fields="group.fields" :card="details.task.card" /></div>
        <aside class="surface readiness_panel">
          <p class="section_kicker">ГОТОВНОСТЬ К РАБОТЕ</p><h2>Рейтинг задачи</h2>
          <div class="score_display"><strong>{{ details.task.score }}</strong><span>из 100</span></div>
          <p class="readiness_hint">Оценка полноты опубликованной карточки. Чем выше рейтинг, тем больше сведений для начала работы.</p>
          <ul class="criteria_list"><li v-for="criterion in rating_criteria" :key="criterion.key"><span>{{ criterion.label }}</span><strong>{{ details.task.breakdown[criterion.key] }} / {{ criterion.max }}</strong></li></ul>
          <p class="field-help">Недостающие сведения можно уточнить у представителя бизнеса по контакту в карточке.</p>
        </aside>
      </div>
    </template>
  </section>
</template>
