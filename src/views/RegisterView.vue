<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useDriverStore } from '@/stores/driver'

const route = useRoute()
const router = useRouter()
const store = useDriverStore()
const { regStep, pendingEmail, regLoading, regError, regFieldErrors, regCodeHint, resAction, regSuccess } = storeToRefs(store)

// ─── поля формы ───────────────────────────────────────────
const name = ref('')
const phone = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const code = ref('')

// ─── ui-состояние ─────────────────────────────────────────
const showPassword = ref(false)
const showPasswordConfirm = ref(false)
const resendTimer = ref(0)
let resendInterval: ReturnType<typeof setInterval> | null = null

// ─── анти-бот ─────────────────────────────────────────────
const isBot = ref(1)                       // 1 = подозрительно, 0 = человек
const honeypotTel = ref('')                // honeypot
// время фиксируется один раз при отрисовке формы (Unix, секунды)
const time = ref<number>(Math.floor(Date.now() / 1000))

function markHuman() {
    if (isBot.value !== 0) isBot.value = 0
}

// ─── телефон ──────────────────────────────────────────────
const phoneModel = computed({
    get: () => phone.value,
    set: (val: string) => { phone.value = normalizePhone(val) },
})

function normalizePhone(value: string): string {
    let digits = String(value).replace(/\D/g, '')
    if (!digits) return ''
    if (digits[0] === '8') digits = '7' + digits.slice(1)
    else if (digits[0] === '9') digits = '7' + digits
    if (digits[0] !== '7') return ''
    digits = digits.slice(0, 11)
    let out = '+7'
    if (digits.length > 1) out += ' ' + digits.slice(1, 4)
    if (digits.length > 4) out += ' ' + digits.slice(4, 7)
    if (digits.length > 7) out += '-' + digits.slice(7, 9)
    if (digits.length > 9) out += '-' + digits.slice(9, 11)
    return out
}

// ─── валидация формы ──────────────────────────────────────
const nameValid = computed(() => name.value.trim().length >= 2)

const phoneDigitsValid = computed(() => {
    let d = phone.value.replace(/\D/g, '')
    if (d[0] === '8') d = '7' + d.slice(1)
    else if (d[0] === '9') d = '7' + d
    return /^7\d{10}$/.test(d)
})

const emailValid = computed(() =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()),
)

const passwordChecks = computed(() => ({
    length: password.value.length >= 8,
    upper: /[A-ZА-ЯЁ]/.test(password.value),
    digit: /\d/.test(password.value),
    special: /[^A-Za-zА-Яа-яЁё0-9]/.test(password.value),
}))

const passwordValid = computed(() =>
    Object.values(passwordChecks.value).every(Boolean),
)

const passwordConfirmValid = computed(
    () => passwordConfirm.value.length > 0 && passwordConfirm.value === password.value,
)

const formValid = computed(
    () =>
        nameValid.value &&
        phoneDigitsValid.value &&
        emailValid.value &&
        passwordValid.value &&
        passwordConfirmValid.value,
)

const canSubmit = computed(() => formValid.value && !regLoading.value)

// ─── валидация кода ───────────────────────────────────────
const codeValid = computed(() => /^\d{4,6}$/.test(code.value))
const canVerify = computed(() => codeValid.value && !regLoading.value)
const canResend = computed(() => resendTimer.value === 0 && !regLoading.value)

const emailConfirmedNotice = ref(false)

// ─── очистка ошибки поля ──────────────────────────────────
function clearFieldError(field: string) {
    if (!regFieldErrors.value[field]) return
    const next = { ...regFieldErrors.value }
    delete next[field]
    regFieldErrors.value = next
}

function removeErrorInfo() {
    regError.value = null
    regFieldErrors.value = {}
    regCodeHint.value = ''
}

// ─── отправка ─────────────────────────────────────────────
async function submitForm() {
    console.log('submitForm')

    removeErrorInfo()

    if (!canSubmit.value) return
    try {
        const res = await store.register({
            name: name.value.trim(),
            phone: phone.value.replace(/\D/g, ''),
            email: email.value.trim().toLowerCase(),
            password: password.value,
            password_confirmation: passwordConfirm.value,
            is_bot: isBot.value,
            tel: honeypotTel.value,
            time: time.value,
            code: code.value,
        })
        console.log(res)

        if (res.code_sent) {

            if (res.registered) {
                console.log('register_success')
                goHome()
                return
            } else {
                startResendTimer()
            }

        } else {
            goNext()
        }
    } catch {
        // regError / regFieldErrors уже в сторе
    }
}

