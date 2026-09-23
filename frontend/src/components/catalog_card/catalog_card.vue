<script src="./catalog_card.js"></script>
<template>
  <article class="surface catalog_card">
    <div class="catalog_card_top"><span class="catalog_industry">{{ task.industry || 'Тема не указана' }}</span><span class="catalog_score" :aria-label="`Рейтинг ${task.score} из 100`">{{ task.score }}<small> / 100</small></span></div>
    <h2>{{ task.card.title }}</h2>
    <span class="status_badge" :class="`readiness_${task.readiness_level}`">{{ level_label }}</span>
    <p class="catalog_excerpt">{{ task.card.need || task.card.context || 'Описание потребности пока не уточнено.' }}</p>
    <div class="catalog_card_action"><RouterLink class="btn btn-outline btn-sm" :to="{ name: 'task_detail', params: { id: task.id }, query: $route.query }">Подробнее о задаче</RouterLink></div>
  </article>
</template>
