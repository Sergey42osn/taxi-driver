<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Фикс дефолтных иконок Leaflet под Vite
const defaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = defaultIcon

const props = withDefaults(
    defineProps<{
        center?: [number, number]
        zoom?: number
        /** маркер: [lat, lng] | null */
        marker?: [number, number] | null
        /** клик по карте → emit координат */
        clickable?: boolean
    }>(),
    {
        center: () => [55.7558, 37.6173], // Москва
        zoom: 13,
        marker: null,
        clickable: false,
    },
)

const emit = defineEmits<{
    (e: 'map-click', coords: [number, number]): void
}>()

const mapEl = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null

function syncMarker(coords: [number, number] | null) {
    if (!map) return
    if (marker) {
        marker.remove()
        marker = null
    }
    if (coords) {
        marker = L.marker(coords).addTo(map)
    }
}

onMounted(() => {
    if (!mapEl.value) return

    map = L.map(mapEl.value, {
        center: props.center,
        zoom: props.zoom,
        zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    syncMarker(props.marker)

    if (props.clickable) {
        map.on('click', (ev: L.LeafletMouseEvent) => {
            const coords: [number, number] = [ev.latlng.lat, ev.latlng.lng]
            emit('map-click', coords)
        })
    }

    // Leaflet-контейнер должен пересчитать размер после монтирования
    setTimeout(() => map?.invalidateSize(), 0)

    window.addEventListener('resize', onResize)
})

function onResize() {
    map?.invalidateSize()
}

watch(
    () => props.marker,
    (v) => {
        syncMarker(v)
        if (v && map) map.setView(v, map.getZoom(), { animate: true })
    },
)

watch(
    () => props.center,
    (v) => {
        if (map) map.setView(v, map.getZoom())
    },
)

onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    map?.remove()
    map = null
})
</script>

<template>
    <div ref="mapEl" class="map" />
</template>

<style scoped>
.map {
    width: 100%;
    height: 100%;
    min-height: 300px;
}
</style>