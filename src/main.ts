/**
 * Vue application entry point.
 * Starts analytics, creates the root App component, installs the router, and mounts it.
 */
import {createApp} from 'vue'
import App from '@/app.vue'
import router from '@/router'
import {startAnalytics} from '@/services/analytics'
import '@/assets/styles.css'

startAnalytics()

createApp(App).use(router).mount('#app')
