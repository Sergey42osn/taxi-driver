<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDriverStore } from '@/stores/driver'

const driver = useDriverStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
    error.value = null
    loading.value = true
    try {
        await driver.login(email.value, password.value)
        const redirect = (route.query.redirect as string) || '/'
        router.replace(redirect)
    } catch (e) {
        error.value = e instanceof Error ? e.message : 'Ошибка входа'
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="login-page">
        <form class="card" @submit.prevent="submit">
            <h1>Такси · Водитель</h1>
            <p class="subtitle">Вход в личный кабинет</p>

            <label class="field">
                <span>Email</span>
                <input v-model="email" type="email" autocomplete="email" placeholder="driver@example.com" required />
            </label>

            <label class="field">
                <span>Пароль</span>
                <input v-model="password" type="password" autocomplete="current-password" placeholder="••••••"
                    required />
            </label>

            <p v-if="error" class="error">{{ error }}</p>

            <button class="submit" type="submit" :disabled="loading">
                {{ loading ? 'Вход…' : 'Войти' }}
            </button>

            <p class="hint">Демо: любой email + пароль от 4 символов</p>
        </form>
    </div>
</template>

<style scoped>
.login-page {
    flex: 1;
    display: grid;
    place-items: center;
    padding: 24px;
    background: #f7f7f8;
}

.card {
    width: 100%;
    max-width: 360px;
    background: #fff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    gap: 12px;
}

h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
}

.subtitle {
    margin: 0 0 8px;
    color: #6e6e73;
    font-size: 14px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 14px;
}

.field span {
    color: #3a3a3c;
    font-weight: 500;
}

.field input {
    padding: 10px 12px;
    border: 1px solid #d1d1d6;
    border-radius: 8px;
    outline: none;
    transition: border-color 0.15s;
}

.field input:focus {
    border-color: #0a84ff;
    box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.15);
}

.submit {
    margin-top: 8px;
    padding: 12px;
    border: none;
    border-radius: 10px;
    background: #0a84ff;
    color: #fff;
    font-weight: 600;
    transition: background 0.15s, opacity 0.15s;
}

.submit:hover:not(:disabled) {
    background: #0070e0;
}

.submit:disabled {
    opacity: 0.6;
    cursor: default;
}

.error {
    color: #ff3b30;
    font-size: 13px;
    margin: 0;
}

.hint {
    margin: 4px 0 0;
    color: #8e8e93;
    font-size: 12px;
    text-align: center;
}
</style>