import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: './', // <-- для Capacitor (Android/iOS/Electron)
  plugins: [vue(), vueDevTools()],
 resolve: { alias: { '@': ..., '@api': fileURLToPath(new URL('./src/api', import.meta.url)) } },
  build: {
    outDir: 'dist', // дефолт, но фиксируем явно
    emptyOutDir: true,
    // Для WebView старых Android — можно понизить target:
    // target: 'es2017',
  },
})
