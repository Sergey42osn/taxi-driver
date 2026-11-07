<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDriverStore } from '@/stores/driver'

const route = useRoute()
const router = useRouter()
const driver = useDriverStore()

const step = ref('phone') // 'phone' | 'code' | 'details'
const phone = ref(typeof route.query.phone === 'string' ? route.query.phone : '')
const code = ref('')
const city = ref('')
const status = ref('') // 'self_employed' | 'ip' | 'park'

const loading = ref(false)
const error = ref('')
const codeSent = ref(false)
const resendTimer = ref(0)
let resendInterval = null

const cities = [
    { value: 'moscow', label: 'Москва' },
    { value: 'spb', label: 'Санкт-Петербург' },
    { value: 'kazan', label: 'Казань' },
    { value: 'novosibirsk', label: 'Новосибирск' },
]

const statuses = [
    { value: 'self_employed', label: 'Самозанятый' },
    { value: 'ip', label: 'ИП' },
    { value: 'park', label: 'Через таксопарк' },
]

const phoneValid = computed(() => /^\+7\d{10}$/.test(phone.value))
const codeValid = computed(() => /^\d{4,6}$/.test(code.value))
const detailsValid = computed(() => city.value && status.value)

const canSendCode = computed(() => phoneValid.value && !loading.value && resendTimer.value === 0)
const canSubmitCode = computed(() => codeValid.value && !loading.value)
const canSubmitDetails = computed(() => detailsValid.value && !loading.value)

function normalizePhone(value) {
    const digits = value.replace(/\D/g, '')
    if (digits.startsWith('8')) return '+7' + digits.slice(1)
    if (digits.startsWith('7')) return '+' + digits
    if (digits.startsWith('9')) return '+7' + digits
    return value
}

function onPhoneInput(e) {
    phone.value = normalizePhone(e.target.value)
    error.value = ''
}

async function sendCode() {
    if (!canSendCode.value) return
    loading.value = true
    error.value = ''
    try {
        await driver.requestCode(phone.value)
        codeSent.value = true
        step.value = 'code'
        startResendTimer()
    } catch (e) {
        error.value = e?.response?.data?.message || 'Не удалось отправить код. Проверьте номер и попробуйте снова.'
    } finally {
        loading.value = false
    }
}

function startResendTimer() {
    resendTimer.value = 60
    clearInterval(resendInterval)
    resendInterval = setInterval(() => {
        resendTimer.value -= 1
        if (resendTimer.value <= 0) clearInterval(resendInterval)
    }, 1000)
}

async function submitCode() {
    if (!canSubmitCode.value) return
    loading.value = true
    error.value = ''
    try {
        await driver.verifyCode(phone.value, code.value)
        step.value = 'details'
    } catch (e) {
        error.value = e?.response?.data?.message || 'Неверный код. Попробуйте ещё раз.'
        code.value = ''
    } finally {
        loading.value = false
    }
}

async function submitDetails() {
    if (!canSubmitDetails.value) return
    loading.value = true
    error.value = ''
    try {
        await driver.completeRegistration({ city: city.value, status: status.value })
        const redirect = route.query.redirect
        const safe = typeof redirect === 'string' && redirect.startsWith('/')
        if (driver.status === 'approved' && safe) {
            router.replace(redirect)
        } else {
            router.replace({ name: 'onboarding' })
        }
    } catch (e) {
        error.value = e?.response?.data?.message || 'Не удалось завершить регистрацию. Попробуйте позже.'
    } finally {
        loading.value = false
    }
}

function goBack() {
    error.value = ''
    if (step.value === 'code') step.value = 'phone'
    else if (step.value === 'details') step.value = 'code'
}

onMounted(() => {
    if (phone.value && phoneValid.value) {
        // номер пришёл из query — можно сразу предложить отправить код
    }
})

// очистка таймера при размонтировании
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => clearInterval(resendInterval))
</script>