function goHome() {
    // 1. Безопасно извлекаем redirect из query
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    const safe = redirect && redirect.startsWith('/') && !redirect.startsWith('//')

    console.log(store.driver)

    // 2. Если водитель не прошёл онбординг — сначала туда
    if (store.driver?.status !== 'approved') {
        router.replace({ name: 'onboarding' })
        return
    }

    // 3. Если есть безопасный redirect — туда, иначе на главную
    if (safe) {
        router.replace(redirect)
    } else {
        router.replace({ name: 'home' })
    }
}

async function verify() {
    if (!canVerify.value) return
    const ok = await store.verifyRegistration(code.value)
    if (ok) goNext()
    else code.value = ''
}

async function resend() {
    if (!canResend.value) return
    try {
        await store.resendRegistrationCode(email.value)
        startResendTimer()
    } catch {
        // regError уже в сторе
    }
}

function goBack() {
    store.resetRegistration()
    code.value = ''
}

function startResendTimer() {
    resendTimer.value = 60
    if (resendInterval) clearInterval(resendInterval)
    resendInterval = setInterval(() => {
        resendTimer.value -= 1
        if (resendTimer.value <= 0 && resendInterval) {
            clearInterval(resendInterval)
            resendInterval = null
        }
    }, 1000)
}

function goNext() {
    const redirect =
        typeof route.query.redirect === 'string' ? route.query.redirect : null
    const safe =
        redirect && redirect.startsWith('/') && !redirect.startsWith('//')
    if (store.driver?.status === 'approved' && safe) {
        router.replace(redirect)
    } else {
        router.replace({ name: 'onboarding' })
    }
}

onBeforeUnmount(() => {
    if (resendInterval) clearInterval(resendInterval)
})
</script>

<template>
    <div class="register-page">
        <header class="register-header">
            <button v-if="regStep === 'code'" class="back-btn" type="button" :disabled="regLoading" @click="goBack">
                ← Назад
            </button>
            <h1 class="title">
                <template v-if="regStep === 'form'">Регистрация водителя</template>
                <template v-else>Подтверждение почты</template>
            </h1>
            <p class="subtitle">
                <template v-if="regStep === 'form'">
                    Заполните данные — это займёт пару минут
                </template>
                <template v-else>
                    Подтвердите почту <b>{{ pendingEmail }}</b>
                </template>
            </p>
        </header>

        <!-- ОДНА форма -->
        <form class="form" autocomplete="off" @submit.prevent="submitForm" @focusin="regStep === 'form' && markHuman()"
            @input="markHuman" @keydown="markHuman" @pointerdown="markHuman">
            <!-- ─── поля данных (шаг form) ─── -->

            <label class="field">
                <span class="label">Имя <i>*</i></span>
                <input v-model="name" type="text" autocomplete="name" placeholder="Иван Иванов" maxlength="80"
                    :disabled="regLoading" :class="{ 'input-error': regFieldErrors.name }"
                    @input="clearFieldError('name')" />
                <p v-if="regFieldErrors.name" class="field-error">{{ regFieldErrors.name }}</p>
            </label>

            <label class="field">
                <span class="label">Телефон <i>*</i></span>
                <input v-model="phoneModel" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 999 123-45-67"
                    maxlength="18" :disabled="regLoading" :class="{ 'input-error': regFieldErrors.phone }"
                    @input="clearFieldError('phone')" />
                <p v-if="regFieldErrors.phone" class="field-error">{{ regFieldErrors.phone }}</p>
            </label>

            <label class="field">
                <span class="label">Email <i>*</i></span>
                <input v-model="email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="120"
                    :disabled="regLoading" :class="{ 'input-error': regFieldErrors.email }"
                    @input="clearFieldError('email')" />
                <p v-if="regFieldErrors.email" class="field-error">{{ regFieldErrors.email }}</p>
            </label>

            <label class="field">
                <span class="label">Пароль <i>*</i></span>
                <div class="password-wrap">
                    <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password"
                        placeholder="Минимум 8 символов" maxlength="128" :disabled="regLoading" />
                    <button type="button" class="eye" :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'"
                        @click="showPassword = !showPassword">
                        {{ showPassword ? '🙈' : '👁' }}
                    </button>
                </div>
                <ul class="checks">
                    <li :class="{ ok: passwordChecks.length }">Не менее 8 символов</li>
                    <li :class="{ ok: passwordChecks.upper }">Одна заглавная буква</li>
                    <li :class="{ ok: passwordChecks.digit }">Одна цифра</li>
                    <li :class="{ ok: passwordChecks.special }">Один спецсимвол</li>
                </ul>
            </label>

            <label class="field">
                <span class="label">Подтверждение пароля <i>*</i></span>
                <div class="password-wrap">
                    <input v-model="passwordConfirm" :type="showPasswordConfirm ? 'text' : 'password'"
                        autocomplete="new-password" placeholder="Повторите пароль" maxlength="128"
                        :disabled="regLoading" />
                    <button type="button" class="eye"
                        :aria-label="showPasswordConfirm ? 'Скрыть пароль' : 'Показать пароль'"
                        @click="showPasswordConfirm = !showPasswordConfirm">
                        {{ showPasswordConfirm ? '🙈' : '👁' }}
                    </button>
                </div>
                <p v-if="passwordConfirm && !passwordConfirmValid" class="field-error">
                    Пароли не совпадают
                </p>
            </label>

            <!-- honeypot + hidden -->
            <div class="hp-wrap" aria-hidden="true">
                <label>
                    <span>Не заполняйте это поле</span>
                    <input v-model="honeypotTel" type="tel" name="tel" tabindex="-1" autocomplete="off"
                        placeholder="Ваш телефон" />
                </label>
            </div>
            <input type="hidden" name="is_bot" :value="isBot" />
            <input type="hidden" name="time" :value="time" />


            <!-- ─── поле кода (шаг code) — внутри той же формы ─── -->
            <template v-if="regStep === 'code'">
                <label class="field">
                    <span class="label">Код из письма <i>*</i></span>
                    <input v-model="code" type="text" inputmode="numeric" name="code" autocomplete="one-time-code"
                        maxlength="6" placeholder="••••" :disabled="regLoading"
                        :class="{ 'input-error': regFieldErrors.code }" @input="clearFieldError('code')" />
                    <p class="hint" v-if="regCodeHint">
                        <span :class="regSuccess ? 'ajax_success' : 'ajax_hint'">
                            {{ regCodeHint }}
                        </span>
                    </p>
                    <p v-if="regFieldErrors.code" class="field-error">{{ regFieldErrors.code }}</p>
                </label>
            </template>

            <div v-if="emailConfirmedNotice" class="notice" role="status">
                <p>Email уже подтверждён. Можно перейти к следующему шагу.</p>
                <button class="primary" type="button" @click="goNext">
                    Продолжить
                </button>
            </div>

            <!-- общая ошибка: на шаге form — только если нет ошибок полей -->
            <p v-if="regError && (regStep === 'code' || !Object.keys(regFieldErrors).length)" class="error"
                role="alert">
                {{ regError }}
            </p>

            <!-- ─── кнопки: показываем нужную по шагу ─── -->
            <button v-if="regStep === 'form'" class="primary" type="submit" :disabled="!canSubmit">
                <span v-if="regLoading">Отправляем…</span>
                <span v-else>Зарегистрироваться</span>
            </button>

            <template v-else>
                <button class="primary" type="submit" :disabled="!canVerify">
                    <span v-if="regLoading">Проверяем…</span>
                    <span v-else>Подтвердить</span>
                </button>

                <button class="link" type="button" :disabled="!canResend" @click="resend">
                    <template v-if="resendTimer > 0">
                        Отправить повторно через {{ resendTimer }} с
                    </template>
                    <template v-else>Отправить код повторно</template>
                </button>

                <button class="link muted" type="button" :disabled="regLoading" @click="goBack">
                    Изменить данные
                </button>
            </template>
        </form>

        <footer class="footer">
            <span>Уже есть аккаунт?</span>
            <RouterLink :to="{ name: 'login', query: { redirect: route.query.redirect } }">
                Войти
            </RouterLink>
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

