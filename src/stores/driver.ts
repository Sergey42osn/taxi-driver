import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { SendLocationPayload } from '@/types/api'
import { authApi } from '@/api/auth'
import { driverApi } from '@/api/driver'
import { getErrorMessage } from '@/services/http'
import { LOCATION_CONFIG } from '@/config/location'
import type { Driver } from '@/types/driver'
import { tokenHolder, refreshAccessToken, resetTokenHolder } from '@/services/tokenHolder'

export const useDriverStore = defineStore('driver', () => {
  // ─── Состояние ─────────────────────────────────────────
  const accessToken = ref<string | null>(null) // ТОЛЬКО память
  const driver = ref<Driver | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isOnline = ref(false)

  // ─── Регистрация ───────────────────────────────────────
  const regStep = ref<'form' | 'code'>('form')
  const pendingEmail = ref('')
  const regLoading = ref(false)
  const regError = ref<string | null>(null)
  const regFieldErrors = ref<Record<string, string>>({})
  const regCodeHint = ref('')
  const regSuccess = ref(false)
  const resAction = ref<string | null>(null)

  // ─── Геттеры ───────────────────────────────────────────
  const isAuthenticated = computed(() => !!accessToken.value)

  const isLoadingDriver = ref(false)

  // ─── Хелперы ───────────────────────────────────────────
  function normalizeData(data: unknown): Record<string, any> {
    if (!data) return {}
    if (Array.isArray(data)) {
      return (
        (data.find((x) => x && typeof x === 'object' && !Array.isArray(x)) as Record<
          string,
          any
        >) ?? {}
      )
    }
    if (typeof data === 'object') return data as Record<string, any>
    return {}
  }

  function applyServerFieldError(body: any) {
    const data = normalizeData(body?.data)

    // { result: false, data: { action, msg, field? } }
    if (typeof data.msg === 'string') {
      regError.value = data.msg
      if (typeof data.field === 'string') regFieldErrors.value = { [data.field]: data.msg }
      return
    }

    // { result: false, field, msg } (плоский)
    if (typeof body?.field === 'string' && typeof body?.msg === 'string') {
      regError.value = body.msg
      regFieldErrors.value = { [body.field]: body.msg }
      return
    }

    // { errors: { email: ['...'] } }
    const errors = data.errors ?? body?.errors
    if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
      const firstField = Object.keys(errors)[0]
      if (firstField) {
        const firstMsg = (errors as any)[firstField]
        const msg = Array.isArray(firstMsg) ? String(firstMsg[0]) : String(firstMsg)
        regFieldErrors.value = { [firstField]: msg }
        regError.value = msg
        return
      }
    }

    if (typeof body?.message === 'string') regError.value = body.message
    else if (typeof data.message === 'string') regError.value = data.message
    else regError.value = regError.value ?? 'Не удалось выполнить запрос.'
  }

  function setAccessToken(token: string | null) {
    accessToken.value = token
    tokenHolder.access = token
  }

  // ─── Авторизация ───────────────────────────────────────
  async function login(email: string, password: string) {
    console.log(useDriverStore)

    loading.value = true
    error.value = null
    try {
      const res: any = await authApi.login({ email, password })

      console.log('[login] res.data:', res.data)
      console.log('[login] keys:', Object.keys(res.data))
      console.log('[login] user:', res.data.user)
      console.log('[login] status:', res.data.user?.status ?? res.data.status)
      console.log('[guard] driver.status:', useDriverStore.driver?.status)

      const data = normalizeData(res?.data.data)
      const access = data.token_access
      if (!access) throw new Error('Сервер не вернул токен')

      setAccessToken(access)
      // refresh приходит в HttpOnly cookie — ничего не сохраняем

      if (data.user) driver.value = data.user as Driver
    } catch (e) {
      error.value = getErrorMessage(e)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      /* локально всё равно разлогинимся */
    }
    setAccessToken(null)
    driver.value = null
    isOnline.value = false
    resetRegistration()
  }

  // ─── Регистрация ───────────────────────────────────────
  async function register(payload: {
    name: string
    email: string
    password: string
    password_confirmation: string
    phone?: string
    is_bot: number
    tel: string
    time: number
    code?: string
  }): Promise<{
    code_sent: boolean
    registered?: boolean
  }> {
    regLoading.value = true
    regError.value = null
    regFieldErrors.value = {}
    try {
      const result: any = await authApi.register(payload)
      const res = normalizeData(result?.data)

      const data = res?.data

      console.log(data)

      if (res?.result === true) {
        if (data.action === 'send_register') {
          regCodeHint.value = typeof data.msg === 'string' ? data.msg : 'Код отправлен'
          return { code_sent: true }
        }
        if (data.action === 'register_success') {
          const access = data.token_access
          if (access) setAccessToken(access) // ← ВОТ ЗДЕСЬ
          if (data.user) driver.value = data.user as Driver
          else await fetchMe()

          regStep.value = 'code'
          pendingEmail.value = data.email ?? payload.email
          resAction.value = 'register_success'
          regSuccess.value = true
          return { code_sent: true, registered: true }
        }
      } else {
        if (data.action === 'send_code') {
          pendingEmail.value = data.email ?? payload.email
          regStep.value = 'code'
          regCodeHint.value = typeof data.msg === 'string' ? data.msg : 'Код отправлен'
          return { code_sent: true }
        }
        if (data.action === 'send_code_refresh') {
          pendingEmail.value = data.email ?? payload.email
          regStep.value = 'code'
          regSuccess.value = true
          regCodeHint.value = typeof data.msg === 'string' ? data.msg : 'Запросите новый код'
          return { code_sent: true }
        }
      }

      applyServerFieldError(res)
      throw new Error(regError.value || 'Не удалось зарегистрироваться.')
    } catch (e: any) {
      const body = e?.response?.data
      const data = normalizeData(body?.data)

      if (data.action === 'send_code') {
        pendingEmail.value = data.email ?? payload.email
        regStep.value = 'code'
        regCodeHint.value = typeof data.msg === 'string' ? data.msg : 'Код отправлен'
        return { code_sent: true }
      }

      if (body && body.result === false) applyServerFieldError(body)
      else if (!regError.value) regError.value = getErrorMessage(e)
      throw new Error(regError.value ?? 'Не удалось зарегистрироваться.')
    } finally {
      regLoading.value = false
    }
  }

  async function verifyRegistration(code: string): Promise<boolean> {
    regLoading.value = true
    regError.value = null
    regFieldErrors.value = {}
    try {
      if (!pendingEmail.value) {
        regError.value = 'Email не указан. Начните регистрацию заново.'
        return false
      }

      const res: any = await authApi.verifyRegistration({
        email: pendingEmail.value,
        code,
      })

      if (res?.result !== true) {
        applyServerFieldError(res)
        if (!regError.value) regError.value = 'Неверный код. Попробуйте ещё раз.'
        return false
      }

      const data = normalizeData(res.data)
      const access = data.token_access
      if (!access) {
        regError.value = 'Сервер не вернул токен.'
        return false
      }

      setAccessToken(access)
      // refresh — в HttpOnly cookie, не трогаем

      if (data.user) {
        driver.value = data.user as Driver
      } else {
        // Если сервер не вернул профиль — запросим отдельно
        try {
          const me: any = await authApi.me()
          driver.value = (normalizeData(me?.data)?.user as Driver) ?? null
        } catch {
          /* некритично */
        }
      }

      regStep.value = 'form'
      pendingEmail.value = ''
      return true
    } catch (e: any) {
      const body = e?.response?.data
      if (body && body.result === false) {
        applyServerFieldError(body)
        if (!regError.value) regError.value = 'Неверный код. Попробуйте ещё раз.'
      } else {
        regError.value = getErrorMessage(e)
      }
      return false
    } finally {
      regLoading.value = false
    }
  }

  async function resendRegistrationCode(email: string) {
    regError.value = null
    regFieldErrors.value = {}
    try {
      const res: any = await authApi.resendRegistrationCode({ email })
      pendingEmail.value = email
      if (res?.result === false) {
        applyServerFieldError(res)
        throw new Error(regError.value || 'Не удалось отправить код.')
      }
    } catch (e: any) {
      const body = e?.response?.data
      if (body && body.result === false) applyServerFieldError(body)
      else if (!regError.value) regError.value = getErrorMessage(e)
      throw new Error(regError.value ?? 'Не удалось отправить код.')
    }
  }

  function resetRegistration() {
    regStep.value = 'form'
    pendingEmail.value = ''
    regError.value = null
    regFieldErrors.value = {}
    regCodeHint.value = ''
    regSuccess.value = false
    resAction.value = null
  }

  const lastSentLatLng = ref<{ lat: number; lng: number } | null>(null)
  const lastSentAt = ref(0)

  function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371000
    const toRad = (d: number) => (d * Math.PI) / 180
    const dLat = toRad(b.lat - a.lat)
    const dLng = toRad(b.lng - a.lng)
    const lat1 = toRad(a.lat),
      lat2 = toRad(b.lat)
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(h))
  }

  async function handlePosition(
    lat: number,
    lng: number,
    extra?: Pick<SendLocationPayload, 'accuracy' | 'speed' | 'heading'>,
  ) {
    console.log('[location] called | isOnline:', isOnline.value, '| token:', !!tokenHolder.access)

    if (!isOnline.value) return

    // нет access-токена — не спамим 401 (сессия ещё не восстановлена)
    if (!tokenHolder.access) {
      console.warn('[location] skip: no access token')
      return
    }

    const now = Date.now()
    const current = { lat, lng }
    const movedEnough =
      !lastSentLatLng.value ||
      distanceMeters(lastSentLatLng.value, current) >= LOCATION_CONFIG.distanceThreshold
    const timePassed = now - lastSentAt.value >= LOCATION_CONFIG.timeThreshold

    if (!movedEnough && !timePassed) return

    // сохраняем предыдущее состояние, чтобы откатить при ошибке
    const prevLatLng = lastSentLatLng.value
    const prevAt = lastSentAt.value

    // оптимистично фиксируем отправку, чтобы не спамить
    lastSentLatLng.value = current
    lastSentAt.value = now

    try {
      console.log('[location] sending with token:', tokenHolder.access.slice(0, 12) + '…')

      await driverApi.sendLocation({ ...current, timestamp: now, status: isOnline.value, ...extra })
    } catch (e) {
      console.warn('[location] send failed:', e)
      // откатываем — попробуем на следующем тике watchPosition
      lastSentLatLng.value = prevLatLng
      lastSentAt.value = prevAt
    }
  }

  // ─── Профиль ───────────────────────────────────────────
  async function updateProfile(patch: Partial<Driver>) {
    const updated = await driverApi.updateProfile({
      name: patch.name,
      phone: patch.phone,
      car: patch.car,
    })
    driver.value = { ...driver.value, ...updated } as Driver
  }

  let _restorePromise: Promise<boolean> | null = null

  async function restoreSession(): Promise<boolean> {
    if (_restorePromise) return _restorePromise

    _restorePromise = (async () => {
      try {
        if (tokenHolder.has()) {
          setAccessToken(tokenHolder.access)
          return await fetchMe()
        }

        const token = await refreshAccessToken()
        if (!token) {
          clearSession()
          return false
        }

        setAccessToken(token)
        return await fetchMe()
      } finally {
        _restorePromise = null
      }
    })()

    return _restorePromise
  }

  async function fetchMe() {
    try {
      const res: any = await authApi.me()
      const data = normalizeData(res?.data)
      driver.value = (data.user ?? data) as Driver
      return true
    } catch (e) {
      console.error('[fetchMe] failed:', e)
      driver.value = null
      return false
    }
  }

  // ─── Онлайн / офлайн ───────────────────────────────────
  async function goOnline() {
    if (!isAuthenticated.value) return
    try {
      const res: any = await driverApi.setOnline(true)
      const ok = res?.result === true
      if (!ok) {
        console.warn('[status] goOnline rejected:', res?.data)
        return // не ставим isOnline
      }
      isOnline.value = true
    } catch (e) {
      console.warn('[status] goOnline failed:', e)
    }
  }

  async function goOffline() {
    try {
      await driverApi.setOnline(false)
    } catch {
      /* ignore */
    }
    isOnline.value = false
  }

  function clearSession() {
    setAccessToken(null)
    driver.value = null
    isOnline.value = false
    resetRegistration()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('auth:logout', () => {
      setAccessToken(null)
      driver.value = null
      isOnline.value = false
      resetRegistration()
    })
  }

  return {
    // состояние
    accessToken,
    driver,
    loading,
    error,
    isOnline,
    isAuthenticated,
    // регистрация
    regStep,
    pendingEmail,
    regLoading,
    regError,
    regFieldErrors,
    regCodeHint,
    resAction,
    regSuccess,
    isLoadingDriver,
    restoreSession,
    handlePosition,
    lastSentAt,
    lastSentLatLng,
    register,
    verifyRegistration,
    resendRegistrationCode,
    resetRegistration,
    // прочее
    login,
    logout,
    updateProfile,
    fetchMe,
    goOnline,
    goOffline,
    clearSession,
  }
})
