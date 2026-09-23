<script src="./proposal_card.js"></script>
<template>
  <article class="surface task_information proposal_card">
    <div class="catalog_summary"><h3>{{ proposal.team_name || 'Предложение команды' }}</h3><span class="status_badge">{{ status_label }}</span></div>
    <RouterLink v-if="proposal.task_title" :to="{name:'task_detail',params:{id:proposal.task_id}}" class="proposal_task_link">{{ proposal.task_title }}</RouterLink>
    <p v-if="proposal.skills?.length" class="field-help">Навыки: {{ proposal.skills.join(', ') }}</p>
    <p v-if="proposal.technologies?.length" class="field-help">Технологии: {{ proposal.technologies.join(', ') }}</p>
    <dl><dt>Идея решения</dt><dd>{{ proposal.idea }}</dd><dt>План работы</dt><dd>{{ proposal.plan }}</dd><dt>Срок</dt><dd>{{ proposal.timeline }}</dd></dl>
    <a v-if="safe_url" class="btn btn-outline btn-sm" :href="safe_url" target="_blank" rel="noopener noreferrer">Открыть прототип ↗</a>
    <div v-if="can_decide && proposal.status === 'pending'" class="proposal_actions">
      <button class="btn btn-primary" type="button" :disabled="is_busy" @click="$emit('decide','accepted')">Выбрать команду</button>
      <button class="btn btn-outline" type="button" :disabled="is_busy" @click="$emit('decide','rejected')">Отклонить</button>
    </div>
  </article>
</template>
