/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_USE_MOCKS?: string

  // пороги отправки координат
  readonly VITE_LOCATION_DISTANCE_THRESHOLD?: string
  readonly VITE_LOCATION_TIME_THRESHOLD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
