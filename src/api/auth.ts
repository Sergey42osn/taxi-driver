import { http } from '@/services/http'
import type { AuthResponse, LoginPayload, RegisterPayload } from '@/types/api'

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/login', payload)
    return data
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/register', payload)
    return data
  },

  async me(): Promise<AuthResponse['driver']> {
    const { data } = await http.get<AuthResponse['driver']>('/auth/me')
    return data
  },

  async logout(): Promise<void> {
    await http.post('/auth/logout').catch(() => {
      // даже если сервер недоступен — локально разлогинимся
    })
  },
}
