<script setup>
import { onMounted, ref } from 'vue';

const apiStatus = ref('Проверяем API…');
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

onMounted(async () => {
  try {
    const response = await fetch(`${apiUrl}/api/health`);
    if (!response.ok) throw new Error('API unavailable');
    const data = await response.json();
    apiStatus.value = data.status === 'ok' ? 'API доступен' : 'API ответил';
  } catch {
    apiStatus.value = 'API пока недоступен';
  }
});
</script>

<template>
  <main class="welcome">
    <div class="card">
      <div class="mark" aria-hidden="true">K</div>
      <p class="eyebrow">ОБРАЗОВАТЕЛЬНЫЙ ХАКАТОН</p>
      <h1>KazAST-AI</h1>
      <p class="intro">Стартовая площадка проекта готова.</p>
      <div class="status"><span class="dot"></span>{{ apiStatus }}</div>
      <p class="hint">Когда появится постановка задачи, здесь начнётся ваш продукт.</p>
    </div>
  </main>
</template>
