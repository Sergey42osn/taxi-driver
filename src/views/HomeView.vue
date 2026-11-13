<template>
    <div class="home">
        <h1>Карта</h1>
        <div ref="mapContainer" class="map"></div>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="store.lastSentAt" class="status">
            Последняя отправка: {{ new Date(store.lastSentAt).toLocaleTimeString() }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useDriverStore } from '@/stores/driver'

const mapContainer = ref<HTMLElement | null>(null)
const error = ref<string | null>(null)

const store = useDriverStore()

let map: L.Map | null = null
let watchId: number | null = null
let marker: L.Marker | null = null

onMounted(() => {
    if (!mapContainer.value) return

    map = L.map(mapContainer.value).setView([55.7558, 37.6173], 10)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    if (!navigator.geolocation) {
        error.value = 'Геолокация не поддерживается браузером'
        return
    }

    watchId = navigator.geolocation.watchPosition(
        (position) => {

            console.log('[geo] position:', position.coords.latitude, position.coords.longitude)

            const { latitude, longitude, accuracy, speed, heading } = position.coords

            // Рисуем маркер (всегда)
            updateMarkerOnMap(L.latLng(latitude, longitude))

            // Отдаём координаты в стор — он решает, когда отправлять (50 м / 1 мин)
            // и шлёт через driverApi.sendLocation → http → Authorization
            store.handlePosition(latitude, longitude, {
                accuracy,
                speed: speed ?? null,
                heading: heading ?? null,
            })
        },
        (err) => {
            error.value = `Ошибка геолокации: ${err.message}`
        },
        {
            enableHighAccuracy: true,
            timeout: 10_000,
            maximumAge: 0,
        },
    )
})

onBeforeUnmount(() => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    map?.remove()
    map = null
    marker = null
})

function updateMarkerOnMap(latlng: L.LatLng) {
    if (!map) return
    if (!marker) {
        marker = L.marker(latlng).addTo(map).bindPopup('Вы здесь')
        map.setView(latlng, 16)
    } else {
        marker.setLatLng(latlng)
    }
}
</script>

<style scoped>
.home {
    flex: 1;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
}

h1 {
    margin: 0 0 16px;
    font-size: 22px;
}

.map {
    height: calc(100% - 80px);
    width: 100%;
    border-radius: 8px;
    z-index: 0;
}

.error {
    color: #c0392b;
    margin-top: 8px;
    font-size: 14px;
}

.status {
    color: #6e6e73;
    margin-top: 4px;
    font-size: 13px;
}
</style>