import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: './', // <-- для Capacitor (Android/iOS/Electron)
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@api': fileURLToPath(new URL('./src/api', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist', // дефолт, но фиксируем явно
    emptyOutDir: true,
    // Для WebView старых Android — можно понизить target:
    // target: 'es2017',
  },
  server: {
    proxy: {
      '/wp-json': {
        target: 'https://web42.ru/taxidriver',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost', // ← переписать Domain на localhost
        cookiePathRewrite: '/', // ← path=/ (на всякий случай)
        // важно: не терять Set-Cookie
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // для отладки: посмотреть, какие Set-Cookie приходят от бэкенда
            if (proxyRes.headers['set-cookie']) {
              console.log('[proxy] set-cookie:', proxyRes.headers['set-cookie'])
            }
          })
        },
      },
    },
  },
})
