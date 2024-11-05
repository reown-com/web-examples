import './assets/main.css'

import { createApp } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'

const queryClient = new QueryClient()

createApp(App)
  // @ts-ignore
  .use(VueQueryPlugin, { queryClient })
  .mount('#app')
