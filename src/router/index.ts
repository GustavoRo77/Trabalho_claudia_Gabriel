import { createRouter, createWebHistory } from '@ionic/vue-router';
import HomePage from '../views/HomePage.vue';
export default createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes: [{ path: '/', component: HomePage }] });
