<template>
  <section class="page_stack">
    <header class="page_heading">
      <p class="eyebrow page_eyebrow">ДЛЯ БИЗНЕСА</p>
      <h1 class="page_title">Новая задача</h1>
      <p class="page_description">
        Создание карточки подключим к API вместе с логикой уточняющих вопросов и рейтинга.
      </p>
    </header>

    <div class="surface page_panel empty_state">
      <div class="status_badge">Экран подготовлен</div>
      <p class="feature_description">
        Следующий этап — добавить форму черновика, сохранить её на сервере и показывать подсказки по недостающим полям.
      </p>
      <RouterLink class="btn btn-ghost" :to="{ name: 'task_catalog' }">Вернуться в каталог</RouterLink>
    </div>
  </section>
</template>
