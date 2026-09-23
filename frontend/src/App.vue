<script setup>
import { computed, onMounted } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const api_status = computed(() => store.state.app_status.api_status);

onMounted(() => store.dispatch('app_status/check_api_status'));
</script>

<template>
  <main class="welcome">
    <div class="card">
      <div class="mark" aria-hidden="true">K</div>
      <p class="eyebrow">ОБРАЗОВАТЕЛЬНЫЙ ХАКАТОН</p>
      <h1>KazAST-AI</h1>
      <p class="intro">Стартовая площадка проекта готова.</p>
      <div class="status"><span class="dot"></span>{{ api_status }}</div>
      <p class="hint">Когда появится постановка задачи, здесь начнётся ваш продукт.</p>
    </div>
  </main>
</template>
