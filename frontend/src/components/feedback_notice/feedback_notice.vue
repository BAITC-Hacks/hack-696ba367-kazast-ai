<script src="./feedback_notice.js"></script>
<template>
  <div class="feedback_notice" :class="`notice_${tone}`" :role="tone === 'error' ? 'alert' : 'status'">
    <p>{{ message }}</p><slot />
  </div>
</template>
