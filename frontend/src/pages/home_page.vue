<template>
  <div class="page_stack home_page">
    <section class="home_hero" aria-labelledby="home_title">
      <div class="home_intro">
        <p class="home_eyebrow">БИЗНЕС + СТУДЕНЧЕСКИЕ КОМАНДЫ</p>
        <h1 id="home_title" class="page_title">От бизнес-проблемы — к готовому решению</h1>
        <p class="page_description">
          Опишите задачу, повысьте её готовность с помощью AI
          и найдите студенческую команду для реализации.
        </p>
        <!-- TODO: Команда модулей реализует конструктор и каталог на существующих
             маршрутах task_create и task_catalog; сейчас там безопасные заглушки. -->
        <div class="home_actions">
          <router-link class="btn btn-primary btn-lg" :to="{ name: 'task_create' }">
            Создать задачу
          </router-link>
          <router-link class="btn btn-outline btn-lg" :to="{ name: 'task_catalog' }">
            Каталог задач
          </router-link>
        </div>
        <p class="home_note">AI помогает уточнить задачу. Команду выбирает бизнес.</p>
      </div>

      <aside class="surface home_principle" aria-labelledby="home_principle_title">
        <p class="home_eyebrow">ОТ ОПИСАНИЯ К РАБОТЕ</p>
        <h2 id="home_principle_title" class="feature_title">Понятная задача — проще старт</h2>
        <ol class="home_flow">
          <li>Бизнес лучше описывает задачу</li>
          <li>Выше рейтинг готовности</li>
          <li>Выше позиция задачи в каталоге</li>
          <li>Студентам проще понять задачу и начать работу</li>
        </ol>
        <p class="home_note">Рейтинг относится к конкретной задаче, а не к компании.</p>
      </aside>
    </section>

    <section class="home_section" aria-labelledby="home_process_title">
      <div class="home_section_heading">
        <p class="home_eyebrow">ПУТЬ ЗАДАЧИ</p>
        <h2 id="home_process_title" class="home_section_title">Как это работает</h2>
      </div>
      <ol class="feature_grid home_steps">
        <li class="surface home_step">
          <span class="home_step_number" aria-hidden="true">01</span>
          <h3 class="feature_title">Опишите задачу</h3>
          <p>Представитель бизнеса описывает свою потребность, проблему или задачу.</p>
        </li>
        <li class="surface home_step">
          <div class="home_step_heading">
            <span class="home_step_number" aria-hidden="true">02</span>
            <span class="status_badge">С помощью AI</span>
          </div>
          <h3 class="feature_title">Уточните детали</h3>
          <p>Система определяет недостающие сведения и помогает уточнить описание.</p>
          <p class="home_note">Минимум 3 уточняющих вопроса.</p>
        </li>
        <li class="surface home_step">
          <span class="home_step_number" aria-hidden="true">03</span>
          <h3 class="feature_title">Получите карточку и рейтинг</h3>
          <p>Из ответов формируется редактируемая карточка, а система оценивает готовность задачи от 0 до 100.</p>
        </li>
        <li class="surface home_step">
          <span class="home_step_number" aria-hidden="true">04</span>
          <h3 class="feature_title">Опубликуйте задачу</h3>
          <p>После подтверждения задача появляется в общем каталоге.</p>
        </li>
        <li class="surface home_step">
          <span class="home_step_number" aria-hidden="true">05</span>
          <h3 class="feature_title">Получите предложения</h3>
          <p>Студенческие команды самостоятельно выбирают интересные задачи и отправляют свои предложения.</p>
        </li>
        <li class="surface home_step">
          <span class="home_step_number" aria-hidden="true">06</span>
          <h3 class="feature_title">Выберите команду</h3>
          <p>Бизнес самостоятельно сравнивает предложения и принимает решение.</p>
        </li>
      </ol>
    </section>

    <section class="surface home_readiness home_section" aria-labelledby="home_readiness_title">
      <div class="home_section_heading">
        <p class="home_eyebrow">КАЧЕСТВО ОПИСАНИЯ</p>
        <h2 id="home_readiness_title" class="home_section_title">Рейтинг готовности задачи</h2>
        <p>Чем полнее и полезнее описана задача, тем выше её рейтинг и позиция в каталоге.</p>
      </div>
      <ul class="feature_grid home_levels">
        <li class="home_level">
          <p class="home_score_range">0–39</p>
          <h3 class="feature_title">Черновик</h3>
          <p>Требует уточнения</p>
        </li>
        <li class="home_level home_level_working">
          <p class="home_score_range">40–69</p>
          <h3 class="feature_title">Рабочая</h3>
          <p>Команды могут откликаться</p>
        </li>
        <li class="home_level home_level_ready">
          <p class="home_score_range">70–89</p>
          <h3 class="feature_title">Готовая</h3>
          <p>Повышенная позиция в каталоге</p>
        </li>
        <li class="home_level home_level_priority">
          <p class="home_score_range">90–100</p>
          <h3 class="feature_title">Приоритетная</h3>
          <p>Полностью готова к работе</p>
        </li>
      </ul>
      <p class="home_note">Низкий рейтинг не скрывает задачу: черновик с рейтингом 0–39 тоже может быть виден в каталоге.</p>
    </section>

    <div class="feature_grid">
      <section class="surface feature_card home_audience" aria-labelledby="home_business_title">
        <p class="home_eyebrow">ОТ ПОТРЕБНОСТИ К ПРЕДЛОЖЕНИЯМ</p>
        <h2 id="home_business_title" class="home_section_title">Для бизнеса</h2>
        <ul class="home_audience_list">
          <li>Опишите потребность или проблему</li>
          <li>Уточните недостающую информацию</li>
          <li>Получите редактируемую карточку</li>
          <li>Повышайте рейтинг готовности</li>
          <li>Опубликуйте задачу</li>
          <li>Получите предложения команд</li>
          <li>Самостоятельно выберите подходящие предложения</li>
        </ul>
        <router-link class="btn btn-primary feature_action" :to="{ name: 'task_create' }">
          Создать задачу
        </router-link>
      </section>
      <section class="surface feature_card home_audience" aria-labelledby="home_teams_title">
        <p class="home_eyebrow">ОТ ИНТЕРЕСА К РЕАЛЬНОЙ ЗАДАЧЕ</p>
        <h2 id="home_teams_title" class="home_section_title">Для команд</h2>
        <ul class="home_audience_list">
          <li>Просматривайте общий каталог</li>
          <li>Используйте фильтры по теме и уровню готовности</li>
          <li>Изучайте опубликованные задачи</li>
          <li>Самостоятельно выбирайте интересные задачи</li>
          <li>Отправляйте предложения бизнесу</li>
        </ul>
        <router-link class="btn btn-outline feature_action" :to="{ name: 'task_catalog' }">
          Смотреть каталог
        </router-link>
      </section>
    </div>
  </div>
</template>
