<script src="./page_pagination.js"></script>
<template>
  <nav v-if="total_pages > 1" class="page_pagination" aria-label="Страницы каталога">
    <button type="button" class="btn btn-outline btn-sm" :disabled="is_disabled || page <= 1" @click="$emit('change', page - 1)">Назад</button>
    <template v-for="item in pages" :key="item">
      <button v-if="typeof item === 'number'" type="button" class="btn btn-sm" :class="item === page ? 'btn-primary' : 'btn-ghost'"
        :aria-label="`Страница ${item}`" :aria-current="item === page ? 'page' : undefined" :disabled="is_disabled || item === page" @click="$emit('change', item)">{{ item }}</button>
      <span v-else aria-hidden="true">…</span>
    </template>
    <button type="button" class="btn btn-outline btn-sm" :disabled="is_disabled || page >= total_pages" @click="$emit('change', page + 1)">Далее</button>
  </nav>
</template>
