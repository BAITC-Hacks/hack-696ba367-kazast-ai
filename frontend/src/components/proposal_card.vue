<script src="./proposal_card.js"></script>

<template>
  <article class="surface page_panel proposal_card">
    <h2>{{ team_name }}</h2>
    <p class="status_badge" role="status">{{ status_label }}</p>
    <div><h3>Идея решения</h3><p class="proposal_text">{{ proposal.idea }}</p></div>
    <div><h3>План реализации</h3><p class="proposal_text">{{ proposal.plan }}</p></div>
    <p>Срок: {{ proposal.timeline }}</p>
    <a v-if="prototype_url" class="btn btn-outline" :href="prototype_url" target="_blank" rel="noopener noreferrer">Открыть прототип</a>
    <p v-else>Ссылка на прототип не указана или некорректна</p>
    <div v-if="proposal.status === 'pending'" class="interaction_actions">
      <button class="btn btn-primary" :disabled="is_busy" @click="$emit('decide', 'accepted')">Выбрать</button>
      <button class="btn btn-danger" :disabled="is_busy" @click="$emit('decide', 'rejected')">Отклонить</button>
    </div>
    <p v-if="is_busy" role="status">Сохраняем решение...</p>
    <p v-if="error" role="alert">{{ error }}</p>
  </article>
</template>
