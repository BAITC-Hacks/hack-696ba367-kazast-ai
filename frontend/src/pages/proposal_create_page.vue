<script src="./proposal_create_page.js"></script>

<template>
  <section class="page_stack">
    <h1 class="page_title">Предложение команды</h1>
    <p v-if="is_loading" role="status">Загружаем задачу...</p>
    <div v-else-if="load_error" class="surface page_panel" role="alert">
      <p>{{ load_error }}</p>
      <button class="btn btn-outline" @click="load_task">Повторить</button>
    </div>
    <template v-else-if="task">
      <task-summary :task="task" />
      <div v-if="is_sent" class="surface page_panel" role="status">
        <h2>Предложение отправлено</h2>
        <p>Ожидает решения</p>
      </div>
      <form v-else class="surface page_panel proposal_form" novalidate @submit.prevent="submit_proposal">
        <p v-if="context?.user.role !== 'student'" role="status">Отправка предложений доступна студентам.</p>
        <p v-else-if="!context.teams.length" role="status">Вы пока не состоите в команде.</p>
        <div v-else class="field">
          <label class="field-label" for="proposal_team">Команда</label>
          <select id="proposal_team" v-model="fields.team_id" class="select" :disabled="is_sending">
            <option disabled value="">Выберите команду</option>
            <option v-for="team in context.teams" :key="team.id" :value="team.id">{{ team.name }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label" for="proposal_idea">Идея решения</label>
          <textarea id="proposal_idea" v-model="fields.idea" class="textarea" required :disabled="is_sending" :aria-invalid="!!errors.idea" aria-describedby="idea_error"></textarea>
          <span id="idea_error" class="field-error">{{ errors.idea }}</span>
        </div>
        <div class="field">
          <label class="field-label" for="proposal_plan">План реализации</label>
          <textarea id="proposal_plan" v-model="fields.plan" class="textarea" required :disabled="is_sending" :aria-invalid="!!errors.plan" aria-describedby="plan_error"></textarea>
          <span id="plan_error" class="field-error">{{ errors.plan }}</span>
        </div>
        <div class="field">
          <label class="field-label" for="proposal_timeline">Срок</label>
          <input id="proposal_timeline" v-model="fields.timeline" class="input" required placeholder="Например, 3 недели" :disabled="is_sending" :aria-invalid="!!errors.timeline" aria-describedby="timeline_error" />
          <span id="timeline_error" class="field-error">{{ errors.timeline }}</span>
        </div>
        <div class="field">
          <label class="field-label" for="proposal_url">Ссылка на прототип (необязательно)</label>
          <input id="proposal_url" v-model="fields.prototype_url" class="input" type="url" placeholder="https://example.com" :disabled="is_sending" :aria-invalid="!!errors.prototype_url" aria-describedby="url_error" />
          <span id="url_error" class="field-error">{{ errors.prototype_url }}</span>
        </div>
        <p v-if="error" role="alert">{{ error }}</p>
        <button class="btn btn-primary" :disabled="is_sending || !can_submit">{{ is_sending ? 'Отправляем...' : 'Отправить предложение' }}</button>
      </form>
    </template>
    <router-link class="btn btn-ghost" :to="{ name: 'task_detail', params: { id: $route.params.task_id } }">Вернуться к задаче</router-link>
  </section>
</template>
