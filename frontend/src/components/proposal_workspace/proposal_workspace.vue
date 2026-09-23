<script src="./proposal_workspace.js"></script>
<template>
  <section class="page_stack" :aria-busy="is_busy">
    <feedback-notice v-if="state.error" tone="error" :message="state.error.message">
      <p v-if="state.error.code === 'NETWORK_ERROR'">Перед повторной отправкой обновите список: предложение могло сохраниться.</p>
      <button class="btn btn-outline btn-sm" type="button" :disabled="is_busy" @click="load">Обновить список</button>
    </feedback-notice>
    <feedback-notice v-if="state.notice" tone="success" :message="state.notice" />
    <p v-if="state.is_loading" role="status">Загружаем предложения…</p>
    <template v-else>
      <form v-if="mode === 'form' && state.role === 'student' && state.teams.length" class="surface form_section" @submit.prevent="submit">
        <header class="section_heading"><h2>Предложить решение</h2><p>Расскажите бизнесу, что ваша команда готова сделать.</p></header>
        <div class="form_fields">
          <div class="field"><label class="field-label" for="proposal_team">Команда</label><select id="proposal_team" class="select" :value="draft.team_id" :disabled="is_busy" required @change="set_field('team_id',$event.target.value)"><option v-for="team in state.teams" :key="team.id" :value="team.id">{{ team.name }}</option></select></div>
          <form-field v-for="field in fields" :key="field.key" :field="field" :value="draft[field.key]" :is_disabled="is_busy" :error="state.error?.details?.[field.key]" @update="set_field(field.key,$event)" />
          <button class="btn btn-primary" type="submit" :disabled="!can_submit">{{ state.pending_action==='submit'?'Отправляем…':'Отправить предложение' }}</button>
        </div>
      </form>
      <p v-if="state.role==='student' && !state.teams.length && !state.error" class="surface page_panel">У вас пока нет команды. Для демо загрузите данные команд через db:seed.</p>
      <div class="catalog_summary"><h2>{{ state.role==='business'?'Предложения команд':'Отклики моих команд' }}</h2><button class="btn btn-ghost btn-sm" type="button" :disabled="is_busy" @click="load">Обновить</button></div>
      <p v-if="state.role==='business'" class="field-help">Можно выбрать несколько команд или отклонить все предложения. Принятое решение нельзя изменить.</p>
      <p v-if="!state.items.length && !state.error" class="surface page_panel">Пока нет откликов.</p>
      <proposal-card v-for="proposal in state.items" :key="proposal.id" :proposal="proposal" :can_decide="state.role==='business'" :is_busy="is_busy || Boolean(state.error)" @decide="decide(proposal.id,$event)" />
    </template>
  </section>
</template>
