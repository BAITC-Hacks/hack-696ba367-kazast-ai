<script src="./proposals_page.js"></script>
<template>
  <section class="page_stack">
    <header class="page_heading"><h1 class="page_title">{{ $route.params.id?'Отклики на задачу':'Мои отклики' }}</h1>
      <RouterLink v-if="$route.params.id" class="btn btn-ghost" :to="{name:'task_detail',params:{id:$route.params.id}}">← К задаче</RouterLink>
    </header>
    <proposal-workspace v-if="$route.params.id || $store.state.proposals.role==='student'" :task_id="$route.params.id || ''" :mode="$route.params.id?'task':'mine'" />
    <p v-else class="surface page_panel">Для просмотра откликов команды выберите демо-роль «Студент».</p>
  </section>
</template>
