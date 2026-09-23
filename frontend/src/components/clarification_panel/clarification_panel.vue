<script src="./clarification_panel.js"></script>
<template>
  <section class="surface form_section clarification_panel" aria-labelledby="clarification_title">
    <h2 id="clarification_title">Уточним задачу с AI</h2>
    <p>Ответьте на вопросы, чтобы подготовить карточку. Проверьте предложенный текст перед сохранением и подтверждением.</p>
    <p v-if="session?.mode === 'local'" class="field-help">Локальный демо-режим: вопросы подбираются по незаполненным полям, ответы переносятся дословно. Внешний AI не используется.</p>
    <p v-else class="field-help">В режиме AI сохранённое описание, поля карточки и ответы отправляются в OpenAI для подготовки результата.</p>
    <p v-if="is_dirty" class="field-help">Сначала сохраните изменения карточки.</p>
    <p v-if="is_stale" role="status">Карточка изменилась после уточнения. Для следующего уточнения получите новые вопросы. Предыдущие ответы сохранены.</p>
    <button type="button" class="btn btn-secondary" :disabled="is_blocked || answers_dirty" @click="clarify('questions')">{{ state.pending_action === 'clarify_questions' ? 'Готовим вопросы…' : session ? 'Получить новые вопросы' : 'Получить вопросы' }}</button>
    <div v-if="session" class="clarification_questions">
      <form-field v-for="question in session.questions" :key="question.id" :field="question_field(question)" :value="state.answers[question.id] || ''"
        :is_disabled="is_busy || is_stale || is_dirty" @update="update_answer(question.id, $event)" />
      <p v-if="answers_dirty" role="status">Есть несохранённые ответы. Сохраните их перед следующим действием.</p>
      <div class="proposal_actions">
        <button type="button" class="btn btn-primary" :disabled="is_blocked || is_stale || !answers_dirty" @click="clarify('answers')">{{ state.pending_action === 'clarify_answers' ? 'Сохраняем…' : 'Сохранить ответы' }}</button>
        <button type="button" class="btn btn-outline" :disabled="is_blocked || is_stale || answers_dirty || !has_answers" @click="clarify('card')">{{ state.pending_action === 'clarify_card' ? 'Готовим карточку…' : 'Подготовить карточку' }}</button>
      </div>
      <details v-if="session.suggested_card" open>
        <summary>Предложенная карточка — проверьте сведения</summary>
        <dl class="clarification_preview"><template v-for="field in suggestion_fields" :key="field.key"><dt>{{ field.label }}</dt><dd>{{ field.value || 'Нет сведений' }}</dd></template></dl>
        <button type="button" class="btn btn-secondary" :disabled="is_blocked || is_stale || answers_dirty" @click="apply_suggestion">Перенести в форму</button>
        <p class="field-help">Текст можно отредактировать в полях ниже. Сохранение, подтверждение и публикация выполняются отдельно.</p>
      </details>
    </div>
  </section>
</template>
