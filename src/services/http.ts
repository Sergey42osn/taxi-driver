import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { tokenHolder, refreshAccessToken } from '@/services/tokenHolder'

export const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ─── Request: подставляем Access Token ─────────────────────
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const url = config.url ?? ''
  if (url.includes('/auth/refresh') || url.includes('/auth/login')) {
    return config
  }
  if (tokenHolder.access) {
    config.headers.Authorization = `Bearer ${tokenHolder.access}`
  }
  return config
})

// ─── Response: авто-refresh при 401 ────────────────────────
http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const isRefreshRequest = original?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && !original._retry && !isRefreshRequest) {
      original._retry = true

      // Тот же single-flight, что и в restoreSession()
      const newToken = await refreshAccessToken()

      if (!newToken) {
        // refresh не удался — разлогин
        window.dispatchEvent(new CustomEvent('auth:logout'))
        return Promise.reject(error)
      }

      original.headers.Authorization = `Bearer ${newToken}`
      return http(original)
    }

    return Promise.reject(error)
  },
)

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          result?: false
          data?: { msg?: string; message?: string }
          msg?: string
          message?: string
          code?: string
        }
      | undefined

    if (data?.data?.msg) return data.data.msg
    if (data?.msg) return data.msg
    if (data?.message) return data.message
    return error.message || 'Ошибка сети'
  }
  if (error instanceof Error) return error.message
  return 'Неизвестная ошибка'
}
