<script src="./form_section.js"></script>
<template>
  <section class="surface form_section">
    <header class="section_heading"><h2>{{ title }}</h2><p v-if="description">{{ description }}</p></header>
    <div class="form_fields"><slot /></div>
  </section>
</template>
