import './assets/main.css'
import 'leaflet/dist/leaflet.css' // <-- обязательно

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './services/http'
import { useDriverStore } from './stores/driver'

import './assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 401 → принудительный разлогин
setUnauthorizedHandler(() => {
  const driver = useDriverStore()
  driver.clearSession()
  router.push({ name: 'login' })
})

app.mount('#app')
