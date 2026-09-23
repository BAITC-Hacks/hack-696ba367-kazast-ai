<script src="./owned_task_card.js"></script>
<template>
  <article class="surface catalog_card">
    <div class="catalog_card_top"><span class="status_badge">{{ task.status==='published'?'Опубликована':'Черновик' }}</span><span class="catalog_industry">{{ task.industry || 'Без темы' }}</span></div>
    <h2>{{ task.title || 'Задача без названия' }}</h2>
    <p class="catalog_excerpt">{{ task.description }}</p>
    <p class="field-help">{{ task.confirmed_score===null?'Ещё не подтверждена':`Рейтинг подтверждённой карточки: ${task.confirmed_score}/100` }}</p>
    <p v-if="task.status==='published'" class="field-help">В каталоге: {{ task.published_score }}/100</p>
    <p v-if="task.has_unpublished_changes" class="field-help">Есть изменения, которые ещё не опубликованы.</p>
    <p v-else-if="task.has_unconfirmed_changes" class="field-help">Карточка требует подтверждения.</p>
    <p class="field-help">Откликов: {{ task.proposals_count }} · Ожидают решения: {{ task.pending_proposals_count }}</p>
    <div class="proposal_actions catalog_card_action">
      <RouterLink class="btn btn-primary btn-sm" :to="{name:'task_edit',params:{id:task.id}}">Редактировать</RouterLink>
      <RouterLink class="btn btn-outline btn-sm" :to="{name:'task_proposals',params:{id:task.id}}">Отклики</RouterLink>
      <RouterLink v-if="task.status==='published'" class="btn btn-ghost btn-sm" :to="{name:'task_detail',params:{id:task.id}}">Открыть публикацию</RouterLink>
    </div>
  </article>
</template>
