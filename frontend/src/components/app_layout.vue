<script setup>
import AppHeader from './app_header.vue';
</script>

<template>
  <div class="app_shell">
    <AppHeader />
    <main class="container app_main">
      <RouterView />
    </main>
  </div>
</template>
