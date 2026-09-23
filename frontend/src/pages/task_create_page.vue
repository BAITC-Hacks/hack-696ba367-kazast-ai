<script src="./task_create_page.js"></script>
<template>
  <section class="page_stack task_workspace" :aria-busy="is_busy">
    <header class="task_page_heading">
      <div class="page_heading">
        <p class="section_kicker">ДЛЯ БИЗНЕСА · КОНСТРУКТОР ЗАДАЧИ</p>
        <h1 class="page_title">{{ task_state.task ? 'Карточка задачи' : $route.params.id ? (task_state.error ? 'Задача недоступна' : 'Загрузка задачи') : 'Начнём с вашей идеи' }}</h1>
        <p class="page_description">{{ task_state.task ? 'Расскажите командам, что нужно решить. Чем понятнее задача, тем проще начать совместную работу.' : 'Опишите потребность своими словами. Сохраните черновик, затем дополните детали и подтвердите карточку.' }}</p>
      </div>
      <span class="demo_label">Демо-кабинет бизнеса</span>
    </header>

    <ol class="task_steps" aria-label="Этапы создания задачи">
      <li :class="{ step_active: !task_state.task }" :aria-current="!task_state.task ? 'step' : undefined"><span>01</span> Опишите задачу</li>
      <li :class="{ step_active: task_state.task && (task_state.has_unconfirmed_changes || is_dirty) }" :aria-current="task_state.task && (task_state.has_unconfirmed_changes || is_dirty) ? 'step' : undefined"><span>02</span> Дополните карточку</li>
      <li :class="{ step_active: task_state.confirmation && !task_state.has_unconfirmed_changes && !is_dirty }" :aria-current="task_state.confirmation && !task_state.has_unconfirmed_changes && !is_dirty ? 'step' : undefined"><span>03</span> Подтвердите сведения</li>
    </ol>

    <feedback-notice v-if="task_state.error" tone="error" :message="task_state.error.message">
      <template v-if="has_conflict">
        <p>Ваш текст остался в форме. Скопируйте нужные изменения перед загрузкой актуальной версии.</p>
        <button class="btn btn-outline btn-sm" type="button" :disabled="is_busy" @click="reload_task">Загрузить актуальную версию</button>
      </template>
      <button v-else-if="$route.params.id" class="btn btn-outline btn-sm" type="button" :disabled="is_busy" @click="reload_task">Загрузить сохранённую задачу</button>
    </feedback-notice>
    <feedback-notice v-if="task_state.notice" tone="success" :message="task_state.notice" />
    <p v-if="task_state.pending_action === 'load'" role="status">Загружаем сохранённую задачу…</p>

    <div v-if="task_state.task || (!$route.params.id && task_state.pending_action !== 'load')" class="task_columns">
      <form class="task_form" @submit.prevent="save_task">
        <form-section :title="task_state.task ? 'Исходное описание' : 'Какая помощь вам нужна?'" description="Не нужно сразу продумывать всё. Начните с проблемы, которую хотите решить.">
          <form-field :field="original_field" :value="task_state.draft.original_description" :is_disabled="is_busy || answers_dirty"
            :error="task_state.error?.details?.original_description" @update="update_field('original_description', $event)" />
        </form-section>
        <clarification-panel v-if="task_state.task" />
        <template v-if="task_state.task">
          <form-section v-for="group in field_groups" :key="group.title" :title="group.title" :description="group.description">
            <form-field v-for="field in group.fields" :key="field.key" :field="field" :value="task_state.draft[field.key]"
              :error="task_state.error?.details?.[field.key]" :is_disabled="is_busy || answers_dirty" @update="update_field(field.key, $event)" />
          </form-section>
        </template>
        <div class="surface task_actions">
          <div class="action_summary" aria-live="polite">
            <strong>{{ is_dirty ? 'Есть несохранённые изменения' : task_state.task ? 'Все изменения сохранены' : 'Ваш первый шаг' }}</strong>
            <p class="field-help">{{ task_state.task ? 'Сохранённую задачу можно снова открыть по адресу этой страницы.' : 'Черновик будет доступен только в вашем кабинете.' }}</p>
          </div>
          <button class="btn btn-primary" type="submit" :disabled="!can_save">{{ task_state.pending_action === 'save' ? 'Сохраняем…' : task_state.task ? 'Сохранить изменения' : 'Создать черновик' }}</button>
        </div>
      </form>

      <aside class="task_sidebar">
        <RouterLink v-if="task_state.task" class="btn btn-outline" :to="{name:'task_proposals',params:{id:task_state.task.id}}">Предложения команд</RouterLink>
        <publication-panel v-if="task_state.task" :task_id="task_state.task.id" :is_published="is_published"
          :is_current="is_publication_current" :is_dirty="is_dirty" :has_unconfirmed_changes="task_state.has_unconfirmed_changes"
          :can_publish="can_publish" :is_publishing="task_state.pending_action === 'publish'" :has_conflict="has_conflict"
          @publish="publish_task" />
        <task-readiness :confirmation="task_state.confirmation" :has_changes="is_dirty || task_state.has_unconfirmed_changes" />
        <section v-if="task_state.task" class="surface confirmation_panel">
          <h2>Подтверждение карточки</h2>
          <p>Проверьте, что сведения верны. После подтверждения мы зафиксируем эту версию и рассчитаем рейтинг.</p>
          <p v-if="is_dirty" class="field-help">Сначала сохраните изменения.</p>
          <p v-else-if="!task_state.draft.title.trim()" class="field-help">Для подтверждения заполните и сохраните название задачи.</p>
          <p v-else-if="!task_state.has_unconfirmed_changes" class="confirmation_complete">Текущая карточка подтверждена.</p>
          <button type="button" class="btn btn-secondary btn-block" :disabled="!can_confirm" @click="confirm_task">{{ task_state.pending_action === 'confirm' ? 'Подтверждаем…' : 'Подтвердить карточку' }}</button>
          <p class="field-help">Подтверждение не публикует задачу в каталоге.</p>
        </section>
      </aside>
    </div>
  </section>
</template>
