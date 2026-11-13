import { createRouter, createWebHistory } from 'vue-router'
import { useDriverStore } from '@/stores/driver'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { public: true, guestOnly: true },
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('@/views/OnboardingView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('@/views/OrdersView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const store = useDriverStore()

  // 1. Публичные маршруты пропускаем
  if (to.meta.public) return true

  // 2. Сессия ещё не восстановлена и профиль не загружен —
  //    восстанавливаем через refresh (а не fetchMe!)
  if (!store.isAuthenticated && store.driver === null && !store.isLoadingDriver) {
    const ok = await store.restoreSession() // ← refresh + fetchMe внутри
    if (!ok) return { name: 'login' }
  }

  // 3. Не залогинен / профиль не загрузился
  if (!store.isAuthenticated || !store.driver) {
    return { name: 'login' }
  }

  // 4. Не approved — на онбординг
  if (store.driver.status !== 'approved' && to.name !== 'onboarding') {
    return { name: 'onboarding' }
  }

  // 5. Approved, но лезет на онбординг — на дашборд
  if (store.driver.status === 'approved' && to.name === 'onboarding') {
    return { name: 'dashboard' }
  }

  return true
})

export default router
