import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router/index.js';
import { store } from './store/index.js';
import '../style/tokens.css';
import '../style/controls.css';
import '../style/global.css';

createApp(App).use(store).use(router).mount('#app');
