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
      </nav>

      <RouterLink class="btn btn-primary btn-sm header_action" :to="{ name: 'task_create' }">
        Создать задачу
      </RouterLink>
    </div>
  </header>
</template>
