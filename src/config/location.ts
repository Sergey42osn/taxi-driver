function readNumber(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export const LOCATION_CONFIG = {
  distanceThreshold: readNumber(import.meta.env.VITE_LOCATION_DISTANCE_THRESHOLD, 50),
  timeThreshold: readNumber(import.meta.env.VITE_LOCATION_TIME_THRESHOLD, 60_000),
} as const
