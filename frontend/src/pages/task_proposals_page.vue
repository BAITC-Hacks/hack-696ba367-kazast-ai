<script src="./task_proposals_page.js"></script>

<template>
  <section class="page_stack">
    <header class="page_heading">
      <h1 class="page_title">Предложения команд</h1>
      <p>Сравните предложения и примите решение вручную. Можно выбрать несколько команд или не выбирать ни одной.</p>
    </header>
    <p v-if="is_loading" role="status">Загружаем предложения...</p>
    <div v-else-if="error" class="surface page_panel" role="alert">
      <p>Не удалось загрузить предложения</p><p>{{ error }}</p>
      <button class="btn btn-outline" @click="load_proposals">Повторить</button>
    </div>
    <template v-else>
      <p v-if="!proposals.length" class="surface page_panel empty_state">Пока нет предложений</p>
      <div v-else class="feature_grid">
        <proposal-card v-for="proposal in proposals" :key="proposal.id" :proposal="proposal" :is_busy="pending_ids.includes(proposal.id)" :error="decision_errors[proposal.id]" @decide="decide(proposal.id, $event)" />
      </div>
      <button class="btn btn-outline" :disabled="pending_ids.length > 0" @click="load_proposals">Обновить предложения</button>
    </template>
    <router-link class="btn btn-ghost" :to="{ name: 'task_detail', params: { id: $route.params.task_id } }">Вернуться к задаче</router-link>
  </section>
</template>
