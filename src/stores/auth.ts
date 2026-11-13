// stores/auth.ts
import { defineStore } from 'pinia'
import axios from 'axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: null as string | null,   // только память
    user: null as Record<string, any> | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
  },

  actions: {
    async login(credentials: { email: string; password: string }) {
      // Refresh приходит в HttpOnly cookie автоматически
      const { data } = await axios.post('/api/login', credentials, {
        withCredentials: true,
      })
      this.accessToken = data.token_access
      this.user = data.user
    },

    async refresh() {
      // Браузер сам отправит HttpOnly cookie
      const { data } = await axios.post('/api/refresh', {}, {
        withCredentials: true,
      })
      this.accessToken = data.token_access
      return this.accessToken
    },

    async logout() {
      try {
        await axios.post('/api/logout', {}, { withCredentials: true })
      } finally {
        this.accessToken = null
        this.user = null
      }
    },
  },
})