.label i {
    color: #dc2626;
    font-style: normal;
}

input {
    height: 46px;
    padding: 0 12px;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    font-size: 16px;
    background: #fff;
    width: 100%;
    box-sizing: border-box;
}

input:focus {
    outline: none;
    border-color: #2563eb;
}

input:disabled {
    background: #f3f4f6;
}

.input-error {
    border-color: #dc2626;
}

.input-error:focus {
    border-color: #dc2626;
}

.password-wrap {
    position: relative;
}

.password-wrap input {
    padding-right: 44px;
}

.eye {
    position: absolute;
    top: 50%;
    right: 6px;
    transform: translateY(-50%);
    border: none;
    background: none;
    cursor: pointer;
    font-size: 18px;
    padding: 6px;
    line-height: 1;
}

.checks {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.checks li {
    font-size: 12px;
    color: #9ca3af;
}

.checks li::before {
    content: '○ ';
}

.checks li.ok {
    color: #16a34a;
}

.checks li.ok::before {
    content: '● ';
}

.field-error {
    margin: 4px 0 0;
    font-size: 12px;
    color: #dc2626;
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

.link.muted {
    color: #6b7280;
}

.error {
    color: #dc2626;
    font-size: 14px;
    background: #fef2f2;
    padding: 10px 12px;
    border-radius: 8px;
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

.hp-wrap {
    position: absolute;
    left: -9999px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
}

.hint {
    margin: 4px 0 0;
    font-size: 12px;
    color: #df1313;
}

.hint .ajax_success {
    color: green;
}
</style>