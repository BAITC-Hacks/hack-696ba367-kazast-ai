<script src="./task_readiness.js"></script>
<template>
  <section class="surface readiness_panel" aria-labelledby="readiness_title">
    <p class="section_kicker">ГОТОВНОСТЬ К РАБОТЕ</p>
    <h2 id="readiness_title">Рейтинг задачи</h2>
    <div class="score_display"><strong>{{ confirmation ? confirmation.score : '—' }}</strong><span>из 100</span></div>
    <progress v-if="confirmation" class="score_progress" :value="confirmation.score" max="100" aria-label="Рейтинг готовности"></progress>
    <span class="status_badge">{{ level_label }}</span>
    <p class="readiness_hint">{{ !confirmation ? 'Заполните и подтвердите карточку, чтобы получить рейтинг.' : has_changes ? 'Показан рейтинг последней подтверждённой версии. Сохраните и подтвердите изменения для пересчёта.' : 'Рейтинг рассчитан по подтверждённым сведениям.' }}</p>
    <ul class="criteria_list">
      <li v-for="criterion in rating_criteria" :key="criterion.key">
        <span>{{ criterion.label }}</span>
        <strong>{{ confirmation ? confirmation.breakdown[criterion.key] : '—' }} / {{ criterion.max }}</strong>
      </li>
    </ul>
    <div v-if="confirmation?.missing.length" class="readiness_missing">
      <h3>Что повысит рейтинг</h3>
      <ul><li v-for="criterion in rating_criteria.filter(item => confirmation.missing.includes(item.key))" :key="criterion.key">
        <a :href="`#${criterion.target}`" @click.prevent="focus_field(criterion.target)">{{ criterion.label }}</a>
      </li></ul>
      <p class="field-help">Баллы за связь начисляются, когда заполнены контакт, формат взаимодействия и порядок обратной связи.</p>
    </div>
    <p class="field-help">Низкий рейтинг не мешает будущей публикации и откликам команд.</p>
  </section>
</template>
