import { authApi } from '@/api/auth'

let _access: string | null = null

export const tokenHolder = {
  get access(): string | null {
    return _access
  },
  set access(token: string | null) {
    _access = token
  },
  clear(): void {
    _access = null
  },
  has(): boolean {
    return _access !== null && _access !== ''
  },
}

// ─── Single-flight refresh ──────────────────────────────
let _refreshPromise: Promise<string | null> | null = null

/**
 * Обновляет access-токен через /auth/refresh.
 * Параллельные вызовы получают один и тот же промис,
 * поэтому POST /auth/refresh уходит ровно один.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise

  const p = (async (): Promise<string | null> => {
    try {
      const res: any = await authApi.refresh()
      const body = res?.data?.data ?? res?.data ?? {}
      const token =
        typeof body.token_access === 'string'
          ? body.token_access
          : (body.token_access?.token ?? null)

      if (token) tokenHolder.access = token
      else tokenHolder.clear()

      return token
    } catch {
      tokenHolder.clear()
      return null
    }
  })()

  // сбрасываем _refreshPromise только когда промис уже завершён
  _refreshPromise = p.finally(() => {
    _refreshPromise = null
  })

  return _refreshPromise
}

/** Сбросить и промис, и токен (например, при logout). */
export function resetTokenHolder(): void {
  _refreshPromise = null
  tokenHolder.clear()
}
