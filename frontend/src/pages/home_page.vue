<script setup>
import { computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import FeatureCard from '../components/feature_card.vue';

const store = useStore();
const api_status = computed(() => store.state.app_status.api_status);

onMounted(() => store.dispatch('app_status/check_api_status'));
</script>

<template>
  <div class="page_stack">
    <section class="page_heading">
      <p class="eyebrow page_eyebrow">ОБРАЗОВАТЕЛЬНЫЙ ХАКАТОН</p>
      <h1 class="page_title">KazAST-AI</h1>
      <p class="page_description">
        Площадка, где бизнес публикует задачи, а студенческие команды предлагают решения.
      </p>
      <div class="api_status"><span class="status_dot"></span>{{ api_status }}</div>
    </section>

    <section class="feature_grid" aria-label="Разделы платформы">
      <FeatureCard
        title="Найти задачу"
        description="Просматривайте открытые задачи бизнеса и выбирайте интересные вашей команде."
        :to="{ name: 'task_catalog' }"
        button_label="Открыть каталог"
        button_variant="btn-primary"
      />
      <FeatureCard
        title="Опубликовать задачу"
        description="Опишите потребность, уточните карточку и подготовьте её к откликам команд."
        :to="{ name: 'task_create' }"
        button_label="Создать задачу"
        button_variant="btn-outline"
      />
    </section>
  </div>
</template>
