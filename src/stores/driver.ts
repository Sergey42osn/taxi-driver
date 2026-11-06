import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api/auth'
import { driverApi } from '@/api/driver'
import { tokenStorage } from '@/services/tokenStorage'
import { getErrorMessage } from '@/services/http'
import type { Driver } from '@/types/driver'

const PROFILE_KEY = 'taxi.driver.profile'

function loadProfile(): Driver | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useDriverStore = defineStore('driver', () => {
  const driver = ref<Driver | null>(loadProfile())
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isOnline = ref(false)

  const isAuthenticated = computed(() => !!tokenStorage.get() && driver.value !== null)

  function persistProfile() {
    if (driver.value) localStorage.setItem(PROFILE_KEY, JSON.stringify(driver.value))
    else localStorage.removeItem(PROFILE_KEY)
  }

  // ─── Авторизация ──────────────────────────────────────────
  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const res = await authApi.login({ email, password })
      tokenStorage.set(res.token)
      if (res.refreshToken) tokenStorage.setRefresh(res.refreshToken)
      driver.value = res.driver as Driver
      persistProfile()
    } catch (e) {
      error.value = getErrorMessage(e)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  async function register(payload: {
    name: string
    email: string
    password: string
    phone?: string
  }) {
    loading.value = true
    error.value = null
    try {
      const res = await authApi.register(payload)
      tokenStorage.set(res.token)
      if (res.refreshToken) tokenStorage.setRefresh(res.refreshToken)
      driver.value = res.driver as Driver
      persistProfile()
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
      // даже если сервер недоступен — локально разлогинимся
    }
    tokenStorage.clear()
    driver.value = null
    isOnline.value = false
    persistProfile()
  }

  // ─── Профиль ──────────────────────────────────────────────
  async function updateProfile(patch: Partial<Driver>) {
    const updated = await driverApi.updateProfile({
      name: patch.name,
      phone: patch.phone,
      car: patch.car,
    })
    driver.value = { ...driver.value, ...updated } as Driver
    persistProfile()
  }

  // ─── Онлайн / офлайн (для AppHeader) ──────────────────────
  async function goOnline() {
    if (!isAuthenticated.value) return
    try {
      await driverApi.setOnline(true)
    } catch {
      // мягко: даже если API не отвечает, локально включаем
    }
    isOnline.value = true
  }

  async function goOffline() {
    try {
      await driverApi.setOnline(false)
    } catch {
      // ignore
    }
    isOnline.value = false
  }

  // ─── Сброс сессии (для 401-хендлера) ──────────────────────
  function clearSession() {
    tokenStorage.clear()
    driver.value = null
    isOnline.value = false
    persistProfile()
  }

  return {
    driver,
    loading,
    error,
    isOnline,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    goOnline,
    goOffline,
    clearSession,
  }
})
