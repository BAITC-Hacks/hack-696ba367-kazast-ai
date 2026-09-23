<template>
  <section class="page_stack">
    <header class="page_heading">
      <p class="eyebrow page_eyebrow">ОТКРЫТЫЕ ВОЗМОЖНОСТИ</p>
      <h1 class="page_title">Каталог задач</h1>
      <p class="page_description">
        Здесь будут опубликованные задачи бизнеса, отсортированные по готовности карточки.
      </p>
    </header>

    <div class="surface page_panel empty_state">
      <h2 class="feature_title">Каталог пока пуст</h2>
      <p class="feature_description">Когда появятся задачи, они будут доступны всем командам.</p>
      <RouterLink class="btn btn-secondary" :to="{ name: 'task_create' }">
        Создать первую задачу
      </RouterLink>
    </div>
  </section>
</template>
