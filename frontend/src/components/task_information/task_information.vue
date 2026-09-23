<script src="./task_information.js"></script>
<template>
  <section class="surface task_information">
    <h2>{{ title }}</h2>
    <dl><template v-for="field in fields" :key="field.key">
      <dt>{{ field.label }}</dt><dd>{{ card[field.key] || 'Пока не указано' }}</dd>
    </template></dl>
  </section>
</template>
