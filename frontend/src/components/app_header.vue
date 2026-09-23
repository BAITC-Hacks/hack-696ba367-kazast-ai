<script src="./app_header.js"></script>
<template>
  <header class="app_header">
    <div class="container app_header_inner">
      <RouterLink class="app_brand" :to="{ name: 'home' }">
        <span class="brand_mark_small" aria-hidden="true">K</span>
        <span>KazAST-AI</span>
      </RouterLink>

      <nav class="app_nav" aria-label="Основная навигация">
        <RouterLink class="nav_link" :to="{ name: 'home' }">Главная</RouterLink>
        <RouterLink class="nav_link" :to="{ name: 'task_catalog' }">Каталог задач</RouterLink>
        <RouterLink v-if="$store.state.proposals.role==='business'" class="nav_link" :to="{name:'my_tasks'}">Мои задачи</RouterLink>
        <RouterLink v-if="$store.state.proposals.role==='student'" class="nav_link" :to="{name:'my_proposals'}">Мои отклики</RouterLink>
      </nav>

      <div class="field demo_role"><label class="field-label" for="demo_role">Демо-роль</label><select id="demo_role" class="select" :value="$store.state.proposals.role" :disabled="is_role_locked" @change="set_role"><option value="business">Бизнес</option><option value="student">Студент</option></select></div>
      <RouterLink v-if="$store.state.proposals.role==='business'" class="btn btn-primary btn-sm header_action" :to="{ name: 'task_create' }">
        Создать задачу
      </RouterLink>
    </div>
  </header>
</template>
