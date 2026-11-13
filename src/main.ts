import './assets/main.css'
import 'leaflet/dist/leaflet.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useDriverStore } from './stores/driver'
import { tokenHolder } from '@/services/tokenHolder' // ← добавить сюда

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const driver = useDriverStore(pinia)

// разлогин по событию из http.ts — навешиваем ДО restoreSession
window.addEventListener('auth:logout', () => {
  router.replace({ name: 'login' })
})

;(async () => {
  const ok = await driver.restoreSession()

  console.log('[main] token:', driver.accessToken ? 'present' : 'NULL')

  if (!ok) console.warn('[main] no active session, mounting as guest')

  // Монтируем ПОСЛЕ восстановления — guard увидит актуальный driver
  app.mount('#app')
})()