<template>
    <div class="register-page">
        <header class="register-header">
            <button v-if="step !== 'phone'" class="back-btn" type="button" @click="goBack" :disabled="loading">
                ← Назад
            </button>
            <h1 class="title">Регистрация водителя</h1>
            <p class="subtitle">
                <template v-if="step === 'phone'">Введите номер телефона — он будет вашим логином</template>
                <template v-else-if="step === 'code'">Введите код из SMS, отправленный на {{ phone }}</template>
                <template v-else>Укажите город работы и ваш статус</template>
            </p>
        </header>

        <div class="steps">
            <span :class="['dot', { active: step === 'phone' }]">1</span>
            <span class="line" />
            <span :class="['dot', { active: step === 'code' }]">2</span>
            <span class="line" />
            <span :class="['dot', { active: step === 'details' }]">3</span>
        </div>

        <form class="form" @submit.prevent>
            <!-- Шаг 1: телефон -->
            <template v-if="step === 'phone'">
                <label class="field">
                    <span class="label">Номер телефона</span>
                    <input :value="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 999 123-45-67"
                        :disabled="loading" @input="onPhoneInput" />
                </label>
                <button class="primary" type="button" :disabled="!canSendCode" @click="sendCode">
                    <span v-if="loading">Отправляем…</span>
                    <span v-else>Получить код</span>
                </button>
            </template>

            <!-- Шаг 2: код -->
            <template v-else-if="step === 'code'">
                <label class="field">
                    <span class="label">Код из SMS</span>
                    <input v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6"
                        placeholder="••••" :disabled="loading" />
                </label>
                <button class="primary" type="button" :disabled="!canSubmitCode" @click="submitCode">
                    <span v-if="loading">Проверяем…</span>
                    <span v-else>Подтвердить</span>
                </button>
                <button class="link" type="button" :disabled="resendTimer > 0 || loading" @click="sendCode">
                    <template v-if="resendTimer > 0">Отправить повторно через {{ resendTimer }} с</template>
                    <template v-else>Отправить код повторно</template>
                </button>
            </template>

            <!-- Шаг 3: город и статус -->
            <template v-else>
                <label class="field">
                    <span class="label">Город работы</span>
                    <select v-model="city" :disabled="loading">
                        <option value="" disabled>Выберите город</option>
                        <option v-for="c in cities" :key="c.value" :value="c.value">{{ c.label }}</option>
                    </select>
                </label>
                <label class="field">
                    <span class="label">Ваш статус</span>
                    <select v-model="status" :disabled="loading">
                        <option value="" disabled>Выберите статус</option>
                        <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
                    </select>
                </label>
                <button class="primary" type="button" :disabled="!canSubmitDetails" @click="submitDetails">
                    <span v-if="loading">Сохраняем…</span>
                    <span v-else>Продолжить</span>
                </button>
                <p class="hint">Документы загрузите на следующем шаге — это займёт пару минут</p>
            </template>

            <p v-if="error" class="error" role="alert">{{ error }}</p>
        </form>

        <footer class="footer">
            <span>Уже есть аккаунт?</span>
            <RouterLink :to="{ name: 'login', query: { redirect: route.query.redirect } }">Войти</RouterLink>
        </footer>
    </div>
</template>

<style scoped>
.register-page {
    max-width: 420px;
    margin: 0 auto;
    padding: 24px 20px 40px;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.register-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.back-btn {
    align-self: flex-start;
    background: none;
    border: none;
    color: #4a5568;
    font-size: 14px;
    padding: 0 0 8px;
    cursor: pointer;
}

.title {
    font-size: 22px;
    font-weight: 700;
    margin: 0;
}

.subtitle {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
}

.steps {
    display: flex;
    align-items: center;
    gap: 8px;
}

.dot {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 600;
    background: #e5e7eb;
    color: #6b7280;
}

.dot.active {
    background: #2563eb;
    color: #fff;
}

.line {
    flex: 1;
    height: 2px;
    background: #e5e7eb;
}

.form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.label {
    font-size: 13px;
    color: #374151;
    font-weight: 500;
}

input,
select {
    height: 46px;
    padding: 0 12px;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    font-size: 16px;
    background: #fff;
}

input:focus,
select:focus {
    outline: none;
    border-color: #2563eb;
}

input:disabled,
select:disabled {
    background: #f3f4f6;
}

.primary {
    height: 48px;
    border: none;
    border-radius: 10px;
    background: #2563eb;
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
}

.primary:disabled {
    background: #93b4f5;
    cursor: not-allowed;
}

.link {
    background: none;
    border: none;
    color: #2563eb;
    font-size: 14px;
    cursor: pointer;
    padding: 4px 0;
}

.link:disabled {
    color: #9ca3af;
    cursor: not-allowed;
}

.error {
    color: #dc2626;
    font-size: 14px;
    background: #fef2f2;
    padding: 10px 12px;
    border-radius: 8px;
}

.hint {
    font-size: 13px;
    color: #6b7280;
    margin: 0;
}

.footer {
    margin-top: auto;
    padding-top: 16px;
    font-size: 14px;
    color: #6b7280;
    display: flex;
    gap: 6px;
    justify-content: center;
}

.footer a {
    color: #2563eb;
    text-decoration: none;
}
</style>