import { http } from '@/services/http'

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    http.post<{
      result?: boolean
      data?: { user_id?: number; token_access?: string; token_refresh?: string; driver?: unknown }
      token?: string
      refreshToken?: string
      driver?: unknown
      field?: string
      msg?: string
    }>('/auth/login', payload),

  register: (payload: {
    name: string
    email: string
    password: string
    password_confirmation: string
    phone?: string
    is_bot: number
    tel: string
    time: number
  }) =>
    http.post<{
      result: boolean
      data?:
        | {
            user_id?: number
            email?: string
            token_access?: string
            token_refresh?: string
            token?: string
            refreshToken?: string
            driver?: unknown
            field?: string
            msg?: string
            errors?: Record<string, string | string[]>
            message?: string
            [key: string]: unknown
          }
        | []
      field?: string
      msg?: string
      token?: string
      refreshToken?: string
      driver?: unknown
      [key: string]: unknown
    }>('/auth/register', payload),

  verifyRegistration: (payload: { email: string; code: string }) =>
    http.post<{
      result: boolean
      data?:
        | {
            user_id?: number
            token_access?: string
            token_refresh?: string
            token?: string
            refreshToken?: string
            driver?: unknown
            field?: string
            msg?: string
            [key: string]: unknown
          }
        | []
      field?: string
      msg?: string
      token?: string
      refreshToken?: string
      driver?: unknown
      [key: string]: unknown
    }>('/auth/register/verify', payload),

  resendRegistrationCode: (payload: { email: string }) =>
    http.post<{ result: boolean; data?: unknown; field?: string; msg?: string }>(
      '/auth/resend/code/',
      payload,
    ),

  me: () => http.get<unknown>('/auth/me'),

  // ← ДОБАВИТЬ ЭТО
  refresh: () =>
    http.post<{
      result?: boolean
      data?: { token_access?: string; token?: string }
      token_access?: string
      token?: string
    }>('/auth/refresh'),

  logout: () => http.post<void>('/auth/logout'),
}
