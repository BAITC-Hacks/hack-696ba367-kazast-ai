<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  to: { type: Object, required: true },
  button_label: { type: String, required: true },
  button_variant: { type: String, default: 'btn-primary' },
});
</script>

<template>
  <section class="surface feature_card">
    <h2 class="feature_title">{{ title }}</h2>
    <p class="feature_description">{{ description }}</p>
    <RouterLink class="btn feature_action" :class="button_variant" :to="to">
      {{ button_label }}
    </RouterLink>
  </section>
</template>
