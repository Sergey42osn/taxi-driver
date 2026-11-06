<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { useDriverStore } from '@/stores/driver'

const driver = useDriverStore()
const router = useRouter()

function toggleOnline() {
    driver.isOnline ? driver.goOffline() : driver.goOnline()
}

async function onLogout() {
    await driver.logout()
    router.push({ name: 'login' })
}
</script>

<template>
    <header class="header">
        <div class="left">
            <button class="toggle" :class="{ online: driver.isOnline }" @click="toggleOnline">
                <span class="dot" />
                {{ driver.isOnline ? 'На линии' : 'Офлайн' }}
            </button>
        </div>
        <nav class="nav">
            <RouterLink to="/" class="link">Карта</RouterLink>
            <RouterLink to="/orders" class="link">Заказы</RouterLink>
            <RouterLink to="/profile" class="link">Профиль</RouterLink>
        </nav>
        <button class="logout" @click="onLogout">Выйти</button>
    </header>
</template>

<style scoped>
.header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 16px;
    background: #fff;
    border-bottom: 1px solid #e5e5ea;
}

.left {
    flex: 1;
}

.nav {
    display: flex;
    gap: 16px;
}

.link {
    color: #1c1c1e;
    text-decoration: none;
    font-weight: 500;
}

.link.router-link-active {
    color: #0a84ff;
}

.toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid #d1d1d6;
    background: #f2f2f7;
    color: #3a3a3c;
    font-weight: 600;
    font-size: 13px;
}

.toggle.online {
    background: #e8f9ee;
    border-color: #34c759;
    color: #1f7a3a;
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #8e8e93;
}

.toggle.online .dot {
    background: #34c759;
}

.logout {
    background: transparent;
    border: 1px solid #e5e5ea;
    padding: 6px 12px;
    border-radius: 8px;
}
</style>