<script src="./task_summary.js"></script>

<template>
  <header class="page_heading">
    <h2>{{ task.card.title }}</h2>
    <p v-if="task.score != null">Рейтинг: {{ task.score }}</p>
    <p v-if="task.readiness_level">Готовность: {{ task.readiness_level }}</p>
  </header>
</template>
